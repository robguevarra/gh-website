'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { validateAdmin } from './admin-users';
import { UserSearchResult, AccountDetail, LinkedAccount } from '@/types/admin-types';
import { Database } from '@/types/supabase';

// Helper function to ensure admin_metadata column exists
async function ensureAdminMetadataColumn(adminClient: any) {
  try {
    // Check if the column exists
    const { data: columnCheck, error: columnError } = await adminClient.rpc('check_column_exists', {
      table_name: 'unified_profiles',
      column_name: 'admin_metadata'
    });
    
    // If the column doesn't exist, create it
    if (columnError || (columnCheck && !columnCheck)) {
      await adminClient.rpc('add_jsonb_column', {
        table_name: 'unified_profiles',
        column_name: 'admin_metadata'
      });
    }
    return true;
  } catch (error) {
    console.error('Error checking/creating admin_metadata column:', error);
    // Continue anyway, as the column might already exist
    return false;
  }
}

/**
 * Search for user accounts across different systems
 * 
 * This function searches for user accounts across unified_profiles, systemeio_backup,
 * and xendit_backup tables based on the provided search criteria.
 */
export async function searchUserAccounts({
  query,
  type = 'email',
  system = 'all',
  includeInactive = false,
  fuzzyMatch = false
}: {
  query: string;
  type?: 'email' | 'name' | 'phone';
  system?: 'all' | 'unified' | 'systemeio' | 'xendit';
  includeInactive?: boolean;
  fuzzyMatch?: boolean;
}) {
  // Validate admin access
  const { isAdmin } = await validateAdmin();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const adminClient = getAdminClient();
  const results: UserSearchResult[] = [];
  
  // Clean the search query
  const cleanQuery = query.trim();
  
  if (!cleanQuery) {
    return { results };
  }
  
  try {
    // Search in unified_profiles
    if (system === 'all' || system === 'unified') {
      let unifiedQuery = adminClient
        .from('unified_profiles')
        .select('*');
      
      // Apply search filters based on type
      if (type === 'email') {
        unifiedQuery = fuzzyMatch 
          ? unifiedQuery.ilike('email', `%${cleanQuery}%`)
          : unifiedQuery.eq('email', cleanQuery);
      } else if (type === 'name') {
        unifiedQuery = unifiedQuery.or(
          `first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%`
        );
      } else if (type === 'phone') {
        unifiedQuery = fuzzyMatch
          ? unifiedQuery.ilike('phone', `%${cleanQuery}%`)
          : unifiedQuery.eq('phone', cleanQuery);
      }
      
      // Filter by status if not including inactive accounts
      if (!includeInactive) {
        unifiedQuery = unifiedQuery.eq('status', 'active');
      }
      
      const { data: unifiedData, error: unifiedError } = await unifiedQuery.limit(10);
      
      if (unifiedError) {
        console.error('Error searching unified_profiles:', unifiedError);
      } else if (unifiedData) {
        // Map unified_profiles data to UserSearchResult format
        const unifiedResults = unifiedData.map(profile => ({
          id: profile.id,
          email: profile.email || '',
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          system: 'Unified',
          status: (profile as any).status || 'unknown',
          lastActive: (profile as any).last_login_at || profile.updated_at,
          matchScore: 1.0, // Exact match in the primary system
          rawData: profile
        }));
        
        results.push(...unifiedResults);
      }
    }
    
    // Search in shopify_customers
    if (system === 'all' || system === 'shopify' as any) {
      let shopifyQuery = adminClient
        .from('shopify_customers')
        .select('*');
      
      // Apply search filters based on type
      if (type === 'email') {
        shopifyQuery = fuzzyMatch
          ? shopifyQuery.ilike('email', `%${cleanQuery}%`)
          : shopifyQuery.eq('email', cleanQuery);
      } else if (type === 'name') {
        shopifyQuery = shopifyQuery.or(
          `first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%`
        );
      } else if (type === 'phone') {
        shopifyQuery = fuzzyMatch
          ? shopifyQuery.ilike('phone', `%${cleanQuery}%`)
          : shopifyQuery.eq('phone', cleanQuery);
      }
      
      // Only include records that aren't already linked to a unified profile
      // unless includeInactive is true
      if (!includeInactive) {
        shopifyQuery = shopifyQuery.is('unified_profile_id', null);
      }
      
      const { data: shopifyData, error: shopifyError } = await shopifyQuery.limit(10);
      
      if (shopifyError) {
        console.error('Error searching shopify_customers:', shopifyError);
      } else if (shopifyData) {
        // Map shopify_customers data to UserSearchResult format
        const shopifyResults = shopifyData.map(customer => ({
          id: `shopify-${customer.shopify_customer_id}`,
          email: customer.email || '',
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          system: 'Shopify',
          status: customer.unified_profile_id ? 'linked' : 'unlinked',
          lastActive: customer.updated_at,
          matchScore: fuzzyMatch ? 0.8 : 1.0, // Slightly lower score for fuzzy matches
          rawData: customer
        }));
        
        results.push(...shopifyResults);
      }
    }
    
    // Search in systemeio_backup
    if (system === 'all' || system === 'systemeio') {
      let systemeioQuery = adminClient
        .from('systemeio_backup')
        .select('*');
      
      // Apply search filters based on type
      if (type === 'email') {
        systemeioQuery = fuzzyMatch
          ? systemeioQuery.ilike('Email', `%${cleanQuery}%`)
          : systemeioQuery.eq('Email', cleanQuery);
      } else if (type === 'name') {
        systemeioQuery = systemeioQuery.or(
          `"First name".ilike.%${cleanQuery}%,"Last name".ilike.%${cleanQuery}%`
        );
      }
      
      const { data: systemeioData, error: systemeioError } = await systemeioQuery.limit(10);
      
      if (systemeioError) {
        console.error('Error searching systemeio_backup:', systemeioError);
      } else if (systemeioData) {
        // Map systemeio_backup data to UserSearchResult format
        const systemeioResults = systemeioData.map(profile => ({
          id: `systemeio-${profile.Email || ''}`,
          email: profile.Email || '',
          name: `${profile['First name'] || ''} ${profile['Last name'] || ''}`.trim(),
          system: 'SystemeIO',
          status: 'unknown', // Status not available in systemeio_backup
          lastActive: profile['Date Registered'],
          matchScore: 0.9, // Slightly lower match score for secondary system
          rawData: profile
        }));
        
        results.push(...systemeioResults);
      }
    }
    
    // Search in xendit_backup
    if (system === 'all' || system === 'xendit') {
      let xenditQuery = adminClient
        .from('xendit_backup')
        .select('*');
      
      // Apply search filters based on type
      if (type === 'email') {
        xenditQuery = fuzzyMatch
          ? xenditQuery.or(`"Email".ilike.%${cleanQuery}%,"Customer Email".ilike.%${cleanQuery}%`)
          : xenditQuery.or(`"Email".eq.${cleanQuery},"Customer Email".eq.${cleanQuery}`);
      } else if (type === 'name') {
        xenditQuery = xenditQuery.ilike('Customer Name', `%${cleanQuery}%`);
      } else if (type === 'phone') {
        xenditQuery = fuzzyMatch
          ? xenditQuery.ilike('Customer Mobile Number', `%${cleanQuery}%`)
          : xenditQuery.eq('Customer Mobile Number', cleanQuery);
      }
      
      const { data: xenditData, error: xenditError } = await xenditQuery.limit(10);
      
      if (xenditError) {
        console.error('Error searching xendit_backup:', xenditError);
      } else if (xenditData) {
        // Map xendit_backup data to UserSearchResult format
        const xenditResults = xenditData.map(profile => ({
          id: `xendit-${profile['Invoice ID'] || profile['External ID'] || ''}`,
          email: (profile['Customer Email'] || profile['Email'] || ''),
          name: profile['Customer Name'] || '',
          system: 'Xendit',
          status: profile['Status'] || 'unknown',
          lastActive: profile['Created Timestamp'],
          matchScore: 0.8, // Lower match score for payment system
          rawData: profile
        }));
        
        results.push(...xenditResults);
      }
    }
    
    // Sort results by match score (descending)
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    return { results };
  } catch (error) {
    console.error('Error in searchUserAccounts:', error);
    throw new Error('Failed to search user accounts');
  }
}

