import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature, updatePaymentStatus } from "@/app/actions/payment-actions"
import {
  ensureAuthUserAndProfile,
  logTransaction,
  createEnrollment,
  storeEbookContactInfo,
  upgradeEbookBuyerToCourse,
} from "@/app/actions/payment-utils"
import { getAdminClient } from "@/lib/supabase/admin"

// Define a type for the expected transaction data
interface Transaction {
  id: string
  user_id: string | null
  transaction_type: string
  contact_email: string
  email: string // Assuming email might also be a direct column
  // Define expected metadata structure more explicitly
  metadata: {
    course_id?: string;
    firstName?: string; // Changed from name to match form
    lastName?: string; // Added lastName
    name?: string; // Keep original name field for potential fallback/other uses
    promo_code?: string;
    source?: string;
    phone?: string;
    [key: string]: any; // Allow other keys
  } | null
  status: string
  payment_method: string | null
  paid_at: string | null
  // Add other relevant transaction fields here...
}

// Define a type for the Xendit webhook payload (invoice.paid)
interface XenditInvoicePaidPayload {
  id: string // Invoice ID
  external_id: string
  status: string
  amount: number
  paid_amount: number
  payment_method: string
  payer_email?: string
  customer?: { email?: string }
  contact_email?: string
  description: string
  metadata: { [key: string]: any } | null
  paid_at: string
  // Add other relevant Xendit fields here...
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming request
    console.log("[Webhook] Incoming request headers:", Object.fromEntries(request.headers.entries()))
    const body = await request.json()
    console.log("[Webhook] Incoming request body:", JSON.stringify(body, null, 2))
    // Get the Xendit signature from headers
    const signature = request.headers.get("x-callback-token") || ""
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(body, signature)
    console.log(`[Webhook] Signature valid:`, isValid)
    if (!isValid) {
      console.error("[Webhook] Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    // Process the webhook based on the event type
    // Xendit sends all fields at the top level, so treat body as data
    const data: XenditInvoicePaidPayload = body as XenditInvoicePaidPayload // Type assertion
    // Infer event from status
    const event =
      data.status === "PAID"
        ? "invoice.paid"
        : data.status === "EXPIRED"
        ? "invoice.expired"
        : undefined;
    console.log(`[Webhook] Inferred event: ${event}`, {
      id: data?.id,
      status: data?.status,
      external_id: data?.external_id,
    })
    // Get Supabase admin client
    const supabase = getAdminClient()
    // Handle different event types
    switch (event) {
      case "invoice.paid": {
        // Declare variables needed in broader scope
        let firstName: string | undefined;
        let lastName: string | null | undefined;
        let userId: string | null = null; // Also declare userId here

        // 1. Fetch the transaction by external_id
        const { data: fetchedTransaction, error: txFetchError } = await supabase
          .from("transactions")
          .select<string, Transaction>("*") // Use defined type
          .eq("external_id", data.external_id)
          .maybeSingle()

        let tx: Transaction | null = fetchedTransaction // Use defined type

        if (txFetchError) {
          console.error("[Webhook] Error fetching transaction:", txFetchError)
          // Potentially return error or try logging a new one
        } else {
          console.log("[Webhook] Transaction fetched:", tx)
        }

        // 2. If not found, create user first for course, then log transaction
        if (!tx) {
          console.log("[Webhook] Transaction not found for external_id. Attempting to log new transaction.")
          // Reset userId for this block
          userId = null;
          // Determine transaction type based on description or metadata
          const transactionType = data.description?.includes("Course") ? 'course' : 'ebook'
          // Always use payer_email/contact_email for email
          const payerEmail = data.payer_email || data.customer?.email || data.contact_email || ""
          const paymentMethod = data.payment_method // Extract payment method

          if (!payerEmail) {
            console.error("[Webhook] Could not determine email from webhook payload. Aborting transaction log.")
            break // or return error
          }

          // CRITICAL PRE-REQUISITE: The initial createPaymentIntent/logTransaction
          // flow MUST save firstName, lastName, courseId in metadata for this webhook
          // handler to retrieve it reliably.
          // The following logic attempts to get names from webhook metadata as a fallback,
          // but this is NOT guaranteed to be present or correct.
          let webhookFirstName = data.metadata?.firstName || data.metadata?.name?.split(" ")[0];
          let webhookLastName = data.metadata?.lastName || data.metadata?.name?.split(" ").slice(1).join(" ") || null;

          if (transactionType === "course") {
            // Ensure user/profile before logging transaction
            // Use names from webhook metadata/payload if available, fallback to email (least reliable)
            if (!webhookFirstName) {
              console.warn("[Webhook] Could not determine firstName from webhook metadata/name. Using email as fallback for profile creation.");
              webhookFirstName = payerEmail; // Fallback
              webhookLastName = null; // Reset last name if using email
            }

            try {
              // Use the higher-scoped userId variable
              // Add check to ensure firstName is a string before calling
              if (typeof webhookFirstName === 'string') { 
                const { userId: ensuredUserId } = await ensureAuthUserAndProfile({
                  email: payerEmail,
                  firstName: webhookFirstName, // Use name derived from webhook payload
                  lastName: webhookLastName,   // Use name derived from webhook payload
                  phone: data.metadata?.phone // Pass phone from metadata
                })
                userId = ensuredUserId // Assign to higher-scoped userId
                console.log("[Webhook] User/profile ensured before logging transaction:", userId)
              } else {
                console.error("[Webhook] Could not determine valid firstName for profile creation. Skipping user/profile check.");
                // Handle the case where profile couldn't be ensured - userId remains null
              }
            } catch (err) {
              console.error("[Webhook] Failed to ensure user/profile before logging transaction:", err)
            }
          }

          // Log transaction with correct userId (course) or null (ebook)
          try {
            // Prepare metadata: Include names if derived, merge with webhook metadata
            // Again, relies on initial transaction saving the *authoritative* metadata
            let finalMetadata = { ...(data.metadata || {}) };
            if (webhookFirstName) finalMetadata.firstName = webhookFirstName;
            if (webhookLastName) finalMetadata.lastName = webhookLastName;
            // Attempt to add courseId as fallback if missing
            if (transactionType === 'course' && !finalMetadata.course_id) {
                 const defaultCourseId = "7e386720-8839-4252-bd5f-09a33c3e1afb"; // P2P Course ID
                 finalMetadata.course_id = defaultCourseId;
                 console.warn(`[Webhook] course_id missing in webhook metadata when logging new tx. Using default: ${defaultCourseId}`);
            }

            const loggedTx = await logTransaction({
              transactionType,
              userId,
              email: payerEmail,
              amount: data.amount || 0,
              metadata: finalMetadata, // Use prepared metadata
              externalId: data.external_id || null,
              paymentMethod: paymentMethod, // Pass payment method
            })
            tx = loggedTx // Assign the newly logged transaction
            console.log("[Webhook] Transaction logged via logTransaction:", tx)
          } catch (err) {
            console.error("[Webhook] Failed to log transaction from webhook:", err)
          }
        }

        // 3. If still no transaction, abort
        if (!tx) {
          console.error("[Webhook] Transaction not found or could not be logged. Aborting.")
          return NextResponse.json({ error: "Transaction not found or could not be logged" }, { status: 400 })
        }

        // 4. Update existing transaction status and potentially payment method
        // Check if status needs updating (e.g., if it was pending)
        if (tx.status !== "paid" && tx.status !== "completed") {
          try {
            const paidAtValue = data.paid_at || new Date().toISOString();
            console.log(`[Webhook] Attempting to update transaction ${tx.id} with paid_at = ${paidAtValue}`); // Log the value

            const { data: updatedTx, error: updateError } = await supabase
              .from("transactions")
              .update({ 
                status: "paid", // Or map to "completed" if that's your standard
                paid_at: paidAtValue, // Use variable
                payment_method: data.payment_method || tx.payment_method // Update payment method if not already set
              })
              .eq("id", tx.id)
              .select<string, Transaction>("*") // Select updated transaction
              .single(); // Expect a single result

            if (updateError) {
              console.error("[Webhook] Error updating transaction status:", updateError)
            } else {
              tx = updatedTx; // Update local tx variable with updated data
              console.log("[Webhook] Transaction status updated to 'paid' for:", tx.id)
            }
          } catch (err) {
            console.error("[Webhook] Failed to update payment status:", err)
          }
        }

        // 5. Handle post-payment actions (Enrollment/Upgrade/Contact storage)
        // Only proceed if the transaction is now marked as paid/completed
        if (tx.status === "paid" || tx.status === "completed") {
          // Handle by transaction type (use the type from the transaction record)
          if (tx.transaction_type === "P2P") {
            // Course Transaction
            let currentUserId = tx.user_id; // Get initial userId from transaction

            // If user_id is not yet associated with the transaction, ensure user exists and link it
            if (!currentUserId) {
              console.log(`[Webhook] Transaction ${tx.id} is P2P but has no user_id. Ensuring user and linking.`);
              const email = tx.contact_email || tx.email; // Prioritize contact_email if available
              const firstName = tx.metadata?.firstName || tx.metadata?.name?.split(' ')[0];
              const lastName = tx.metadata?.lastName || tx.metadata?.name?.split(' ').slice(1).join(' ') || null;

              if (!email) {
                console.error("[Webhook] CRITICAL: Cannot ensure user for P2P transaction - email missing from transaction record/metadata.");
                // Skip further P2P processing for this transaction if email is missing
                break; 
              }
              if (!firstName) {
                console.error("[Webhook] CRITICAL: Cannot ensure user profile for P2P transaction - firstName missing from transaction metadata.");
                // Optionally proceed without profile update or break
                break; 
              }

              try {
                // Ensure user and profile exist based on transaction details
                const { userId: ensuredUserId } = await ensureAuthUserAndProfile({
                  email: email,
                  firstName: firstName,
                  lastName: lastName,
                  phone: tx.metadata?.phone // Pass phone from metadata
                });
                currentUserId = ensuredUserId; // Assign the obtained userId
                console.log(`[Webhook] User ensured/found: ${currentUserId}. Updating transaction record.`);

                // Update the transaction record with the user_id
                const { error: updateUserError } = await supabase
                  .from('transactions')
                  .update({ user_id: currentUserId })
                  .eq('id', tx.id);

                if (updateUserError) {
                  console.error(`[Webhook] Failed to update transaction ${tx.id} with user_id ${currentUserId}:`, updateUserError);
                  // Decide if we should abort enrollment
                  currentUserId = null; // Reset userId if update failed
                } else {
                  console.log(`[Webhook] Successfully updated transaction ${tx.id} with user_id ${currentUserId}.`);
                  // Update the local tx object as well
                  tx.user_id = currentUserId;
                }
              } catch (ensureUserError) {
                console.error(`[Webhook] Error during ensureAuthUserAndProfile for transaction ${tx.id}:`, ensureUserError);
                currentUserId = null; // Reset userId if ensure process failed
              }
            }

            // Proceed with enrollment and upgrade ONLY if we have a valid userId
            if (!currentUserId) {
              console.error("[Webhook] CRITICAL: No user_id available for P2P transaction after ensure/link step. Aborting enrollment and upgrade.")
            } else {
              // Ensure courseId is present and valid
              const courseId = tx.metadata?.course_id
              if (!courseId) {
                console.error("[Webhook] No course_id found in transaction metadata. Aborting enrollment.")
                // Decide if this is critical enough to stop
              } else {
                // Check if enrollment already exists for this transaction_id
                const { data: existingEnrollment, error: checkError } = await supabase
                  .from('enrollments')
                  .select('id')
                  .eq('transaction_id', tx.id)
                  .maybeSingle();

                if (checkError) {
                   console.error("[Webhook] Error checking for existing enrollment:", checkError);
                } else if (existingEnrollment) {
                   console.log("[Webhook] Enrollment already exists for transaction:", tx.id);
                } else {
                  // Create enrollment (idempotency check passed)
                  try {
                    await createEnrollment({
                      userId: currentUserId, // Use the determined user ID
                      transactionId: tx.id,
                      courseId: String(courseId), // Ensure it's a string if needed
                    })
                    // Log is handled inside createEnrollment
                  } catch (err) {
                    console.error("[Webhook] Failed to create enrollment:", err)
                  }
                }
              }

              // --- Upgrade Ebook Buyer - Consider if this should run every time or only once ---
              // If this user previously bought an ebook, upgrade their transactions
              // This might be better handled elsewhere or need idempotency checks
              // TODO: Implement proper check - e.g., check for previous 'Canva' transactions with null user_id for this email.
              console.log("[Webhook] INFO: Checking if ebook buyer upgrade is needed (Current logic runs unconditionally). Consider adding idempotency.");
              try {
                // Get name details from profile if possible, fallback needed
                const { data: profileData } = await supabase
                  .from('unified_profiles')
                  .select('first_name, last_name')
                  .eq('id', currentUserId) // Use determined user ID
                  .maybeSingle();
                  
                const profileFirstName = profileData?.first_name || tx.metadata?.name?.split(' ')[0] || 'Course';
                const profileLastName = profileData?.last_name || tx.metadata?.name?.split(' ').slice(1).join(' ') || 'Buyer';

                await upgradeEbookBuyerToCourse({
                  email: tx.contact_email || tx.email, // Ensure correct email source
                  firstName: profileFirstName,
                  lastName: profileLastName,
                })
                console.log("[Webhook] Triggered upgrade ebook buyer to course for user:", currentUserId)
              } catch (err) {
                console.error("[Webhook] Failed to trigger upgrade ebook buyer to course:", err)
              }
              // --- End Upgrade Ebook Buyer ---
            }
          } else if (tx.transaction_type === "Canva") {
            // Ebook Transaction
            // Store ebook contact info
            try {
              await storeEbookContactInfo({
                email: tx.contact_email || tx.email, // Ensure correct email source
                metadata: tx.metadata || {},
              })
              console.log("[Webhook] Ebook contact info stored for:", tx.contact_email || tx.email)
            } catch (err) {
              console.error("[Webhook] Failed to store ebook contact info:", err)
            }
          }
        }

        break
      }
      case "invoice.expired": {
        // Payment expired
        try {
          await updatePaymentStatus(data.external_id, "expired")
          console.log("[Webhook] Payment status updated to 'expired' for:", data.external_id)
        } catch (err) {
          console.error("[Webhook] Failed to update payment status:", err)
        }
        break
      }
      default:
        // Log unknown events
        console.log(`[Webhook] Unhandled Xendit webhook event: ${event}`)
    }
    // Return a success response
    console.log("[Webhook] Handler completed successfully.")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Webhook] Error processing Xendit webhook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Disable body parsing for raw body access if needed
export const config = {
  api: {
    bodyParser: false,
  },
} 