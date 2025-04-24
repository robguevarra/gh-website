import pkg from '@supabase/supabase-js';
const { createClient } = pkg;
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Derive directory path in ES Module context ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Error: Supabase URL or Service Role Key is missing in .env.local'
  );
  process.exit(1);
}

// Initialize Supabase client with Service Role Key
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// --- Configuration ---
const CSV_FILE_PATH = path.resolve(
  __dirname,
  '../Customer Export from Grace.csv'
); // Adjust path if needed
const BATCH_SIZE = 50; // Process records in batches
const DELAY_MS = 100; // Delay between batches to avoid overwhelming the DB

// --- Types ---
interface ShopifyCsvRecord {
  'Customer ID': string;
  Email: string;
  // Add other columns if needed, but only ID and Email are used here
}

interface UnifiedProfile {
  id: string;
  email: string;
}

// --- Helper Functions ---

/**
 * Cleans the Shopify Customer ID by removing the leading apostrophe.
 * @param rawId - The raw ID string from the CSV.
 * @returns The cleaned ID string.
 */
function cleanShopifyId(rawId: string): string {
  return rawId.startsWith("'") ? rawId.substring(1) : rawId;
}

/**
 * Reads and parses the CSV file.
 * @param filePath - Path to the CSV file.
 * @returns A promise that resolves to an array of parsed records.
 */
async function parseCsv(filePath: string): Promise<ShopifyCsvRecord[]> {
  return new Promise((resolve, reject) => {
    const records: ShopifyCsvRecord[] = [];
    const parser = fs.createReadStream(filePath).pipe(
      parse({
        columns: true, // Use header row for keys
        skip_empty_lines: true,
        trim: true,
      })
    );

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', function (err: Error) {
      console.error('CSV Parsing Error:', err.message);
      reject(err);
    });

    parser.on('end', function () {
      console.log(`Successfully parsed ${records.length} records from CSV.`);
      resolve(records);
    });
  });
}

/**
 * Fetches unified profile ID for a given email.
 * @param email - The email to look up.
 * @returns The unified profile ID or null if not found.
 */
async function getUnifiedProfileIdByEmail(
  email: string
): Promise<string | null> {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from('unified_profiles')
    .select('id')
    .eq('email', email.toLowerCase()) // Ensure consistent case matching
    .maybeSingle();

  if (error) {
    console.error(`Error fetching profile for email ${email}:`, error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Updates the shopify_customers table with the unified_profile_id.
 * Only updates if unified_profile_id is currently NULL.
 * @param shopifyCustomerId - The cleaned Shopify Customer ID.
 * @param unifiedProfileId - The ID of the matched unified profile.
 * @returns True if update was attempted (or not needed), false on error.
 */
async function updateShopifyCustomerLink(
  shopifyCustomerId: string,
  unifiedProfileId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('shopify_customers')
    .update({ unified_profile_id: unifiedProfileId })
    .eq('shopify_customer_id', shopifyCustomerId)
    .is('unified_profile_id', null); // IMPORTANT: Only update if not already linked

  if (error) {
    console.error(
      `Error updating Shopify customer ${shopifyCustomerId}:`,
      error.message
    );
    return false;
  }
  return true;
}

// --- Main Execution ---

async function main() {
  console.log('Starting Shopify customer linking process...');

  let csvRecords: ShopifyCsvRecord[];
  try {
    csvRecords = await parseCsv(CSV_FILE_PATH);
  } catch (error) {
    console.error('Failed to parse CSV. Exiting.');
    process.exit(1);
  }

  if (csvRecords.length === 0) {
    console.log('No records found in CSV. Exiting.');
    return;
  }

  let linkedCount = 0;
  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  let alreadyLinkedCount = 0;

  console.log(`Processing ${csvRecords.length} records in batches...`);

  for (let i = 0; i < csvRecords.length; i += BATCH_SIZE) {
    const batch = csvRecords.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);

    const promises = batch.map(async (record, index) => {
      const recordNum = i + index + 1;
      const shopifyCustomerIdRaw = record['Customer ID'];
      const email = record.Email;

      if (!shopifyCustomerIdRaw || !email) {
        console.warn(
          `Record ${recordNum}: Skipping due to missing ID or Email.`
        );
        return;
      }

      const shopifyCustomerId = cleanShopifyId(shopifyCustomerIdRaw);

      try {
        // 1. Check if already linked
        const { data: existingLink, error: linkError } = await supabaseAdmin
          .from('shopify_customers')
          .select('unified_profile_id')
          .eq('shopify_customer_id', shopifyCustomerId)
          .maybeSingle();

        if (linkError) {
            console.error(`Record ${recordNum} (ID: ${shopifyCustomerId}): Error checking existing link: ${linkError.message}`);
            errorCount++;
            return;
        }

        if (existingLink?.unified_profile_id) {
            // console.log(`Record ${recordNum} (ID: ${shopifyCustomerId}): Already linked.`);
            alreadyLinkedCount++;
            return; // Skip if already linked
        }


        // 2. Find unified profile
        const unifiedProfileId = await getUnifiedProfileIdByEmail(email);

        if (unifiedProfileId) {
          linkedCount++;
          // 3. Update shopify_customer if profile found AND not already linked
          const updateSuccess = await updateShopifyCustomerLink(
            shopifyCustomerId,
            unifiedProfileId
          );
          if (updateSuccess) {
            // Check if an actual update happened (we only update if unified_profile_id was null)
             const { data: updatedData, error: checkError } = await supabaseAdmin
                .from('shopify_customers')
                .select('unified_profile_id')
                .eq('shopify_customer_id', shopifyCustomerId)
                .eq('unified_profile_id', unifiedProfileId)
                .maybeSingle();

            if (!checkError && updatedData) {
                 console.log(
                   `Record ${recordNum} (ID: ${shopifyCustomerId}): Linked to profile ${unifiedProfileId} for email ${email}.`
                 );
                 updatedCount++;
            } else if(checkError) {
                 console.error(`Record ${recordNum} (ID: ${shopifyCustomerId}): Error verifying update: ${checkError.message}`);
                 errorCount++;
            }
            // If no updated data, it means the link was already there, handled above.

          } else {
            errorCount++;
          }
        } else {
          // console.log(
          //   `Record ${recordNum} (ID: ${shopifyCustomerId}): No unified profile found for email ${email}.`
          // );
          notFoundCount++;
        }
      } catch (err) {
        console.error(
          `Record ${recordNum} (ID: ${shopifyCustomerId}): Unexpected error during processing:`,
          err
        );
        errorCount++;
      }
    });

    await Promise.all(promises);

    // Optional delay between batches
    if (i + BATCH_SIZE < csvRecords.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('\n--- Linking Process Complete ---');
  console.log(`Total Records Processed: ${csvRecords.length}`);
  console.log(`Successfully Found Profile Matches: ${linkedCount}`);
  console.log(`Successfully Updated Links (previously NULL): ${updatedCount}`);
  console.log(`Records Already Linked: ${alreadyLinkedCount}`);
  console.log(`Profiles Not Found (No matching email): ${notFoundCount}`);
  console.log(`Errors Encountered: ${errorCount}`);
  console.log('--------------------------------\n');
}

main().catch((err) => {
  console.error('Unhandled error in main function:', err);
  process.exit(1);
}); 