/**
 * Get detailed account information for comparison
 */
export async function getAccountDetails(accountId: string) {
  // Validate admin access
  const { isAdmin } = await validateAdmin();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const adminClient = getAdminClient();
  
  try {
    // Check if this is a unified profile ID (UUID format)
    if (accountId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Get unified profile data
      const { data, error } = await adminClient
        .from('unified_profiles')
        .select(`
          *,
          enrollments(*)
        `)
        .eq('id', accountId)
        .single();
      
      if (error) {
        console.error('Error fetching unified profile:', error);
        throw new Error('Failed to fetch account details');
      }
      
      const accountDetail: AccountDetail = {
        id: data.id,
        system: 'Unified',
        basicInfo: {
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
          status: (data as any).status || 'unknown'
        },
        activityInfo: {
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          lastLoginAt: (data as any).last_login_at || null,
          loginCount: (data as any).login_count || null
        },
        enrollments: data.enrollments || [],
        rawData: data
      };
      
      return accountDetail;
    }
    
    // Handle SystemeIO accounts
    if (accountId.startsWith('systemeio-')) {
      const email = accountId.replace('systemeio-', '');
      
      const { data, error } = await adminClient
        .from('systemeio_backup')
        .select('*')
        .eq('Email', email)
        .single();
      
      if (error) {
        console.error('Error fetching systemeio account:', error);
        throw new Error('Failed to fetch account details');
      }
      
      return {
        id: accountId,
        system: 'SystemeIO',
        basicInfo: {
          email: data.Email,
          firstName: data['First name'],
          lastName: data['Last name'],
          status: 'unknown'
        },
        activityInfo: {
          createdAt: data['Date Registered'],
          tags: data.Tag
        },
        rawData: data
      };
    }
    
    // Handle Xendit accounts
    if (accountId.startsWith('xendit-')) {
      const invoiceId = accountId.replace('xendit-', '');
      
      // Try to find by Invoice ID or External ID
      const { data, error } = await adminClient
        .from('xendit_backup')
        .select('*')
        .or(`"Invoice ID".eq.${invoiceId},"External ID".eq.${invoiceId}`)
        .single();
      
      if (error) {
        console.error('Error fetching xendit account:', error);
        throw new Error('Failed to fetch account details');
      }
      
      return {
        id: accountId,
        system: 'Xendit',
        basicInfo: {
          email: data['Customer Email'] || data.Email,
          name: data['Customer Name'],
          phone: data['Customer Mobile Number'],
          status: data.Status
        },
        paymentInfo: {
          amount: data.Amount,
          currency: data.Currency,
          paymentMethod: data['Payment Method'],
          description: data.Description
        },
        activityInfo: {
          createdAt: data['Created Timestamp'],
          paidAt: data['Paid Timestamp'],
          settledAt: data['Settled Timestamp']
        },
        rawData: data
      };
    }
    
    throw new Error('Invalid account ID format');
  } catch (error) {
    console.error('Error in getAccountDetails:', error);
    throw new Error('Failed to fetch account details');
  }
}

