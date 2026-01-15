'use server';

import { cookies, headers } from 'next/headers';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'; // Import both client types
import { CartItem } from '@/stores/cartStore'; // Type for cart items
import { type Database } from '@/types/supabase';
import { type SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import { extractAffiliateTrackingFromServerCookies } from '@/lib/services/affiliate/tracking-service';
import { extractFacebookCookies } from '@/lib/facebook-capi';

// Define the structure for the return value (success or error)
interface ActionResult {
    success: boolean;
    invoiceUrl?: string;
    error?: string;
}

// Helper function to log pending public store transactions
async function logPublicStorePendingTransaction({
    supabase,
    email,
    amount,
    currency = 'PHP',
    externalId,
    metadata
}: {
    supabase: SupabaseClient<Database>;
    email: string;
    amount: number;
    currency?: string;
    externalId: string;
    metadata: Record<string, any>;
}) {
    const transactionData = {
        // user_id is explicitly null for guest checkout
        user_id: null,
        amount: amount,
        currency: currency,
        status: 'pending',
        transaction_type: 'PUBLIC_STORE_SALE', // NEW Transaction Type for Guest/Public Store
        external_id: externalId,
        metadata: metadata,
        contact_email: email, // Store guest email here
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select('id')
        .single();

    if (error) {
        console.error('[logPublicStorePendingTransaction] Error logging transaction:', error);
        throw new Error(`Failed to log pending public store transaction: ${error.message}`);
    }

    return data;
}

/**
 * Server action to initiate a PUBLIC (guest) e-commerce payment via Xendit.
 * 1. Validates cart items against the database.
 * 2. Calculates the total price securely.
 * 3. Logs a pending transaction in the database (type: PUBLIC_STORE_SALE).
 * 4. Creates an invoice with Xendit.
 * 5. Returns the invoice URL for redirection.
 * @param cartItems - The items currently in the user's cart.
 * @param guestEmail - The email provided by the guest user.
 * @returns An object indicating success or failure, including the invoice URL.
 */
export async function createPublicXenditPayment(
    cartItems: CartItem[],
    guestEmail: string
): Promise<ActionResult> {
    // 1. Basic Validation
    if (!cartItems || cartItems.length === 0) {
        return { success: false, error: 'Cart is empty.' };
    }
    if (!guestEmail || !guestEmail.includes('@')) {
        return { success: false, error: 'A valid email address is required.' };
    }

    const supabase = await createServerSupabaseClient();

    try {
        // 2. Validate products and calculate total server-side
        const productIdsInCart = cartItems.map(item => item.productId);

        if (productIdsInCart.length === 0) {
            return { success: false, error: 'No product IDs found in cart.' };
        }

        // Fetch product details and their FIRST variant
        const { data: dbProductsWithVariant, error: productFetchError } = await supabase
            .from('shopify_products')
            .select(`
        id, 
        title, 
        status,
        shopify_product_variants ( id, price, title )
      `)
            .in('id', productIdsInCart);

        if (productFetchError) {
            console.error('Error fetching products and variants:', productFetchError);
            throw new Error('Could not verify cart items.');
        }

        if (!dbProductsWithVariant || dbProductsWithVariant.length !== productIdsInCart.length) {
            console.warn('Cart validation failed: Mismatch between cart product IDs and DB results.');
            return { success: false, error: 'Invalid items in cart. Please refresh and try again.' };
        }

        // Create a map for lookup
        const dbProductMap = new Map(dbProductsWithVariant.map(p => [p.id, p]));

        let calculatedTotal = 0;
        const validatedItemsData = [];

        for (const cartItem of cartItems) {
            const dbProduct = dbProductMap.get(cartItem.productId);

            if (!dbProduct) {
                return { success: false, error: `Product details not found for ID: ${cartItem.productId}.` };
            }

            // Check product status
            if (dbProduct.status?.toLowerCase() !== 'active') {
                return { success: false, error: `Product '${dbProduct.title}' is not available for purchase.` };
            }

            // Get price from variant
            const variants = dbProduct.shopify_product_variants;
            if (!Array.isArray(variants) || variants.length === 0) {
                return { success: false, error: `No pricing information found for product: ${dbProduct.title}.` };
            }
            const dbVariant = variants[0];

            if (dbVariant.price === null || dbVariant.price === undefined || isNaN(Number(dbVariant.price))) {
                return { success: false, error: `Invalid price found for item: ${dbProduct.title}.` };
            }

            const validatedPrice = Number(dbVariant.price);
            calculatedTotal += validatedPrice * cartItem.quantity;

            validatedItemsData.push({
                productId: dbProduct.id,
                variantId: dbVariant.id,
                quantity: cartItem.quantity,
                title: dbProduct.title || cartItem.title,
                variantTitle: dbVariant.title,
                price_at_purchase: validatedPrice,
                imageUrl: cartItem.imageUrl,
            });
        }

        if (calculatedTotal <= 0) {
            return { success: false, error: 'Calculated total must be positive.' };
        }

        // 3. Generate unique external ID
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const externalId = `pub-sale-${timestamp}-${randomSuffix}`; // "pub-sale" prefix

        // 4. Extract Tracking Data
        const { affiliateSlug, visitorId } = await extractAffiliateTrackingFromServerCookies();
        const { fbp, fbc } = await extractFacebookCookies();
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || undefined;
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || undefined;
        const [firstName, ...lastNameParts] = guestEmail.split('@')[0].split('.'); // Heuristic name guess
        const guessedLastName = lastNameParts.join(' ');


        // 5. Prepare Transaction Metadata
        const transactionMetadata = {
            cartItems: validatedItemsData,
            guestEmail: guestEmail,
            firstName: firstName, // Add parsed name guess as fallback
            lastName: guessedLastName,
            affiliateTracking: {
                affiliateSlug,
                visitorId,
                capturedAt: new Date().toISOString()
            },
            fbp,
            fbc,
            ip_address: ip,
            user_agent: userAgent,
        };

        // 6. Log Transaction (Service Role)
        try {
            const adminClient = await createServiceRoleClient(); // Bypass RLS

            await logPublicStorePendingTransaction({
                supabase: adminClient,
                email: guestEmail,
                amount: calculatedTotal,
                currency: 'PHP',
                externalId: externalId,
                metadata: transactionMetadata,
            });
        } catch (logError) {
            console.error(`[createPublicXenditPayment] CRITICAL: Failed to log transaction.`, logError);
            return { success: false, error: 'Failed to prepare transaction. Please try again later.' };
        }

        // 7. Create Xendit Invoice
        const xenditSecretKey = process.env.XENDIT_SECRET_KEY;
        if (!xenditSecretKey) {
            console.error('[createPublicXenditPayment] XENDIT_SECRET_KEY is not set.');
            return { success: false, error: 'Payment provider configuration error.' };
        }
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

        const xenditItems = validatedItemsData.map(item => ({
            name: item.title,
            quantity: item.quantity,
            price: item.price_at_purchase,
            url: `${baseUrl}/shop/product/${item.productId}`
        }));

        const xenditPayload = {
            external_id: externalId,
            amount: calculatedTotal,
            payer_email: guestEmail,
            description: 'Public Store Purchase',
            // Update redirects to public store success/failure pages
            success_redirect_url: `${baseUrl}/shop/checkout/success?external_id=${externalId}`,
            failure_redirect_url: `${baseUrl}/shop/checkout/failure?external_id=${externalId}`,
            currency: 'PHP',
            items: xenditItems,
            metadata: {
                transaction_type: 'PUBLIC_STORE_SALE',
                internalTransactionId: externalId
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
            console.error("[createPublicXenditPayment] Xendit API error:", responseData);
            throw new Error(`Payment provider error: ${responseData.message || 'Unknown error'}`);
        }

        if (!responseData.invoice_url) {
            const msg = 'Payment provider did not return a valid payment URL.';
            console.error("[createPublicXenditPayment]", msg, responseData);
            throw new Error(msg);
        }

        return { success: true, invoiceUrl: responseData.invoice_url };

    } catch (error: any) {
        console.error('Error creating public Xendit payment:', error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
