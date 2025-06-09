'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import { Database, Json } from '@/types/supabase';
import { unstable_noStore as noStore } from 'next/cache';

export interface LogAdminActivityArgs {
  admin_user_id?: string;
  target_user_id?: string | null;
  target_entity_id?: string | null;
  activity_type: Database['public']['Enums']['activity_log_type'];
  description: string;
  details?: Json | null;
  ip_address?: string | null;
}

export interface ActivityLogItem {
  id: string;
  admin_user_id: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  target_user_id: string | null;
  target_entity_id: string | null;
  activity_type: Database['public']['Enums']['activity_log_type'];
  description: string;
  details: Json | null;
  ip_address: string | null;
  created_at: string; // We still use created_at in our interface for consistency, but map from 'timestamp' DB field
}

export async function getRecentActivityLogs(limit = 10): Promise<{ logs: ActivityLogItem[]; error?: string }> {
  noStore(); // Prevent caching to ensure fresh data
  const supabase = getAdminClient();
  
  try {
    // Fetch activity logs first
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (error) {
      // Log the full error object first
      console.error('Error fetching activity logs:', error);
      return { logs: [], error: 'Failed to fetch activity logs' };
    }
    
    // Then fetch admin user details separately for logs that have admin_user_id
    const logsWithAdminIds = data.filter(log => log.admin_user_id !== null);
    const adminIds = [...new Set(logsWithAdminIds.map(log => log.admin_user_id as string))];
    
    let adminProfiles: Record<string, { id: string; first_name: string | null; last_name: string | null; email: string | null }> = {};
    
    if (adminIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('unified_profiles')
        .select('id, first_name, last_name, email')
        .in('id', adminIds);
        
      if (profilesError) {
        console.error('Error fetching admin profiles:', profilesError);
        console.warn('Continuing with logs but without admin profile details');
      } else if (profiles) {
        // Create a lookup object by admin ID
        adminProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Process and format the data
    const formattedLogs = data.map(log => {
      // Get admin profile data if available
      const adminProfile = log.admin_user_id ? adminProfiles[log.admin_user_id] : null;
      
      // Create properly typed ActivityLogItem
      const formattedLog: ActivityLogItem = {
        id: `${log.id}`,
        admin_user_id: log.admin_user_id,
        admin_name: adminProfile ? 
          `${adminProfile.first_name || ''} ${adminProfile.last_name || ''}`.trim() || null : null,
        admin_email: adminProfile ? adminProfile.email : null,
        target_user_id: log.target_user_id,
        target_entity_id: log.target_entity_id,
        activity_type: log.activity_type as Database['public']['Enums']['activity_log_type'],
        description: log.description,
        details: log.details as Json | null,
        ip_address: log.ip_address as string | null,
        created_at: log.timestamp as string,
      };
      
      return formattedLog;
    });

    return { logs: formattedLogs };
  } catch (err) {
    console.error('Unexpected error in getRecentActivityLogs:', err);
    return { logs: [], error: 'An unexpected error occurred while fetching activity logs' };
  }
}

export async function logAdminActivity(args: LogAdminActivityArgs): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseDbAdmin = getAdminClient();
    let adminUserIdToLog = args.admin_user_id;

    if (!adminUserIdToLog) {
      // Explicitly await cookies() if TypeScript is treating it as a Promise
      const cookieStore = await cookies(); 

      const supabaseAuth = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              // @ts-ignore cookies() should be synchronous here, but TS might be confused.
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                // @ts-ignore
                cookieStore.set(name, value, options);
              } catch (error) {
                // console.error('Failed to set cookie in Server Action (set):', error);
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                // @ts-ignore
                cookieStore.set(name, '', options); 
              } catch (error) {
                // console.error('Failed to remove cookie in Server Action (remove):', error);
              }
            },
          },
        }
      );
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

      if (authError) {
        console.warn('logAdminActivity: Auth error while fetching current user:', authError.message);
      }
      if (user?.id) {
        adminUserIdToLog = user.id;
      } else {
        console.warn('logAdminActivity: admin_user_id not provided and no user in session. Logging activity without admin ID.');
      }
    }
    
    const { error: insertError } = await supabaseDbAdmin.from('admin_activity_log').insert([
      {
        admin_user_id: adminUserIdToLog,
        target_user_id: args.target_user_id,
        target_entity_id: args.target_entity_id,
        activity_type: args.activity_type,
        description: args.description,
        details: args.details,
        ip_address: args.ip_address,
      },
    ]);

    if (insertError) {
      console.error('Error logging admin activity:', insertError);
      return { success: false, error: 'Failed to log admin activity' };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while logging activity.';
    console.error('Unexpected error in logAdminActivity:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
