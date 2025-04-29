'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server'; // Correct helper function
import { CartItem } from '@/stores/cartStore'; // Type for cart items
import { type Database } from '@/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
// TODO: Import Xendit client and necessary types
// TODO: Import transaction logging utility (e.g., logTransaction from '@/lib/payment-utils')

// Define the structure for the return value (success or error)
interface ActionResult {
  success: boolean;
  invoiceUrl?: string;
  error?: string;
}

// Helper function specific to logging pending e-commerce transactions
async function logEcommercePendingTransaction({
  supabase,
  userId,
  email,
  amount,
  currency = 'PHP', // Default currency, adjust if needed
  externalId,
  metadata
}: {
  supabase: SupabaseClient<Database>; // Pass the client instance
  userId: string;
  email?: string;
  amount: number;
  currency?: string;
  externalId: string;
  metadata: Record<string, any>;
}) {
  const transactionData = {
    user_id: userId,
    amount: amount, // Ensure this is base unit (e.g., 1000.00)
    currency: currency,
    status: 'pending',
    transaction_type: 'SHOPIFY_ECOM', // Specific type for these transactions
    external_id: externalId,
    metadata: metadata,
    contact_email: email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select('id') // Select only ID, or more if needed
    .single();

  if (error) {
    console.error('[logEcommercePendingTransaction] Error logging transaction:', error);
    throw new Error(`Failed to log pending e-commerce transaction: ${error.message}`);
  }

  return data; // Return minimal data (e.g., the new transaction ID)
}

/**
 * Server action to initiate an e-commerce payment via Xendit.
 * 1. Validates cart items against the database.
 * 2. Calculates the total price securely.
 * 3. Logs a pending transaction in the database.
 * 4. Creates an invoice with Xendit.
 * 5. Returns the invoice URL for redirection.
 * @param cartItems - The items currently in the user's cart.
 * @returns An object indicating success or failure, including the invoice URL or an error message.
 */
export async function createXenditEcommercePayment(
  cartItems: CartItem[]
): Promise<ActionResult> {
  // Ensure cart is not empty
  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'Cart is empty.' };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Get user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user or user not logged in:', userError);
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // 2. Validate products and calculate total server-side (REVISED LOGIC)
    const productIdsInCart = cartItems.map(item => item.productId); // Assume productId in cart IS the PARENT product ID (UUID)

    if (productIdsInCart.length === 0) {
      return { success: false, error: 'No product IDs found in cart.' };
    }

    // Fetch product details and their FIRST variant from the database
    // We join products and variants to get the price from the variant
    // This assumes each product in the cart corresponds to one purchasable variant (e.g., the default)
    const { data: dbProductsWithVariant, error: productFetchError } = await supabase
      .from('shopify_products')
      .select(`
        id, 
        title, 
        status,
        is_one_time_purchase,
        shopify_product_variants ( id, price, title )
      `)
      .in('id', productIdsInCart)
      // Filter variants if necessary, e.g., only the first one
      // .limit(1, { foreignTable: 'shopify_product_variants' }) // May need adjustment based on Supabase syntax for foreign table limits
      ;

    if (productFetchError) {
      console.error('Error fetching products and variants:', productFetchError);
      throw new Error('Could not verify cart items.');
    }
    
    // Basic check: Ensure we found details for all products in the cart
    if (!dbProductsWithVariant || dbProductsWithVariant.length !== productIdsInCart.length) {
        console.warn('Cart validation failed: Mismatch between cart product IDs and DB results.', { cartIds: productIdsInCart, dbResults: dbProductsWithVariant });
        const foundDbIds = new Set(dbProductsWithVariant?.map(p => p.id) || []);
        const missingIds = productIdsInCart.filter(id => !foundDbIds.has(id));
        return { success: false, error: `Invalid items in cart. Could not find products: ${missingIds.join(', ')}` };
    }
    
    // Create a map for easy lookup
    const dbProductMap = new Map(dbProductsWithVariant.map(p => [p.id, p]));

    let calculatedTotal = 0;
    const validatedItemsData = []; // For storing data used in metadata

    for (const cartItem of cartItems) {
      const dbProduct = dbProductMap.get(cartItem.productId); // Use productId as PARENT product ID key

      if (!dbProduct) {
        return { success: false, error: `Product details not found for ID: ${cartItem.productId}.` };
      }
      
      // Check product status (e.g., must be 'active'), converting DB value to lowercase for comparison
      if (dbProduct.status?.toLowerCase() !== 'active') {
          return { success: false, error: `Product '${dbProduct.title}' is not available for purchase.` };
      }
      
      // Get the first variant's details (assuming one variant relevant for purchase)
      // Supabase returns foreign table data as an array, even if limited
      const variants = dbProduct.shopify_product_variants;
      if (!Array.isArray(variants) || variants.length === 0) {
         return { success: false, error: `No pricing information found for product: ${dbProduct.title}.` };
      }
      const dbVariant = variants[0]; // Take the first variant associated

      // Validate variant price
      if (dbVariant.price === null || dbVariant.price === undefined || isNaN(Number(dbVariant.price))) {
        return { success: false, error: `Invalid price found for item: ${dbProduct.title}.` };
      }

      const validatedPrice = Number(dbVariant.price);
      calculatedTotal += validatedPrice * cartItem.quantity;
      
      // Store validated details for metadata logging
      validatedItemsData.push({
        productId: dbProduct.id, // Parent product ID
        variantId: dbVariant.id, // The specific variant ID used for pricing
        quantity: cartItem.quantity,
        title: dbProduct.title || cartItem.title, // Prefer DB product title
        variantTitle: dbVariant.title, // Add variant title if needed
        price_at_purchase: validatedPrice,
        imageUrl: cartItem.imageUrl, // Keep client image URL for now
      });
    }

    if (calculatedTotal <= 0) {
        return { success: false, error: 'Calculated total must be positive.' };
    }

    // --- Validation complete --- 

    // --- Add Duplicate Purchase Check --- 
    const oneTimePurchaseItemsInCart = validatedItemsData.filter(item => {
        // Find the corresponding db product to check the flag
        const dbProduct = dbProductMap.get(item.productId);
        return dbProduct?.is_one_time_purchase === true;
    });

    if (oneTimePurchaseItemsInCart.length > 0) {
        const oneTimePurchaseProductIds = oneTimePurchaseItemsInCart.map(item => item.productId);
        
        const { data: existingOwnedItems, error: ownershipCheckError } = await supabase
            .from('ecommerce_order_items')
            .select(`
                product_id,
                ecommerce_orders!inner ( user_id, order_status )
            `)
            .in('product_id', oneTimePurchaseProductIds)
            .eq('ecommerce_orders.user_id', user.id)
            .in('ecommerce_orders.order_status', ['processing', 'completed']); // Status indicating successful purchase

        if (ownershipCheckError) {
            console.error('[CheckoutAction] Error checking product ownership:', ownershipCheckError);
            // Proceed cautiously, but log the error. Depending on policy, could throw an error here.
            // For now, we'll let it proceed but this might allow duplicates if the check fails.
            // Consider returning an error: return { success: false, error: 'Could not verify product ownership. Please try again later.' };
        }

        if (existingOwnedItems && existingOwnedItems.length > 0) {
            const alreadyOwnedIds = new Set(existingOwnedItems.map(item => item.product_id));
            const duplicatesInCart = oneTimePurchaseItemsInCart.filter(item => alreadyOwnedIds.has(item.productId));

            if (duplicatesInCart.length > 0) {
                const duplicateNames = duplicatesInCart.map(item => item.title).join(', ');
                console.warn(`[CheckoutAction] User ${user.id} attempting to repurchase owned items: ${duplicateNames}`);
                return {
                    success: false,
                    error: `You have already purchased the following item(s): ${duplicateNames}. Please remove them from your cart.`,
                };
            }
        }
    }
    // --- End Duplicate Purchase Check --- 

    // 3. Generate unique external ID
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, ''); // YYYYMMDDHHMMSSsss
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const externalId = `ecom-inv-${timestamp}-${randomSuffix}`;

    // 4. Prepare metadata for transaction log
    const transactionMetadata = {
      // Use the validated data collected above
      cartItems: validatedItemsData,
      userId: user.id,
      userEmail: user.email,
      // Add any other relevant info needed by the webhook
    };

    // 5. Log pending transaction using the dedicated helper
    try {
      await logEcommercePendingTransaction({
        supabase: supabase, // Pass the created client
        userId: user.id,
        email: user.email,
        amount: calculatedTotal,
        currency: 'PHP', // TODO: Determine currency dynamically if needed
        externalId: externalId,
        metadata: transactionMetadata,
      });
    } catch (logError) {
       console.error(`[CheckoutAction] CRITICAL: Failed to log pending transaction for externalId ${externalId}. Aborting payment initiation.`, logError);
       // Return an error to the user if logging fails, as the webhook will fail later.
       return { success: false, error: 'Failed to prepare transaction. Please try again later.' };
    }

    // 6. Create Xendit Invoice using fetch, following existing patterns
    const xenditSecretKey = process.env.XENDIT_SECRET_KEY;
    if (!xenditSecretKey) {
      console.error('[CheckoutAction] XENDIT_SECRET_KEY is not set.');
      return { success: false, error: 'Payment provider configuration error.' };
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; // Base URL for redirects

    // Construct the items array for Xendit payload based on validated data
    const xenditItems = validatedItemsData.map(item => ({
      name: item.title, // Use validated title
      quantity: item.quantity,
      price: item.price_at_purchase, // Use validated price (ensure it's in base currency unit)
      // category: 'Digital Goods', // Optional: Add category if needed by Xendit
      // url: `${baseUrl}/store/product/${item.productId}` // Optional: Link back to product
    }));

    const xenditPayload = {
      external_id: externalId,
      amount: calculatedTotal, // Ensure this is base currency unit
      payer_email: user.email,
      description: 'Graceful Homeschooling Store Purchase',
      success_redirect_url: `${baseUrl}/dashboard/checkout/success?external_id=${externalId}`, // Pass ID for lookup
      failure_redirect_url: `${baseUrl}/dashboard/checkout/failure?external_id=${externalId}`, // Pass ID for lookup
      currency: 'PHP', // TODO: Determine currency dynamically if needed
      items: xenditItems, // Add detailed items
      // customer: { // Optional: Add more customer details if available/needed
      //   given_names: user.user_metadata?.first_name || '',
      //   surname: user.user_metadata?.last_name || '',
      // },
      metadata: { // Optional: Pass internal IDs for reconciliation in webhook if needed
        userId: user.id,
        internalTransactionId: externalId // Example - can add more app-specific metadata
      }
    };

    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(xenditSecretKey + ":").toString("base64")}`,
      },
      body: JSON.stringify(xenditPayload),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error_code) {
      console.error("[CheckoutAction] Xendit API error:", responseData);
      // Updated error message for clarity
      throw new Error(`Payment provider error: ${responseData.message || responseData.error_code || response.statusText || 'Unknown error'}`);
    }

    if (!responseData.invoice_url) {
        console.error("[CheckoutAction] Xendit response missing invoice_url:", responseData);
        throw new Error('Payment provider did not return a valid payment URL.');
    }

    const invoiceUrl = responseData.invoice_url;

    // 7. Return success with invoice URL
    return { success: true, invoiceUrl: invoiceUrl };

  } catch (error: any) {
    console.error('Error creating Xendit payment intent:', error);
    // Ensure the catch block also returns the correct shape
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