/**
 * Link accounts across different systems
 */
/**
 * Add an alternative email to a unified profile
 * 
 * This function adds an alternative email to a user's profile in the admin_metadata field.
 * This is useful for linking accounts from different systems that use different email addresses.
 */
export async function addAlternativeEmail({
  profileId,
  email,
  source = 'manual',
  notes
}: {
  profileId: string;
  email: string;
  source?: 'shopify' | 'systemeio' | 'xendit' | 'manual';
  notes?: string;
}) {
  // Validate admin access
  const { isAdmin } = await validateAdmin();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const adminClient = getAdminClient();
  
  try {
    // Validate profile ID format
    if (!profileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid profile ID format');
    }
    
    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }
    
    // Ensure admin_metadata column exists
    await ensureAdminMetadataColumn(adminClient);
    
    // Get the current profile
    const { data: profile, error: profileError } = await adminClient
      .from('unified_profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to add alternative email');
    }
    
    // Check if this is the primary email (no need to add as alternative)
    if (profile.email === email) {
      return { success: false, message: 'This is already the primary email' };
    }
    
    // Initialize or update the admin_metadata
    const adminMetadata = profile.admin_metadata || {};
    const alternativeEmails = adminMetadata.alternativeEmails || [];
    
    // Check if email already exists in alternatives
    if (alternativeEmails.some((e: {email: string}) => e.email === email)) {
      return { success: false, message: 'Email already exists as an alternative' };
    }
    
    // Add the new alternative email
    alternativeEmails.push({
      email,
      source,
      notes,
      addedAt: new Date().toISOString()
    });
    
    // Update the profile
    const { error: updateError } = await adminClient
      .from('unified_profiles')
      .update({
        admin_metadata: {
          ...adminMetadata,
          alternativeEmails
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to add alternative email');
    }
    
    return { success: true, message: 'Alternative email added successfully' };
  } catch (error) {
    console.error('Error in addAlternativeEmail:', error);
    throw error instanceof Error ? error : new Error('Failed to add alternative email');
  }
}

