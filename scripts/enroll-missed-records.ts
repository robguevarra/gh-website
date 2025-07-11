/**
 * Remediation Script for Missed Records
 * 
 * This script processes records that were missed in the original data migration:
 * 1. Records with the 'imported' tag in systemeio (1,108)
 * 2. Records with 'PaidP2P' tag registered after the cutoff (40)
 * 
 * It follows the proper enrollment flow as implemented in webhooks/xendit:
 * - Create transaction record
 * - Ensure auth user and profile exist
 * - Create enrollment
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
config()

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
  process.exit(1)
}

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Define batch size for test run
const TEST_BATCH_SIZE = 50 // Larger batch for extended testing
const CUTOFF_DATE = '2023-05-15' // End date of the initial migration
const DEFAULT_COURSE_ID = '7e386720-8839-4252-bd5f-09a33c3e1afb' // Using a valid UUID format for course ID
const IMPORTED_TAG = 'imported' // Tag used to identify imported records
const PAID_P2P_TAG = 'PaidP2P'

// Runtime flags
const FULL_RUN = process.argv.includes('--full')
const FULL_BATCH_SIZE = 5000 // generous upper bound larger than total expected records
const BATCH_SIZE = FULL_RUN ? FULL_BATCH_SIZE : TEST_BATCH_SIZE

// Single email mode argument e.g., --email=example@example.com
const EMAIL_ARG = process.argv.find(arg => arg.startsWith('--email='))
const SINGLE_EMAIL = EMAIL_ARG ? EMAIL_ARG.split('=')[1].trim().toLowerCase() : null
const CUTOFF_EMAIL = 'smilee.mearah@gmail.com'
const TRANSACTION_AMOUNT = 500 // Standard transaction amount for P2P enrollments

// Define interfaces for clarity
export interface SystemioRecord {
  [key: string]: string | number | boolean | null | undefined
  Email: string
  "First Name": string
  "Last Name": string
  "Date Registered": string
  Tag?: string
}

interface ProcessResult {
  email: string
  userId: string | null
  profileId: string | null
  transactionId: string | null
  success: boolean
  userExists?: boolean
  noProfile?: boolean
  profileError?: boolean
  error?: string
}

interface TransactionRecord {
  id: string
  user_id?: string
  contact_email: string
  amount: number
  currency: string
  status: string
  transaction_type: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Function to log a transaction for the user
async function logTransaction(userEmail: string, firstName: string, lastName: string, record: SystemioRecord): Promise<string> {
  try {
    // Check for existing transaction first to avoid duplicates
    console.log(`Checking for existing transaction for ${userEmail}...`)
    const { data: existingTransactions, error: lookupError } = await supabaseAdmin
      .from('transactions')
      .select('id, transaction_type, metadata, amount')
      .eq('contact_email', userEmail.toLowerCase())
      .in('status', ['SUCCEEDED', 'success']);
    
    if (lookupError) {
      console.log(`Error looking up existing transactions: ${lookupError.message}`);
    } else if (existingTransactions && existingTransactions.length > 0) {
      // pick the first transaction that is clearly linked to P2P course
      const priorTxn = existingTransactions.find((txn: any) =>
        ['p2p_course', 'p2p', 'enrollment', 'migration_remediation'].includes(txn.transaction_type) ||
        (txn.metadata && txn.metadata.course === 'p2p-course-2023')
      );
      if (priorTxn) {
        console.log(`Found existing qualifying transaction ${priorTxn.id} for ${userEmail}`);
        return priorTxn.id;
      }
    }
    
    const date = new Date(record['Date Registered'] || '')
    const formattedDate = !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString()
    
    // Determine amount based on tags
    let amount = 0
    if (record.Tag && record.Tag.includes(IMPORTED_TAG)) {
      amount = TRANSACTION_AMOUNT // 500 PHP for imported contacts
    } else if (record.Tag && record.Tag.includes(PAID_P2P_TAG)) {
      // For post-cutoff records, should cross-reference with Xendit
      // This would require fetching data from Xendit, using a stub value for now
      amount = 1000 // Example amount, should be replaced with actual Xendit lookup
      
      // TODO: Implement Xendit lookup for post-cutoff records
      // const xenditData = await lookupXenditTransaction(userEmail)
      // if (xenditData) {
      //   amount = xenditData.amount
      //   formattedDate = xenditData.paid_at || formattedDate
      // }
    }
    
    const transactionId = uuidv4()
    const transaction: TransactionRecord = {
      id: transactionId,
      contact_email: userEmail.toLowerCase(),
      amount: amount,
      currency: 'PHP',
      status: 'SUCCEEDED',
      transaction_type: 'migration_remediation',
      metadata: {
        first_name: firstName,
        last_name: lastName,
        course: 'p2p-course-2023',
        source: 'remediation',
        original_tags: typeof record.Tag === 'string' ? record.Tag : '',
        acquisition_source: typeof record.Tag === 'string' && record.Tag.includes(IMPORTED_TAG) ? 'imported' : 'organic',
        original_registration_date: record['Date Registered'] || ''
      },
      created_at: formattedDate, // Use original date for historical accuracy
      updated_at: new Date().toISOString() // Current date for the update timestamp
    }
    
    try {
      const { error } = await supabaseAdmin
        .from('transactions')
        .insert(transaction)
      
      if (error) {
        throw new Error(`Error creating transaction: ${error.message}`)
      }
      
      console.log(`✅ Created transaction ${transactionId} for ${userEmail}`)
      return transactionId
    } catch (err: unknown) {
      const error = err as Error
      console.error(`❌ Failed to create transaction for ${userEmail}: ${error.message}`)
      throw error
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Failed to log transaction for ${userEmail}: ${error.message}`)
    throw error
  }
}

// Function to ensure auth user and profile exist
async function ensureAuthUserAndProfile(email: string, firstName: string, lastName: string, record: SystemioRecord): Promise<{
  userId: string
  profileId: string | null
  userExists: boolean
  noProfile?: boolean
  profileError?: boolean
}> {
  try {
    console.log(`Ensuring auth user and profile for ${email}`)
    
    // Initialize userId and userExists
    let userId = ''
    let userExists = false
    
    // Check if user already exists - using efficient SQL-based lookup
    console.log(`Searching for existing user with email: ${email}`)
    
    // Try direct SQL with exec_sql first
    let userFound = false
    try {
      const { data, error: sqlError } = await supabaseAdmin.rpc('get_auth_user_by_email', {
        search_email: email
      })
      
      if (sqlError) {
        console.log(`SQL search error: ${sqlError.message}, falling back to pagination...`)
      } else if (data && data.length > 0) {
        userId = data[0].id
        userExists = true
        userFound = true
        console.log(`Found existing user ${userId} for ${email} via SQL`)
      } else {
        console.log(`No user found via SQL for ${email}, trying pagination...`)
      }
    } catch (err) {
      console.log(`Error in SQL search: ${err}, falling back to pagination...`)
    }
    
    // If SQL failed to find user, try pagination as a fallback
    if (!userFound) {
      console.log(`Trying pagination search for ${email}...`)
      let page = 1
      const perPage = 100
      let hasMore = true
      
      while (!userFound && hasMore) { // Continue paging until an empty page is returned
        try {
          console.log(`Checking page ${page}...`)
          const { data: usersPage, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage
          })
          
          if (pageError) {
            console.log(`Error on page ${page}: ${pageError.message}`)
            break
          }
          
          if (!usersPage?.users || usersPage.users.length === 0) {
            hasMore = false
            break
          }
          
          // Find user in current page
          const foundUser = usersPage.users.find((u: any) => 
            u.email?.toLowerCase() === email.toLowerCase()
          )
          
          if (foundUser) {
            userId = foundUser.id
            userExists = true
            userFound = true
            console.log(`Found existing user ${userId} for ${email} on page ${page}`)
            break
          }
          
          // Check if we've reached the end
          if (usersPage.users.length < perPage) {
            hasMore = false
          } else {
            page++
          }
        } catch (err) {
          console.log(`Error on page ${page}: ${err}`)
          break
        }
      }
    }
    
    // After both SQL and pagination attempts
    if (userFound) {
      console.log(`User ${email} exists with ID ${userId}`)
    } else {
      console.log(`No user found for ${email}, creating new user...`)
      
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          source: 'remediation',
          created_at: new Date().toISOString()
        }
      })
      
      if (createUserError) {
        // If user already exists error, try to get their ID via direct SQL
        if (createUserError.message.includes('already been registered')) {
          console.log(`User ${email} already exists but was not found in lookup. Trying to find via direct SQL...`)
          
          // Make one final attempt with direct SQL with exact email match
          try {
            const { data, error } = await supabaseAdmin.rpc('exec_sql', {
              sql: `SELECT id FROM auth.users WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`
            })
            
            if (!error && data && data.length > 0) {
              userId = data[0].id
              userExists = true
              userFound = true
              console.log(`Found existing user ${userId} for ${email} via direct SQL (exact match)`)
              // Continue to profile lookup
            } else {
              // We're in a really strange state - user exists according to API but we can't find it
              console.log(`User ${email} exists according to API but cannot be found in the database`)
              throw new Error(`Failed to find existing user: ${createUserError.message}`)
            }
          } catch (sqlErr) {
            console.log(`Final SQL lookup failed: ${sqlErr}`)
            throw new Error(`Failed to find existing user: ${createUserError.message}`)
          }
        } else {
          // Any other error during user creation, exit
          console.log(`Failed to create user: ${createUserError.message}`)
          throw new Error(`Failed to create user: ${createUserError.message}`)
        }
      } else if (newUser) {
        // Successfully created user
        userId = newUser.user.id
        console.log(`Created new user ${userId} for ${email}`)
      } else {
        throw new Error(`Failed to create user for ${email}: No error but no user data returned`)
      }
    }
    
    // Now look up or create unified profile
    let profileId: string | null = null
    try {
      // First, look up the profile
      console.log(`Looking up profile for ${email}`)
      const { data, error } = await supabaseAdmin.from('unified_profiles').select('id').eq('email', email)

      console.log(`Profile lookup result: ${JSON.stringify(data)}`)

      if (error) {
        console.log(`Error looking up profile: ${error.message}`)
        return { userId, profileId: null, userExists, profileError: true }
      }

      if (data && data.length > 0) {
        // Profile exists, use it
        console.log(`Found existing profile ${data[0].id} for ${email}`)
        return { userId, profileId: data[0].id, userExists, noProfile: false }
      } else {
        console.log(`No profile found for ${email}, creating one with ID matching user ID ${userId}...`)
      }
    } catch (err: any) {
      console.log(`Error creating profile: ${err.message}`)
      return { userId, profileId: null, userExists, profileError: true }
    }

    // Create new profile for user with ID matching the auth user ID
    // Parse systemeio registration date for created_at
    const registrationDate = record['Date Registered']
    const createdAt = registrationDate ? new Date(registrationDate).toISOString() : new Date().toISOString()
    
    // Parse tags from systemeio (comma-separated string to array)
    const systemioTags = record.Tag ? record.Tag.split(',').map(tag => tag.trim()) : []
    
    const { data: newProfile, error: profileError } = await supabaseAdmin.from('unified_profiles').insert([{
      id: userId, // Use the auth user ID as the profile ID to maintain FK integrity
      email,
      first_name: firstName,
      last_name: lastName,
      tags: systemioTags, // Convert comma-separated tags to array
      acquisition_source: 'migrated',
      created_at: createdAt, // Use original systemeio registration date
      updated_at: new Date().toISOString(),
      status: 'active',
      is_student: true,
      admin_metadata: {
        auth_user_id: userId,
        source: 'remediation',
        systemeio_id: record.ID,
        created_at: new Date().toISOString()
      }
    }]).select('id')

    if (profileError) {
      console.log(`Error creating profile: ${profileError.message}`)
      return { userId, profileId: null, userExists, profileError: true }
    }

    if (newProfile && newProfile.length > 0) {
      profileId = newProfile[0].id
      console.log(`Created new profile ${profileId} for ${email}`)
    }

    return { userId, profileId, userExists, noProfile: false }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Failed to ensure auth user and profile for ${email}: ${error.message}`)
    throw error
  }
}

// Function to create enrollment
async function createEnrollment(userId: string, courseId: string, transactionId: string, profileId: string | null, record: any): Promise<string | undefined> {
  console.log(`Creating enrollment for user ${userId || ''} in course ${courseId}`)
  
  if (!userId) {
    throw new Error('Cannot create enrollment: userId is empty or undefined')
  }
  
  try {
    // First check if enrollment already exists
    const { data: existingEnrollments, error: enrollmentCheckError } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'active')
    
    if (enrollmentCheckError) {
      console.log(`Error checking existing enrollments: ${enrollmentCheckError.message}`)
    }
    
    if (existingEnrollments && existingEnrollments.length > 0) {
      console.log(`Enrollment already exists for user ${userId} in course ${courseId}`)
      return existingEnrollments[0].id
    }
    
    // Create new enrollment with explicit UUID
    const enrollmentId = uuidv4()
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .insert([{        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        metadata: {
          profile_id: profileId,
          source: 'remediation',
          transaction_id: transactionId
        }
      }])
      .select('id')
    
    if (error) {
      console.log(`Error creating enrollment: ${error.message}`)
      throw new Error(`Failed to create enrollment: ${error.message}`)
    }
    
    if (data && data.length > 0) {
      console.log(`Created enrollment ${data[0].id} for user ${userId} in course ${courseId}`)
      return data[0].id
    }
    
  } catch (err: any) {
    console.error(`Error creating enrollment for ${userId}: ${err.message}`)
    throw err
  }
}

// Helper to log migration result
async function logMigrationResult(email: string, status: 'success' | 'skipped' | 'error', details?: string) {
  try {
    await supabaseAdmin.from('migration_log').insert({
      email: email.toLowerCase(),
      status,
      details: details || null,
      processed_at: new Date().toISOString()
    })
  } catch (err) {
    console.log(`Failed to write migration_log for ${email}: ${err}`)
  }
}

// Function to process missed records with better error handling
async function processMissedRecord(record: SystemioRecord): Promise<ProcessResult> {
  try {
    const email = record.Email
    const firstName = record["First Name"] || "Unknown"
    const lastName = record["Last Name"] || "Unknown"
    
    console.log(`\n\n========= Processing record: ${email} =========`)
    
    // 1. Log transaction first
    const transactionId = await logTransaction(email, firstName, lastName, record)
    
    // 2. Ensure auth user and profile
    const { userId, profileId, userExists, noProfile, profileError } = await ensureAuthUserAndProfile(
      email,
      firstName,
      lastName,
      record // Pass the full record for metadata preservation
    )
    
    // 3. Create enrollment
    await createEnrollment(userId, DEFAULT_COURSE_ID, transactionId, profileId, record)
    
    return {
      email,
      userId,
      profileId,
      transactionId,
      success: true,
      userExists,
      noProfile,
      profileError
    }
  } catch (err) {
    const error = err as Error
    console.log(`❌ Error processing record ${record.Email}: ${error.message}`)
    return {
      email: record.Email,
      userId: null,
      profileId: null,
      transactionId: null,
      success: false,
      error: error.message
    }
  }
}

// Function to get cutoff timestamp
async function getCutoffTimestamp(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `SELECT "Date Registered" FROM systemeio WHERE "Email" = '${CUTOFF_EMAIL}' LIMIT 1`
    })
    
    if (error) {
      console.log(`Error getting cutoff timestamp: ${error.message}`)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log(`No cutoff record found for ${CUTOFF_EMAIL}, using default date ${CUTOFF_DATE}`)
      return CUTOFF_DATE
    }
    
    const cutoffTimestamp = data[0]["Date Registered"]
    console.log(`Using cutoff timestamp: ${cutoffTimestamp}`)
    return cutoffTimestamp
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Failed to get cutoff timestamp: ${error.message}`)
    return CUTOFF_DATE // Use the defined constant instead of hardcoded value
  }
}

// ... (rest of the code remains the same)
async function getMissedRecords(batchSize: number = TEST_BATCH_SIZE): Promise<SystemioRecord[]> {
  try {
    const cutoffTimestamp = await getCutoffTimestamp()
    console.log(`Using cutoff timestamp: ${cutoffTimestamp}`)
    
    // Get records with 'imported' tag
    const { data: importedRecords, error: importedError } = await supabaseAdmin
      .from('systemeio')
      .select('*')
      .ilike('Tag', `%${IMPORTED_TAG}%`)
      .limit(Math.ceil(batchSize / 2))
    
    if (importedError) {
      throw new Error(`Error getting imported records: ${importedError.message}`)
    }
    
    // Ensure proper type handling for records
    const typedImportedRecords = Array.isArray(importedRecords) ? 
      importedRecords.map(record => {
        return {
          Email: String(record.Email || ''),
          "First Name": String(record["First Name"] || ''),
          "Last Name": String(record["Last Name"] || ''),
          "Date Registered": String(record["Date Registered"] || ''),
          Tag: typeof record.Tag === 'string' ? record.Tag : ''
        } as SystemioRecord
      }) : []

    // Get records with 'PaidP2P' tag created after cutoff
    const { data: newRecords, error: newError } = await supabaseAdmin
      .from('systemeio')
      .select('*')
      .ilike('Tag', `%${PAID_P2P_TAG}%`)
      .gt('Date Registered', cutoffTimestamp)
      .limit(Math.floor(batchSize / 2))
    
    if (newError) {
      throw new Error(`Error getting new records: ${newError.message}`)
    }
    
    // Ensure proper type handling for new records
    const typedNewRecords = Array.isArray(newRecords) ? 
      newRecords.map(record => {
        return {
          Email: String(record.Email || ''),
          "First Name": String(record["First Name"] || ''),
          "Last Name": String(record["Last Name"] || ''),
          "Date Registered": String(record["Date Registered"] || ''),
          Tag: typeof record.Tag === 'string' ? record.Tag : ''
        } as SystemioRecord
      }) : []

    // Combine results
    const combinedRecords: SystemioRecord[] = [...typedImportedRecords, ...typedNewRecords]
    
    if (combinedRecords.length === 0) {
      throw new Error('No missed records found')
    }
    
    console.log(`Found ${typedImportedRecords.length} imported tag records and ${typedNewRecords.length} new records after cutoff`)
    console.log(`Total combined records: ${combinedRecords.length}`)
    
    return combinedRecords
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Failed to get missed records: ${error.message}`)
    throw error
  }
}

// Process a single record through the full enrollment flow
export async function processRecord(record: SystemioRecord) {
  const email = record.Email
  const firstName = String(record['First Name'] || 'Unknown')
  const lastName = String(record['Last Name'] || '')
  
  console.log(`\nProcessing record for ${email} (${firstName} ${lastName})`)
  
  try {
    // 1. Create transaction
    const transactionId = await logTransaction(email, firstName, lastName, record)
    
    // 2. Ensure auth user and profile
    const { userId, profileId, userExists, noProfile, profileError } = await ensureAuthUserAndProfile(
      email,
      firstName,
      lastName,
      record // Pass the full record for metadata preservation
    )
    
    // 3. Create enrollment
    await createEnrollment(userId, DEFAULT_COURSE_ID, transactionId, profileId, record)
    
    // mark success in migration_log and set profile flag
    await logMigrationResult(email, 'success')
    if (profileId) {
      await supabaseAdmin.from('unified_profiles').update({
        admin_metadata: supabaseAdmin.rpc('jsonb_set', {
          target: 'admin_metadata',
          path: '{remediation_done}',
          value: 'true',
          create_missing: true
        })
      }).eq('id', profileId)
    }
    return {
      email,
      success: true
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Failed to process record for ${email}: ${error.message}`)
    await logMigrationResult(email, 'error', error.message)
    return {
      email,
      success: false,
      error: error.message
    }
  }
}

// Function to run the test batch
async function runTestBatch() {
  console.log('=== MISSED RECORDS REMEDIATION - TEST BATCH ===')
  console.log(`Processing ${TEST_BATCH_SIZE} records as a test batch`)
  
  try {
    // Get test batch of missed records
    const missedRecords = await getMissedRecords(TEST_BATCH_SIZE)
    
    // Process each record
    const results = []
    for (const record of missedRecords) {
      const result = await processRecord(record)
      results.push(result)
    }
    
    // Display results
    console.log('\n=== PROCESSING RESULTS ===')
    const successful = results.filter(r => r.success).length
    console.log(`Successfully processed: ${successful} out of ${results.length} records`)
    
    // List failures if any
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('\nFailed records:')
      failures.forEach(f => {
        console.log(`- ${f.email}: ${f.error}`)
      })
    }
    
    if (successful === results.length) {
      console.log('\n✅ TEST BATCH COMPLETED SUCCESSFULLY')
      console.log('You may proceed with processing the full batch of missed records')
    } else {
      console.log('\n⚠️ TEST BATCH COMPLETED WITH ERRORS')
      console.log('Please review the errors before attempting the full batch')
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Error in remediation process: ${error.message}`)
    return { error: error.message }
  }
}

// Function to run the full batch
async function runFullBatch() {
  console.log('=== MISSED RECORDS REMEDIATION - FULL RUN ===')
  console.log('Processing full set of missed records…')
  try {
    const missedRecords = await getMissedRecords(BATCH_SIZE)
    const results = []
    for (const record of missedRecords) {
      const result = await processRecord(record)
      results.push(result)
    }

    console.log('\n=== FULL RUN RESULTS ===')
    const successful = results.filter(r => r.success).length
    console.log(`Successfully processed: ${successful} out of ${results.length} records`)
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      console.log(`\nFailed records: ${failures.length}`)
      failures.forEach(f => console.log(`- ${f.email}: ${f.error}`))
    }
    console.log('\nℹ️  Detailed audit trail available in migration_log table.')
  } catch (err: unknown) {
    const error = err as Error
    console.error(`❌ Error in full remediation process: ${error.message}`)
  }
}

// Function to process a single email passed via --email flag
async function processSingleEmail(targetEmail: string) {
  console.log(`=== REMEDIATION FOR SINGLE EMAIL: ${targetEmail} ===`)

  // Attempt to fetch record from systemeio
  let record: SystemioRecord | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('systemeio')
      .select('*')
      .ilike('Email', targetEmail)
      .limit(1)
      .single()

    if (error) {
      console.log(`Could not fetch systemeio record: ${error.message}`)
    }
    if (data) {
      record = data as unknown as SystemioRecord
    }
  } catch (err) {
    console.log(`Error retrieving systemeio record: ${(err as Error).message}`)
  }

  // Fallback to minimal record if not found
  if (!record) {
    console.log('No systemeio record found, constructing minimal record for processing')
    record = {
      Email: targetEmail,
      "First Name": 'Unknown',
      "Last Name": '',
      "Date Registered": new Date().toISOString(),
      Tag: 'manual_enroll'
    } as unknown as SystemioRecord
    // add lowercase variants for compatibility
    ;(record as any)['First name'] = 'Unknown'
    ;(record as any)['Last name'] = ''
  }

  // Process the record through existing workflow
  const result = await processRecord(record)
  if (result.success) {
    console.log(`✅ Successfully remediated ${targetEmail}`)
  } else {
    console.log(`❌ Failed to remediate ${targetEmail}: ${result.error}`)
  }
}

// Dispatch based on flag when executed directly (not when imported)
const isCliExecution = ((): boolean => {
  // CommonJS check
  if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    // @ts-ignore
    return require.main === module
  }
  // ESM check using process.argv
  const currentFile = process.argv[1]
  const thisFile = __filename || ''
  return currentFile?.includes('enroll-missed-records') || thisFile.includes('enroll-missed-records')
})()

// Execute based on provided flags regardless of module loader nuances
if (SINGLE_EMAIL) {
  (async () => { await processSingleEmail(SINGLE_EMAIL) })()
} else if (isCliExecution) {
  if (FULL_RUN) {
    (async () => { await runFullBatch() })()
  } else {
    runTestBatch()
  }
}
