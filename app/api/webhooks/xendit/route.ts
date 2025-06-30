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
import { buildUserData, sendFacebookEvent } from '@/lib/facebook-capi'
import { v4 as uuidv4 } from 'uuid'
import { Json } from '@/types/supabase'
import { grantFilePermission } from '@/lib/google-drive/driveApiUtils';
import { sendTransactionalEmail } from '@/lib/email/transactional-email-service';
// Import affiliate services
import {
  extractAffiliateTrackingCookies,
  extractAffiliateTrackingFromMetadata,
  lookupAffiliateBySlug,
  findAttributableClick,
  recordAffiliateConversion,
  createNetworkPostback
} from '@/lib/services/affiliate/conversion-service';
import { sendAffiliateConversionNotification } from '@/lib/services/email/affiliate-notification-service';

// Define a type for the expected transaction data
interface Transaction {
  id: string
  user_id: string | null
  transaction_type: string
  contact_email: string | null
  // email: string // REMOVED - Column does not exist in table
  // Revert metadata type to Json | null as union caused issues
  metadata: Json | null 
  status: string
  payment_method: string | null
  paid_at: string | null
  amount?: number; // Add amount as optional, might be needed
  currency?: string; // Add currency as optional
  external_id?: string | null; // Add external_id
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
  merchant_name?: string  // Added for trial webhook detection
  bank_code?: string
  currency?: string
  payment_channel?: string
  payment_destination?: string
  // Add other relevant Xendit fields here...
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming request (do NOT log headers or body for security)
    console.log("[Webhook] Xendit webhook received");
    const body = await request.json()
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
    // Log event type and key identifiers only
    console.log(`[Webhook] Inferred event: ${event}`, {
      id: data?.id,
      status: data?.status,
      external_id: data?.external_id,
    });
    // Get Supabase admin client
    const supabase = getAdminClient()
    // Handle different event types
    switch (event) {
      case "invoice.paid": {
        // Check if this is a trial/test webhook from Xendit
        const isTrialWebhook = 
          // Common trial webhook indicators
          data.external_id === 'invoice_123124123' || // Known test ID
          data.merchant_name === 'Xendit' || // Merchant name is Xendit itself
          data.id.startsWith('579c8d') || // Common test ID pattern
          // External ID patterns that suggest test/demo webhooks
          /^(test|demo|trial|sample|example)/.test(data.external_id) ||
          // Description indicates test webhook
          data.description?.toLowerCase().includes('test') ||
          data.description?.toLowerCase().includes('trial') ||
          // Payer email indicates test webhook
          data.payer_email?.includes('@xendit.co') ||
          // Check if metadata has test flag
          data.metadata?.isTest === true;

        if (isTrialWebhook) {
          console.log('[Webhook] Trial/test webhook detected from Xendit. Responding with success.');
          return NextResponse.json({ success: true, message: 'Trial webhook received successfully' });
        }

        // Declare variables needed in broader scope
        let firstName: string | undefined;
        let lastName: string | null | undefined;
        let userId: string | null = null; // Also declare userId here

        // 1. Fetch the transaction by external_id
        // Explicitly select all fields needed by the Transaction type (excluding the non-existent 'email')
        const { data: fetchedTransaction, error: txFetchError } = await supabase
          .from("transactions")
          .select<string, Omit<Transaction, 'email'>>("id, user_id, transaction_type, contact_email, metadata, status, payment_method, paid_at, amount, currency, external_id") // Use Omit<Transaction, 'email'>
          .eq("external_id", data.external_id)
          .maybeSingle()

        let tx: Transaction | null = fetchedTransaction // Use defined type

        if (txFetchError) {
          console.error("[Webhook] Error fetching transaction");
        } else {
          // Log only transaction ID and status
          if (tx) console.log("[Webhook] Transaction fetched", { id: tx.id, status: tx.status });
        }

        // 2. If not found, create user first for course, then log transaction
        if (!tx) {
          console.log("[Webhook] Transaction not found for external_id. Attempting to log new transaction.");
          // Reset userId for this block
          userId = null;
          // Determine transaction type based on description or metadata (less reliable for SHOPIFY_ECOM)
          // Defaulting to 'course' or 'ebook' based on description seems reasonable for this fallback scenario.
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
                console.log("[Webhook] User/profile ensured before logging transaction");
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
            console.log("[Webhook] Transaction logged via logTransaction");
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
            console.log(`[Webhook] Attempting to update transaction ${tx.id} with paid_at`); // Log only transaction ID

            // Update status, paid_at, and payment_method. 
            // Select the fields again and cast the result.
            const { data: updatedTxData, error: updateError } = await supabase
              .from("transactions")
              .update({ 
                status: "paid", 
                paid_at: paidAtValue, 
                payment_method: data.payment_method || tx.payment_method 
              })
              .eq("id", tx.id)
              // Select fields excluding the non-existent 'email'
              .select("id, user_id, transaction_type, contact_email, metadata, status, payment_method, paid_at, amount, currency, external_id")
              .single();

            if (updateError) {
              console.error("[Webhook] Error updating transaction status:");
              // If update fails, don't update local tx variable
            } else if (updatedTxData) {
              // Explicitly cast the returned data to Transaction type (without email)
              tx = updatedTxData as Omit<Transaction, 'email'>; 
              console.log("[Webhook] Transaction status updated successfully for:", tx.id)
            } else {
               console.warn("[Webhook] Transaction update seemed successful but no data returned.");
            }
          } catch (err) {
            console.error("[Webhook] Failed to update payment status:");
          }
        }

        // 5. Handle post-payment actions (Enrollment/Upgrade/Contact storage/Order Creation)
        // Only proceed if the transaction is now marked as paid/completed
        if (tx.status === "paid" || tx.status === "completed") {
          // Handle by transaction type (use the type from the transaction record)
          if (tx.transaction_type === "P2P") {
            // --- P2P COURSE TRANSACTION LOGIC ---
            console.log(`[Webhook][P2P] Processing P2P transaction: ${tx.id}`);
            let currentUserId = tx.user_id; // Get initial userId from transaction

            // If user_id is not yet associated with the transaction, ensure user exists and link it
            if (!currentUserId) {
              console.log(`[Webhook] Transaction ${tx.id} is P2P but has no user_id. Ensuring user and linking.`);
              // Use contact_email only
              const email = tx.contact_email; 
              // Access metadata properties with optional chaining and direct casting if necessary
              const firstName = (tx.metadata as any)?.firstName || (tx.metadata as any)?.name?.split(' ')[0];
              const lastName = (tx.metadata as any)?.lastName || (tx.metadata as any)?.name?.split(' ').slice(1).join(' ') || null;

              // Add null check for email before ensuring user
              if (!email) { 
                console.error("[Webhook] CRITICAL: Cannot ensure user for P2P transaction - contact_email is null.");
                break; 
              }
              if (!firstName) {
                console.error("[Webhook] CRITICAL: Cannot ensure user profile for P2P transaction - firstName missing from transaction metadata.");
                break; 
              }

              try {
                // Ensure user and profile exist based on transaction details
                const { userId: ensuredUserId } = await ensureAuthUserAndProfile({
                  email: email, // Now guaranteed non-null
                  firstName: firstName,
                  lastName: lastName,
                  phone: (tx.metadata as any)?.phone // Pass phone from metadata
                });
                currentUserId = ensuredUserId; // Assign the obtained userId
                console.log(`[Webhook] User ensured/found. Updating transaction record.`);

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
              console.error("[Webhook][P2P] CRITICAL: No user_id available for P2P transaction after ensure/link step. Aborting enrollment and upgrade.")
            } else {
              // Ensure courseId is present and valid
              // Access metadata property with casting
              const courseId = (tx.metadata as any)?.course_id
              if (!courseId) {
                console.error("[Webhook][P2P] No course_id found in transaction metadata. Aborting enrollment.")
                // Decide if this is critical enough to stop
              } else {
                // Check if enrollment already exists for this transaction_id (Idempotency)
                const { data: existingEnrollment, error: checkError } = await supabase
                  .from('enrollments')
                  .select('id')
                  .eq('transaction_id', tx.id)
                  .maybeSingle();

                if (checkError) {
                   console.error("[Webhook][P2P] Error checking for existing enrollment:", checkError);
                } else if (existingEnrollment) {
                   console.log("[Webhook][P2P] Enrollment already exists for transaction:", tx.id);
                } else {
                  // Create enrollment (idempotency check passed)
                  try {
                    await createEnrollment({
                      userId: currentUserId, // Use the determined user ID
                      transactionId: tx.id,
                      courseId: String(courseId), // Ensure it's a string if needed
                    })
                    console.log("[Webhook][P2P] Enrollment created successfully")
                    
                    // --- Send P2P Course Welcome Email ---
                    try {
                      // Get user profile details for email personalization
                      const { data: profileData } = await supabase
                        .from('unified_profiles')
                        .select('first_name, last_name, email')
                        .eq('id', currentUserId)
                        .maybeSingle()
                      
                      const userEmail = profileData?.email || tx.contact_email
                      const firstName = profileData?.first_name || (tx.metadata as any)?.firstName || 'Friend'
                      
                      if (userEmail) {
                        // Update lead status if leadId exists in metadata
                        const leadId = (tx.metadata as any)?.lead_id
                        if (leadId) {
                          try {
                            // Update lead status directly using Supabase
                            const { error: leadUpdateError } = await supabase
                              .from('purchase_leads')
                              .update({ 
                                status: 'payment_completed',
                                last_activity_at: new Date().toISOString(),
                                converted_at: new Date().toISOString()
                              })
                              .eq('id', leadId)
                            
                            if (leadUpdateError) {
                              console.error("[Webhook][P2P] Failed to update lead status:", leadUpdateError)
                            } else {
                              console.log("[Webhook][P2P] Lead status updated to payment_completed")
                            }
                          } catch (leadUpdateError) {
                            console.error("[Webhook][P2P] Failed to update lead status:", leadUpdateError)
                          }
                        }
                        
                        // Generate magic link directly using service (avoid fetch call issues)
                        let magicLink = ''
                        let expirationHours = '48'
                        let setupRequired = 'true'
                        
                        try {
                          console.log("[Webhook][P2P] Starting magic link generation for:", userEmail)
                          
                          // Import the service functions at the top of file
                          console.log("[Webhook][P2P] Importing magic link services...")
                          const { generateMagicLink } = await import('@/lib/auth/magic-link-service')
                          const { classifyCustomer, getAuthenticationFlow } = await import('@/lib/auth/customer-classification-service')
                          console.log("[Webhook][P2P] Services imported successfully")
                          
                          // Classify customer
                          console.log("[Webhook][P2P] Classifying customer...")
                          const classificationResult = await classifyCustomer(userEmail)
                          console.log("[Webhook][P2P] Classification result:", {
                            success: classificationResult.success,
                            type: classificationResult.classification?.type,
                            isExistingUser: classificationResult.classification?.isExistingUser,
                            error: classificationResult.error
                          })
                          
                          if (classificationResult.success) {
                            const classification = classificationResult.classification!
                            const authFlow = getAuthenticationFlow(classification)
                            
                            console.log("[Webhook][P2P] Auth flow determined:", {
                              purpose: authFlow.magicLinkPurpose,
                              redirectPath: authFlow.redirectPath,
                              requiresPasswordCreation: authFlow.requiresPasswordCreation
                            })
                            
                            // Generate magic link using the correct redirect path from classification
                            console.log("[Webhook][P2P] Generating magic link...")
                            const magicLinkResult = await generateMagicLink({
                              email: userEmail,
                              purpose: authFlow.magicLinkPurpose,
                              redirectTo: authFlow.redirectPath, // ✅ Use the correct redirect path from classification
                              expiresIn: '48h',
                              metadata: {
                                customerType: classification.type,
                                isExistingUser: classification.isExistingUser,
                                userId: classification.userId,
                                generatedAt: new Date().toISOString(),
                                requestSource: 'xendit_webhook'
                              }
                            })
                            
                            console.log("[Webhook][P2P] Magic link generation result:", {
                              success: magicLinkResult.success,
                              hasLink: !!magicLinkResult.magicLink,
                              error: magicLinkResult.error
                            })
                            
                            if (magicLinkResult.success) {
                              magicLink = magicLinkResult.magicLink!
                              setupRequired = classification.isExistingUser ? 'false' : 'true'
                              console.log("[Webhook][P2P] Magic link generated successfully!")
                            } else {
                              console.error("[Webhook][P2P] Magic link generation failed:", magicLinkResult.error)
                            }
                          } else {
                            console.error("[Webhook][P2P] Customer classification failed:", classificationResult.error)
                          }
                        } catch (magicLinkError) {
                          console.error("[Webhook][P2P] Magic link generation error:", magicLinkError)
                        }

                        // Send enhanced welcome email with magic link
                        console.log("[Webhook][P2P] Sending email with variables:", {
                          first_name: firstName,
                          magic_link_length: magicLink.length,
                          has_magic_link: magicLink.length > 0,
                          setup_required: setupRequired
                        })
                        
                        await sendTransactionalEmail(
                          'P2P Course Welcome',
                          userEmail,
                          {
                            first_name: firstName,
                            course_name: 'Papers to Profits', 
                            enrollment_date: new Date().toLocaleDateString(),
                            access_link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gracefulhomeschooling.com'}/dashboard/course`,
                            magic_link: magicLink || '[MAGIC_LINK_FAILED]', // Always pass a value
                            expiration_hours: expirationHours,
                            setup_required: setupRequired
                          },
                          leadId
                        )
                        console.log("[Webhook][P2P] Welcome email sent successfully")
                    
                    // --- Begin User Tagging ---
                    try {
                      // Get the P2P Enrolled tag ID
                      const { data: p2pTag, error: tagError } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', 'P2P Enrolled')
                        .single();
                        
                      if (tagError || !p2pTag) {
                        console.error("[Webhook][P2P] Failed to find 'P2P Enrolled' tag:", tagError || 'Tag not found');
                      } else {
                        // Import the tags module
                        const { assignTagsToUsers } = await import('@/lib/supabase/data-access/tags');
                        
                        // Assign the tag to the user
                        await assignTagsToUsers({
                          tagIds: [p2pTag.id],
                          userIds: [currentUserId]
                        });
                        
                        console.log(`[Webhook][P2P] Successfully tagged user ${currentUserId} with 'P2P Enrolled'`);
                      }
                    } catch (tagError) {
                      console.error("[Webhook][P2P] Failed to tag user:", tagError);
                      // Don't throw - tagging failure shouldn't break payment processing
                    }
                    // --- End User Tagging ---
                  } else {
                    console.warn("[Webhook][P2P] No email available for welcome email")
                  }
                } catch (emailError) {
                  console.error("[Webhook][P2P] Failed to send welcome email:", emailError)
                  // Don't throw - email failure shouldn't break payment processing
                }
                // --- End Welcome Email ---
                
                // --- Affiliate Conversion Tracking ---
                try {
                  console.log('[Webhook][P2P] Starting affiliate conversion tracking');
                  
                  // First try to extract affiliate tracking from transaction metadata
                  let { affiliateSlug, visitorId } = extractAffiliateTrackingFromMetadata(tx.metadata);
                  
                  // Fallback to cookies (legacy method) if not found in metadata
                  if (!affiliateSlug || !visitorId) {
                    console.log('[Webhook][P2P] No affiliate tracking in metadata, trying cookies (legacy)');
                    const cookieData = extractAffiliateTrackingCookies(request);
                    affiliateSlug = cookieData.affiliateSlug;
                    visitorId = cookieData.visitorId;
                  }
                  
                  if (affiliateSlug && visitorId) {
                    console.log(`[Webhook][P2P] Affiliate cookies found: slug=${affiliateSlug}, vid=${visitorId}`);
                    
                    // Look up the affiliate by slug
                    const affiliateId = await lookupAffiliateBySlug({
                      supabase,
                      slug: affiliateSlug
                    });
                    
                    if (affiliateId) {
                      // At this point, affiliateId is guaranteed to be a string
                      console.log(`[Webhook][P2P] Affiliate found: ${affiliateId}`);
                      
                      // Find the click that led to this conversion
                      const { clickId, subId } = await findAttributableClick({
                        supabase,
                        affiliateId,
                        visitorId
                      });
                      
                      // Calculate commission amount (assuming 25% commission rate for P2P)
                      const gmvAmount = tx.amount || 0;
                      const commissionRate = 0.25; // 25% commission
                      const commissionAmount = gmvAmount * commissionRate;
                      
                      // Record the conversion
                      const { success, conversionId } = await recordAffiliateConversion({
                        supabase,
                        conversionData: {
                          affiliate_id: affiliateId as string, // Use type assertion as we've checked it's non-null
                          click_id: clickId,
                          order_id: tx.id, // Use transaction ID as order ID
                          gmv: gmvAmount,
                          commission_amount: commissionAmount, // Required field matching database schema
                          level: 1, // Level 1 conversion
                          sub_id: subId
                        }
                      });
                      
                      if (success) {
                        console.log(`[Webhook][P2P] Conversion recorded: ${conversionId}`);
                        
                        // --- Send Affiliate Conversion Email Notification ---
                        try {
                          console.log(`[Webhook][P2P] Sending affiliate conversion email for conversion: ${conversionId}`);
                          await sendAffiliateConversionNotification(conversionId as string);
                          console.log(`[Webhook][P2P] ✅ Affiliate conversion email sent successfully`);
                        } catch (emailError) {
                          console.error(`[Webhook][P2P] ❌ Failed to send affiliate conversion email:`, emailError);
                          // Don't throw - email failure shouldn't break payment processing
                        }
                        // --- End Affiliate Email Notification ---
                        
                        // Check if this is a network partner (with subId) and create postback if needed
                        if (subId && affiliateSlug.includes('network_')) {
                          const networkName = affiliateSlug.replace('network_', '');
                          const basePostbackUrl = process.env.NETWORK_POSTBACK_URL_TEMPLATE || '';
                          
                          if (basePostbackUrl) {
                            const postbackUrl = basePostbackUrl
                              .replace('{network}', networkName)
                              .replace('{transaction_id}', tx.id)
                              .replace('{amount}', String(tx.amount || 0))
                              .replace('{subid}', subId);
                            
                            await createNetworkPostback({
                              supabase,
                              conversionId: conversionId as string, // Type assertion as we've checked success is true
                              networkName,
                              subId,
                              postbackUrl
                            });
                            
                            console.log(`[Webhook][P2P] Network postback created for ${networkName}`);
                          }
                        }
                      } else {
                        console.error(`[Webhook][P2P] Failed to record conversion`);
                      }
                    } else {
                      console.log(`[Webhook][P2P] No active affiliate found for slug: ${affiliateSlug}`);
                    }
                  } else {
                    console.log('[Webhook][P2P] No affiliate cookies found');
                  }
                } catch (affiliateError) {
                  console.error('[Webhook][P2P] Error processing affiliate conversion:', affiliateError);
                  // Don't throw - affiliate processing failure shouldn't break payment processing
                }
                // --- End Affiliate Conversion Tracking ---
                  } catch (err) {
                    console.error("[Webhook][P2P] Failed to create enrollment:", err)
                  }
                }
              }

              // --- Upgrade Ebook Buyer (Optional - for P2P buyers who might have bought ebook before) ---
              console.log(`[Webhook][P2P] INFO: Checking if ebook buyer upgrade is needed.`);
              try {
                // Get name details from profile if possible, fallback needed
                const { data: profileData } = await supabase
                  .from('unified_profiles')
                  .select('first_name, last_name')
                  .eq('id', currentUserId) // Use determined user ID
                  .maybeSingle();
                  
                // Access metadata properties with optional chaining and direct casting
                const metaFirstName = (tx.metadata as any)?.name?.split(' ')[0];
                const metaLastNameRest = (tx.metadata as any)?.name?.split(' ').slice(1).join(' ');

                const profileFirstName = profileData?.first_name || metaFirstName || 'Course';
                const profileLastName = profileData?.last_name || (metaLastNameRest ? metaLastNameRest : null) || 'Buyer';

                // Add null check before calling upgrade function
                const emailForUpgrade = tx.contact_email;
                if (emailForUpgrade) {
                    await upgradeEbookBuyerToCourse({
                      email: emailForUpgrade, // Use checked email
                      firstName: profileFirstName,
                      lastName: profileLastName,
                    })
                    console.log("[Webhook][P2P] Triggered upgrade ebook buyer to course for user");
                } else {
                    console.warn("[Webhook][P2P] Skipping ebook buyer upgrade because contact_email is null.");
                }
              } catch (err) {
                console.error("[Webhook][P2P] Failed to trigger upgrade ebook buyer to course:", err)
              }
              // --- End Upgrade Ebook Buyer ---
            }

          } else if (tx.transaction_type === 'SHOPIFY_ECOM') {
            // --- SHOPIFY E-COMMERCE TRANSACTION LOGIC ---
            console.log(`[Webhook][ECOM] Processing SHOPIFY_ECOM transaction: ${tx.id}`);

            // 1. Ensure User ID exists (SHOPIFY_ECOM tx SHOULD have user_id from server action)
            const currentUserId = tx.user_id;
            if (!currentUserId) {
               console.error(`[Webhook][ECOM] CRITICAL: Transaction ${tx.id} is SHOPIFY_ECOM but has no user_id. This indicates an issue in the payment initiation server action. Aborting order creation.`);
               break; // Stop processing this transaction type
            }

            // 2. Get user email (needed for Drive permissions)
            const userEmail = tx.contact_email; // Rely solely on contact_email from the transaction record
            if (!userEmail) {
              console.error(`[Webhook][ECOM] CRITICAL: Cannot grant permissions for transaction ${tx.id} - contact_email missing.`);
              // We might still create the order but skip permissions, or abort entirely. 
              // For now, let's try to create the order but log this error.
            }

            // 3. Extract Cart Items from Metadata
            // Perform type checking on metadata and items array
            // Access metadata.cartItems instead of metadata.items
            const specificMetadata = tx.metadata as { cartItems?: any[] } | null;
            const cartItems = (specificMetadata && Array.isArray(specificMetadata.cartItems)) 
                ? specificMetadata.cartItems 
                : null;

            if (!cartItems || cartItems.length === 0) {
                console.error(`[Webhook][ECOM] CRITICAL: No valid 'cartItems' array found in transaction metadata for ${tx.id}. Cannot create order items.`);
                break; // Stop processing this transaction type
            }

            // 4. Idempotency Check & Order Creation (Steps 7 from build note)
            let newOrderId: string | null = null;
            let orderItemsCreated = false; // Flag to track if items were successfully inserted

            try {
                console.log(`[Webhook][ECOM] Checking/Creating ecommerce order for transaction ${tx.id}`);
                // Idempotency Check:
                const { data: existingOrder, error: checkOrderError } = await supabase
                  .from('ecommerce_orders')
                  .select('id')
                  .eq('transaction_id', tx.id)
                  .maybeSingle();

                if (checkOrderError) {
                    throw new Error(`Error checking for existing ecommerce order: ${checkOrderError.message}`);
                }

                if (existingOrder) {
                    console.log(`[Webhook][ECOM] Ecommerce order already exists for transaction ${tx.id}. Skipping order creation.`);
                    newOrderId = existingOrder.id;
                    // Assume items were also created if order exists for idempotency
                    orderItemsCreated = true; 
                } else {
                    // Fetch Unified Profile ID (needed for ecommerce_orders table)
                    const { data: profileData, error: profileError } = await supabase
                      .from('unified_profiles')
                      .select('id')
                      .eq('id', currentUserId) // Use the confirmed user ID
                      .single(); // Expect exactly one profile for the user

                    if (profileError || !profileData) {
                       throw new Error(`Failed to fetch unified_profile_id for user ${currentUserId}: ${profileError?.message || 'Not found'}`);
                    }
                    const unifiedProfileId = profileData.id;

                    // Create Order
                    console.log(`[Webhook][ECOM] Creating new ecommerce_order for tx ${tx.id}`);
                    const { data: newOrder, error: insertOrderError } = await supabase
                      .from('ecommerce_orders')
                      .insert({
                          user_id: currentUserId,
                          unified_profile_id: unifiedProfileId,
                          transaction_id: tx.id,
                          xendit_payment_id: data.id, // Xendit Invoice ID from webhook payload
                          order_status: 'processing', // Use 'processing' (lowercase) as payment is confirmed
                          total_amount: tx.amount || data.amount, // Use amount from tx or webhook
                          currency: tx.currency || data.metadata?.currency || 'PHP', // Get currency
                          // Add other relevant fields if needed
                      })
                      .select('id')
                      .single();

                    if (insertOrderError || !newOrder) {
                        throw new Error(`Failed to insert ecommerce order: ${insertOrderError?.message || 'No ID returned'}`);
                    }
                    newOrderId = newOrder.id;
                    console.log(`[Webhook][ECOM] Successfully created ecommerce_order`);

                    // --- Create Order Items (only if newOrderId is valid) ---
                    if (newOrderId) { 
                        console.log(`[Webhook][ECOM] Creating ecommerce_order_items for order ${newOrderId}`);
                        // Map items from metadata, adding explicit type to item
                        const orderItemsData = cartItems.map((item: { 
                                productId: string; 
                                quantity: number; 
                                price_at_purchase: number; 
                                title?: string 
                            }) => ({
                            order_id: newOrderId, // Guaranteed string here
                            product_id: item.productId, // From metadata
                            quantity: item.quantity,
                            price_at_purchase: item.price_at_purchase,
                            currency: tx.currency || data.metadata?.currency || 'PHP',
                        }));

                        // Ensure we cast the filtered array correctly to match expected insert type
                        const validOrderItemsData = orderItemsData.filter(Boolean) as { 
                            order_id: string; // Explicitly string
                            product_id: string; 
                            quantity: number; 
                            price_at_purchase: number; 
                            currency: string; // Use string or a more specific currency type if available
                        }[];

                        if (validOrderItemsData.length > 0) {
                            const { error: insertItemsError } = await supabase
                                .from('ecommerce_order_items')
                                .insert(validOrderItemsData); // Use the filtered & typed array

                            if (insertItemsError) {
                                // Attempt to delete the order if items fail? Or log and handle manually.
                                console.error(`[Webhook][ECOM] Failed to insert order items for order ${newOrderId}. Order exists but items are missing! Error: ${insertItemsError.message}`);
                                // Consider cleanup or alternative handling
                                throw new Error(`Failed to insert order items: ${insertItemsError.message}`);
                            } else {
                                console.log(`[Webhook][ECOM] Successfully inserted ecommerce_order_items for order ${newOrderId}`);
                                orderItemsCreated = true; // Set flag on successful insert
                            }
                        } else {
                            console.warn(`[Webhook][ECOM] No items processed from metadata for order ${newOrderId}.`); 
                        }
                    } else {
                       console.error(`[Webhook][ECOM] Cannot create order items because newOrderId is null after order creation attempt.`);
                    }
                    // --- End Order Item Creation ---
                } // End if !existingOrder (order creation block)

            } catch (orderCreationError) {
                console.error(`[Webhook][ECOM] Error during Step 7 (Order Creation) for transaction ${tx.id}:`, orderCreationError);
                // If order creation failed, we cannot grant permissions. Stop processing ECOM for this tx.
                break; 
            }

            // 5. Access Granting Logic (Steps 8 from build note)
            // Only proceed if order items were successfully created/found and email exists
            if (orderItemsCreated && userEmail && cartItems && cartItems.length > 0) {
                console.log(`[Webhook][ECOM] Starting Step 8 - Grant Google Drive permissions for order ${newOrderId}`);
                for (const item of cartItems) {
                  // Define product variable within the loop scope
                  let product: { id: string; title: string | null; google_drive_file_id: string | null; } | null = null; 
                  try {
                    // Fetch the shopify_product record to get the Drive File ID
                    const { data: fetchedProduct, error: productError } = await supabase
                      .from('shopify_products')
                      .select('id, title, google_drive_file_id')
                      .eq('id', item.productId) // Use productId from the item metadata
                      .maybeSingle(); // Use maybeSingle as product might not exist (handle defensively)

                    if (productError) {
                      console.error(`[Webhook][ECOM][Drive] Error fetching product ${item.productId} for item ${item.title || 'N/A'}:`, productError);
                      continue; // Skip this item
                    }
                    
                    if (!fetchedProduct) {
                        console.warn(`[Webhook][ECOM][Drive] Product not found in shopify_products table for ID: ${item.productId}. Skipping permission grant for this item.`);
                        continue; // Skip this item
                    }

                    product = fetchedProduct; // Assign fetched product
                    
                    const fileId = product.google_drive_file_id;
                    if (fileId) {
                      console.log(`[Webhook][ECOM][Drive] Granting access for product (File ID) to user`);
                      // Call the utility function
                      await grantFilePermission(fileId, userEmail, 'reader'); 
                      console.log(`[Webhook][ECOM][Drive] Successfully granted access for File ID to user.`);
                    } else {
                      // Log if the product exists but has no associated Drive file ID
                      console.warn(`[Webhook][ECOM][Drive] No google_drive_file_id found for product ${product.title || item.productId}. Skipping permission grant.`);
                    }
                  } catch (grantError: any) { // Catch specific error type if possible
                    // Log detailed error for permission granting failure
                    console.error(`[Webhook][ECOM][Drive] Error granting permission for product ${item.title || item.productId} (File: ${product?.google_drive_file_id || 'N/A'}) to ${userEmail}:`, grantError.message || grantError);
                    // Continue to the next item even if one fails
                  }
                } // End loop through cartItems for permission granting
            } else {
                 // Log why access grant is skipped more clearly
                 if (!orderItemsCreated) console.log(`[Webhook][ECOM] Skipping access grant: Order items not confirmed created/found for tx ${tx.id}.`);
                 else if (!userEmail) console.warn(`[Webhook][ECOM] Skipping access grant: userEmail is missing for tx ${tx.id}.`);
                 else if (!cartItems || cartItems.length === 0) console.log(`[Webhook][ECOM] Skipping access grant: No valid items found in metadata for tx ${tx.id}.`);
            }
            // --- End Step 8 (Access Granting) ---

            // --- Step 9: Clean up user_carts table ---
            // After successful order creation and permissions granting, clean up the user's cart in the database
            try {
                console.log(`[Webhook][ECOM] Cleaning up user_carts table for user ${currentUserId}`);
                const { error: cleanupError } = await supabase
                    .from('user_carts')
                    .delete()
                    .eq('user_id', currentUserId);
                    
                if (cleanupError) {
                    console.error(`[Webhook][ECOM] Failed to clean up user_carts:`, cleanupError);
                } else {
                    console.log(`[Webhook][ECOM] Successfully cleaned up user_carts for user ${currentUserId}`);
                }
            } catch (cleanupError) {
                console.error(`[Webhook][ECOM] Error during user_carts cleanup:`, cleanupError);
                // Non-critical error, continue processing
            }
            
            // --- Step 10: Update Order Status to Completed ---
            // After attempting permissions, mark the order as completed in our system
            // Only do this if we successfully created the order in the first place (newOrderId is not null)
            if (newOrderId) {
                try {
                    console.log(`[Webhook][ECOM] Updating order ${newOrderId} status to 'completed'.`);
                    const { error: updateStatusError } = await supabase
                        .from('ecommerce_orders')
                        .update({ order_status: 'completed', updated_at: new Date().toISOString() })
                        .eq('id', newOrderId);
                    
                    if (updateStatusError) {
                        // Log error but don't throw, as primary processing succeeded
                        console.error(`[Webhook][ECOM] Failed to update order ${newOrderId} status to 'completed':`, updateStatusError);
                    } else {
                        console.log(`[Webhook][ECOM] Successfully updated order ${newOrderId} status to 'completed'.`);
                        
                        // --- Send Shopify Order Confirmation Email ---
                        if (userEmail) {
                          try {
                            // Get user profile details for email personalization
                            const { data: profileData } = await supabase
                              .from('unified_profiles')
                              .select('first_name, last_name')
                              .eq('id', currentUserId)
                              .maybeSingle()
                            
                            const firstName = profileData?.first_name || (tx.metadata as any)?.firstName || 'Friend'
                            
                            // Update lead status if leadId exists in metadata
                            const leadId = (tx.metadata as any)?.lead_id
                            if (leadId) {
                              try {
                                // Update lead status directly using Supabase
                                const { error: leadUpdateError } = await supabase
                                  .from('purchase_leads')
                                  .update({ 
                                    status: 'payment_completed',
                                    last_activity_at: new Date().toISOString(),
                                    converted_at: new Date().toISOString()
                                  })
                                  .eq('id', leadId)
                                
                                if (leadUpdateError) {
                                  console.error("[Webhook][ECOM] Failed to update lead status:", leadUpdateError)
                                } else {
                                  console.log("[Webhook][ECOM] Lead status updated to payment_completed")
                                }
                              } catch (leadUpdateError) {
                                console.error("[Webhook][ECOM] Failed to update lead status:", leadUpdateError)
                              }
                            }
                            
                            // Generate magic link directly using service (avoid fetch call issues)
                            let magicLink = ''
                            let expirationHours = '48'
                            let customerType = 'existing'
                            let accountBenefits = 'Access your order history and digital products anytime.'
                            
                            try {
                              // Import the service functions
                              const { generateMagicLink } = await import('@/lib/auth/magic-link-service')
                              const { classifyCustomer, getAuthenticationFlow } = await import('@/lib/auth/customer-classification-service')
                              
                              // Classify customer
                              const classificationResult = await classifyCustomer(userEmail)
                              
                              if (classificationResult.success) {
                                const classification = classificationResult.classification!
                                const authFlow = getAuthenticationFlow(classification)
                                customerType = classification.type || 'public_customer'
                                
                                if (classification.type === 'public_customer') {
                                  accountBenefits = 'Create your account to access order history, track purchases, and get exclusive member benefits.'
                                  
                                  // Generate magic link for new customers using the correct redirect path
                                  const magicLinkResult = await generateMagicLink({
                                    email: userEmail,
                                    purpose: authFlow.magicLinkPurpose,
                                    redirectTo: authFlow.redirectPath, // ✅ Use the correct redirect path from classification
                                    expiresIn: '48h',
                                    metadata: {
                                      customerType: classification.type,
                                      isExistingUser: classification.isExistingUser,
                                      userId: classification.userId,
                                      generatedAt: new Date().toISOString(),
                                      requestSource: 'xendit_webhook_shopify'
                                    }
                                  })
                                  
                                  if (magicLinkResult.success) {
                                    magicLink = magicLinkResult.magicLink!
                                    console.log("[Webhook][ECOM] Magic link generated for public customer")
                                  } else {
                                    console.warn("[Webhook][ECOM] Magic link generation failed:", magicLinkResult.error)
                                  }
                                } else {
                                  accountBenefits = 'Your digital products are ready in your account dashboard.'
                                  console.log("[Webhook][ECOM] Existing customer - no magic link needed")
                                }
                              } else {
                                console.warn("[Webhook][ECOM] Customer classification failed:", classificationResult.error)
                              }
                            } catch (magicLinkError) {
                              console.error("[Webhook][ECOM] Magic link generation error:", magicLinkError)
                            }

                            // Format cart items for email display (similar to dashboard)
                            const formatOrderItemsForEmail = (items: any[]) => {
                              if (!items || !Array.isArray(items) || items.length === 0) {
                                return '<p style="font-style: italic; color: #6b7280;">No items found in this order.</p>';
                              }
                              
                              // Log the items to debug what we're receiving
                              console.log('[Webhook][ECOM] Formatting cart items for email:', JSON.stringify(items, null, 2));
                              
                              // Start with table-based layout for email compatibility
                              let htmlOutput = `
                              <div style="margin-bottom: 24px; background-color: #f5f9fa; border-radius: 8px; padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <p style="font-size: 14px; font-weight: 600; color: #b08ba5; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
                                        ITEMS (${items.length})
                                      </p>
                                    </td>
                                  </tr>
                              `;
                              
                              // Add each item
                              items.forEach((item, index) => {
                                // Extract product information, handling nested objects
                                const title = item.title || (item.shopify_products && item.shopify_products.title) || 'Product title unavailable';
                                const variantTitleHtml = item.variant_title ? `<span style="display: block; font-size: 12px; color: #6b7280;">(${item.variant_title})</span>` : '';
                                
                                // Find image URL in various possible locations
                                const imageUrl = 
                                  item.featured_image_url || 
                                  (item.shopify_products && item.shopify_products.featured_image_url) || 
                                  item.image_url || 
                                  null;
                                
                                // Find Google Drive link in various possible locations
                                const googleDriveFileId = 
                                  item.google_drive_file_id || 
                                  (item.shopify_products && item.shopify_products.google_drive_file_id) || 
                                  null;
                                
                                // Define fallback image display
                                const imageDisplayHtml = imageUrl 
                                  ? `<img src="${imageUrl}" alt="${title}" width="64" height="64" style="object-fit: cover; border-radius: 6px; border: 1px solid #f1b5bc33;" />` 
                                  : `<div style="width: 64px; height: 64px; background-color: #f1b5bc1a; border-radius: 6px; border: 1px solid #f1b5bc33; text-align: center; line-height: 64px;">📷</div>`;
                                
                                // Format drive link button with GH branding colors - matching the image style
                                const driveButtonHtml = googleDriveFileId 
                                  ? `<a href="https://drive.google.com/drive/folders/${googleDriveFileId}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; text-decoration: none; color: white; background-color: #b98ba5; border-radius: 6px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="margin-right: 6px;">📁</span>Open Folder</a>` 
                                  : `<span style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #6b7280; background-color: #f3f4f6; border-radius: 6px; text-align: center;">Not Available</span>`;
                                
                                // Create item row
                                htmlOutput += `
                                <tr>
                                  <td style="padding: 16px 0; ${index < items.length - 1 ? 'border-bottom: 1px solid #f3f4f6;' : ''}">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="72" valign="top">
                                          ${imageDisplayHtml}
                                        </td>
                                        <td style="padding: 0 16px;" valign="top">
                                          <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 500; color: #111827;">
                                            ${title}
                                            ${variantTitleHtml}
                                          </p>
                                        </td>
                                        <td align="right" valign="middle">
                                          ${driveButtonHtml}
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                                `;
                              });
                              
                              // Close the table
                              htmlOutput += `
                                </table>
                              </div>
                              `;
                              
                              return htmlOutput;
                            };
                            
                            // Fetch complete product details from database before generating email content
                            let enrichedCartItems = [...cartItems]; // Start with existing cart items
                            
                            try {
                              // Extract product IDs from cart items
                              const productIds = cartItems
                                .map(item => item.productId || item.product_id)
                                .filter(Boolean);
                              
                              if (productIds.length > 0) {
                                // Fetch complete product details including images and drive links
                                const { data: products, error } = await supabase
                                  .from('shopify_products')
                                  .select('id, title, featured_image_url, google_drive_file_id')
                                  .in('id', productIds);
                                
                                if (error) {
                                  console.error('[Webhook][ECOM] Error fetching product details for email:', error);
                                } else if (products && products.length > 0) {
                                  console.log('[Webhook][ECOM] Successfully fetched product details for email:', JSON.stringify(products, null, 2));
                                  
                                  // Create a map for easy lookup
                                  const productMap = new Map(products.map(p => [p.id, p]));
                                  
                                  // Enrich cart items with database product details
                                  enrichedCartItems = cartItems.map(item => {
                                    const productId = item.productId || item.product_id;
                                    const productDetails = productId ? productMap.get(productId) : null;
                                    
                                    if (productDetails) {
                                      return {
                                        ...item,
                                        title: item.title || productDetails.title,
                                        featured_image_url: productDetails.featured_image_url,
                                        google_drive_file_id: productDetails.google_drive_file_id
                                      };
                                    }
                                    return item;
                                  });
                                }
                              }
                            } catch (fetchError) {
                              console.error('[Webhook][ECOM] Error enriching cart items for email:', fetchError);
                            }
                            
                            // Generate formatted HTML with enriched product details
                            const formattedOrderItemsHtml = formatOrderItemsForEmail(enrichedCartItems);
                            
                            // Send enhanced order confirmation email
                            await sendTransactionalEmail(
                              'Shopify Order Confirmation',
                              userEmail,
                              {
                                first_name: firstName,
                                order_number: newOrderId,
                                order_items: formattedOrderItemsHtml, // HTML-formatted order display
                                total_amount: ((tx.amount || data.amount || 0)).toFixed(2),
                                currency: tx.currency || 'PHP',
                                access_instructions: 'Your digital products have been delivered to your email. Check your Google Drive access for each item.',
                                magic_link: magicLink,
                                expiration_hours: expirationHours,
                                customer_type: customerType,
                                account_benefits: accountBenefits
                              },
                              leadId
                            )
                            console.log("[Webhook][ECOM] Order confirmation email sent successfully")
                          } catch (emailError) {
                            console.error("[Webhook][ECOM] Failed to send order confirmation email:", emailError)
                            // Don't throw - email failure shouldn't break payment processing
                          }
                        } else {
                          console.warn("[Webhook][ECOM] No email available for order confirmation")
                        }
                        // --- End Order Confirmation Email ---
                    }
                } catch (statusUpdateErr) {
                     console.error(`[Webhook][ECOM] Unexpected error updating order ${newOrderId} status:`, statusUpdateErr);
                }
            }
            // --- End Step 9 ---

          } else if (tx.transaction_type === "Canva") {
            // --- CANVA EBOOK TRANSACTION LOGIC ---
            console.log(`[Webhook][Canva] Processing Canva transaction: ${tx.id}`);
            // Store ebook contact info
            try {
              const emailToStore = tx.contact_email;
              if (emailToStore && typeof emailToStore === 'string') { // Ensure it's a non-null string
                  // Define new variable inside block, guaranteed to be string
                  const validatedEmail = emailToStore; 
                  await storeEbookContactInfo({
                    email: validatedEmail, // Use the validated, non-null email
                    // Ensure metadata is an object before passing
                    metadata: (typeof tx.metadata === 'object' && tx.metadata !== null) ? tx.metadata : {}, 
                  })
                  console.log("[Webhook][Canva] Ebook contact info stored successfully");
                  
                  // --- Apply Canva Purchase tag ---
                  try {
                    if (tx.user_id) {
                      // Get the Canva Purchase tag ID
                      const { data: canvaTag, error: tagError } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', 'Canva Purchase')
                        .single();
                        
                      if (tagError || !canvaTag) {
                        console.error("[Webhook][Canva] Failed to find 'Canva Purchase' tag:", tagError || 'Tag not found');
                      } else {
                        // Import the tags module
                        const { assignTagsToUsers } = await import('@/lib/supabase/data-access/tags');
                        
                        // Assign the tag to the user
                        await assignTagsToUsers({
                          tagIds: [canvaTag.id],
                          userIds: [tx.user_id]
                        });
                        
                        console.log(`[Webhook][Canva] Successfully tagged user ${tx.user_id} with 'Canva Purchase'`);
                      }
                    } else {
                      console.warn("[Webhook][Canva] Cannot apply tag - no user_id available");
                    }
                  } catch (tagError) {
                    console.error("[Webhook][Canva] Failed to tag user:", tagError);
                    // Don't throw - tagging failure shouldn't break payment processing
                  }
                  // --- End Canva Purchase tag ---
                  
                  // --- Send Canva Ebook Delivery Email ---
                  try {
                    const firstName = (tx.metadata as any)?.firstName || 'Friend'
                    
                    // Update lead status if leadId exists in metadata
                    const leadId = (tx.metadata as any)?.lead_id
                    if (leadId) {
                      try {
                        // Update lead status directly using Supabase
                        const { error: leadUpdateError } = await supabase
                          .from('purchase_leads')
                          .update({ 
                            status: 'payment_completed',
                            last_activity_at: new Date().toISOString(),
                            converted_at: new Date().toISOString()
                          })
                          .eq('id', leadId)
                        
                        if (leadUpdateError) {
                          console.error("[Webhook][Canva] Failed to update lead status:", leadUpdateError)
                        } else {
                          console.log("[Webhook][Canva] Lead status updated to payment_completed")
                        }
                      } catch (leadUpdateError) {
                        console.error("[Webhook][Canva] Failed to update lead status:", leadUpdateError)
                      }
                    }
                    
                    // Send ebook delivery email
                    await sendTransactionalEmail(
                      'Canva Ebook Delivery',
                      validatedEmail,
                      {
                        first_name: firstName,
                        ebook_title: 'My Canva Business Ebook',
                        google_drive_link: process.env.CANVA_EBOOK_DRIVE_LINK || 'https://drive.google.com/file/d/example',
                        support_email: process.env.SUPPORT_EMAIL || 'help@gracefulhomeschooling.com'
                      },
                      leadId
                    )
                    console.log("[Webhook][Canva] Ebook delivery email sent successfully")
                  } catch (emailError) {
                    console.error("[Webhook][Canva] Failed to send ebook delivery email:", emailError)
                    // Don't throw - email failure shouldn't break payment processing
                  }
                  // --- End Ebook Delivery Email ---
              } else {
                  console.warn("[Webhook][Canva] Skipping ebook contact storage because contact_email is null or not a string.");
              }
            } catch (err) {
              console.error("[Webhook][Canva] Failed to store ebook contact info:", err)
            }
          } else {
             // Log if transaction type is unknown or not handled
             console.warn(`[Webhook] Unhandled transaction_type encountered: ${tx.transaction_type} for transaction ID: ${tx.id}`);
          }
        } else {
           // Log if transaction status is not 'paid' or 'completed' after update attempt
           console.warn(`[Webhook] Transaction ${tx.id} status is '${tx.status}'. Skipping post-payment actions.`);
        }

        // --- Facebook CAPI Event (Run conditionally based on Transaction Type) ---
        console.log(`[Webhook][CAPI] Checking if CAPI event should be sent for tx ${tx.id}`);
        // Check if event is 'invoice.paid', transaction exists, AND transaction type is NOT SHOPIFY_ECOM
        if (event === 'invoice.paid' && tx && tx.transaction_type !== 'SHOPIFY_ECOM') { 
            console.log(`[Webhook][CAPI] Sending CAPI event for ${tx.transaction_type} transaction: ${tx.id}`);
            try {
            // We already have the transaction 'tx' which should be updated
            // Fetch user profile for PII (if available) using tx.user_id
            let userProfile = null;
            if (tx.user_id) {
              const { data: profile, error: profileError } = await supabase
                .from('unified_profiles')
                .select('email, phone, first_name, last_name')
                .eq('id', tx.user_id)
                .maybeSingle();
              if (profileError) {
                console.error('[Webhook][CAPI] Could not fetch user profile:');
              } else {
                userProfile = profile;
                console.log('[Webhook][CAPI] Fetched profile data for CAPI:');
              }
            } else {
               console.log('[Webhook][CAPI] No user_id on transaction, cannot fetch profile.');
            }

            // Prepare user data for CAPI
            // Remove duplicate 'meta' declaration
            // const meta = (typeof tx.metadata === 'object' && tx.metadata !== null) ? tx.metadata as { [key: string]: any } : {}; 
            const metaForCAPI = (typeof tx.metadata === 'object' && tx.metadata !== null) ? tx.metadata as { [key: string]: any } : {}; 
            const userDataRaw = {
              // Handle potential null contact_email for CAPI, ensure undefined if null
              email: userProfile?.email || tx.contact_email || undefined, 
              phone: metaForCAPI?.phone, // Access meta safely
              // Explicitly handle null/undefined for CAPI types
              firstName: metaForCAPI?.firstName || userProfile?.first_name || undefined, 
              lastName: metaForCAPI?.lastName || userProfile?.last_name || undefined,   
              fbp: metaForCAPI?.fbp, // Get fbp from metadata
              fbc: metaForCAPI?.fbc, // Get fbc from metadata
              clientIpAddress: undefined, // Typically not available in webhook
              clientUserAgent: undefined, // Typically not available in webhook
            };

            console.log('[Webhook][CAPI] Raw user data for CAPI:');

            // Build structured user data for CAPI
            const userData = buildUserData(userDataRaw);

            // Prepare event payload
            const eventPayload = {
              event_name: 'Purchase',
              event_time: Math.floor(new Date(tx.paid_at || data.paid_at || new Date()).getTime() / 1000), // Use tx paid_at, fallback to webhook paid_at
              event_id: tx.external_id || data.external_id || uuidv4(), // Use tx external_id, fallback to webhook external_id
              event_source_url: undefined, // Set if applicable
              action_source: 'website', // Assuming webhook originates from website actions
              userData,
              custom_data: {
                currency: tx.currency || data.metadata?.currency || 'PHP', // Use tx currency, fallback to webhook metadata
                value: tx.amount || data.amount || 0, // Use tx amount, fallback to webhook amount
                // Optionally add content IDs etc. if available from tx.metadata.items
                // contents: tx.metadata?.items?.map(item => ({ id: item.productId, quantity: item.quantity })), 
                // content_type: 'product', // Example
              },
            };

            // Log before sending the Facebook event
            console.log('[Webhook][CAPI] Sending Facebook Purchase event:');

            // Send the event
            try {
              const fbRes = await sendFacebookEvent(eventPayload);
              // Log the response from Facebook API (do NOT log full response)
              console.log('[Webhook][CAPI] Facebook Purchase event sent successfully:', {
                event_id: eventPayload.event_id,
              });
            } catch (fbErr: any) { // Catch specific error type if possible
              console.error('[Webhook][CAPI] Failed to send Facebook Purchase event:', fbErr.message || fbErr);
            }
            } catch (capiErr: any) { // Catch specific error type if possible
                console.error('[Webhook][CAPI] Unexpected error preparing CAPI event data:');
            }
        } else {
           // Log why CAPI event was skipped
           if (event !== 'invoice.paid') console.log(`[Webhook][CAPI] Skipping CAPI event: Event type is not 'invoice.paid' (${event}).`);
           else if (!tx) console.log(`[Webhook][CAPI] Skipping CAPI event: Transaction record 'tx' is not available.`);
           // Add specific log for skipping SHOPIFY_ECOM
           else if (tx.transaction_type === 'SHOPIFY_ECOM') console.log(`[Webhook][CAPI] Skipping CAPI event: Transaction type is SHOPIFY_ECOM.`);
        }
        // --- End Facebook CAPI ---

        break // End invoice.paid case
      }
      case "invoice.expired": {
        // Payment expired
        try {
          await updatePaymentStatus(data.external_id, "expired")
          console.log("[Webhook] Payment status updated to 'expired' for:", data.external_id)
        } catch (err) {
          console.error("[Webhook] Failed to update payment status:");
        }
        break
      }
      default:
        // Log unknown events
        console.log(`[Webhook] Unhandled Xendit webhook event: ${event}`)
    }
    // Return a success response
    console.log("[Webhook] Handler completed successfully.");
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