/**
 * Link accounts across different systems
 */
export async function linkAccounts({
  primaryAccountId,
  secondaryAccountIds,
  linkType = 'same-person',
  notes
}: {
  primaryAccountId: string;
  secondaryAccountIds: string[];
  linkType: 'same-person' | 'related' | 'duplicate';
  notes?: string;
}) {
  // Validate admin access
  const { isAdmin } = await validateAdmin();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const adminClient = getAdminClient();
  
  try {
    // Get primary account details to ensure it's a unified profile
    if (!primaryAccountId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Primary account must be a unified profile');
    }
    
    // Create account links in the database
    const timestamp = new Date().toISOString();
    
    for (const secondaryId of secondaryAccountIds) {
      // Extract system and identifier from secondary ID
      const [system, identifier] = secondaryId.includes('-') 
        ? secondaryId.split('-', 2)
        : [null, null];
      
      if (!system || !identifier) {
        console.error(`Invalid secondary account ID format: ${secondaryId}`);
        continue;
      }
      
      // Ensure admin_metadata column exists
      await ensureAdminMetadataColumn(adminClient);
      
      // Update the admin_metadata field in the unified profile
      const { data: profile, error: profileError } = await adminClient
        .from('unified_profiles')
        .select('*')
        .eq('id', primaryAccountId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('Failed to link accounts');
      }
      
      // Initialize or update the admin_metadata
      const adminMetadata = (profile as any).admin_metadata || {};
      const linkedAccounts: LinkedAccount[] = adminMetadata.linkedAccounts || [];
      
      // Add the new link if it doesn't already exist
      if (!linkedAccounts.some((link: LinkedAccount) => link.system === system && link.identifier === identifier)) {
        linkedAccounts.push({
          system,
          identifier,
          linkType,
          notes,
          linkedAt: timestamp
        });
      }
      
      // Update the admin_metadata with the new linked accounts
      const { error: updateError } = await adminClient
        .from('unified_profiles')
        .update({
          admin_metadata: {
            ...adminMetadata,
            linkedAccounts
          } as any,
          updated_at: timestamp
        })
        .eq('id', primaryAccountId);
      
      if (updateError) {
        console.error('Error updating profile metadata:', updateError);
        throw new Error('Failed to link accounts');
      }
      
      // If this is a Shopify account, update the unified_profile_id in shopify_customers
      // and add the email as an alternative if different
      if (system === 'shopify') {
        try {
          // Get the Shopify customer record
          const { data: shopifyCustomer, error: shopifyError } = await adminClient
            .from('shopify_customers')
            .select('*')
            .eq('shopify_customer_id', identifier)
            .single();
          
          if (shopifyError) {
            console.error('Error fetching Shopify customer:', shopifyError);
          } else if (shopifyCustomer) {
            // Update the unified_profile_id in the Shopify customer record
            const { error: linkError } = await adminClient
              .from('shopify_customers')
              .update({
                unified_profile_id: primaryAccountId,
                updated_at: timestamp
              })
              .eq('id', shopifyCustomer.id as any);
            
            if (linkError) {
              console.error('Error linking Shopify customer:', linkError);
            }
            
            // Add the Shopify email as an alternative if it's different
            if (shopifyCustomer.email && shopifyCustomer.email !== profile.email) {
              await addAlternativeEmail({
                profileId: primaryAccountId,
                email: shopifyCustomer.email,
                source: 'shopify',
                notes: `Added during account linking with Shopify customer ${identifier}`
              }).catch(error => {
                console.error('Error adding alternative email:', error);
                // Continue anyway, as the linking was successful
              });
            }
          }
        } catch (error) {
          console.error('Error processing Shopify customer:', error);
          // Continue anyway, as the main linking was successful
        }
      }
    }
    
    return { success: true, message: 'Accounts linked successfully' };
  } catch (error) {
    console.error('Error in linkAccounts:', error);
    throw new Error('Failed to link accounts');
  }
}
