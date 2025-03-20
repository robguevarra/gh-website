import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Admin user setup function 
// This should be run as a one-time script to set up the initial admin user
export async function setupAdminUser({
  email,
  password,
  firstName,
  lastName,
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  // Create a supabase client with admin privileges using the service role key
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Create the user with the auth API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      throw new Error(`Error creating admin user: ${authError.message}`);
    }

    if (!authUser?.user) {
      throw new Error('Failed to create admin user');
    }

    const userId = authUser.user.id;

    // 2. Create a profile for the admin user with admin role
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      is_admin: true, // Mark as admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      throw new Error(`Error creating admin profile: ${profileError.message}`);
    }

    // 3. Fetch the admin role ID
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError) {
      throw new Error(`Error fetching admin role: ${roleError.message}`);
    }

    // 4. Assign the admin role to the user
    const { error: userRoleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: userId,
      role_id: adminRole.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (userRoleError) {
      throw new Error(`Error assigning admin role: ${userRoleError.message}`);
    }

    return {
      success: true,
      user: authUser.user,
      message: 'Admin user created successfully',
    };
  } catch (error) {
    console.error('Admin user setup error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// IMPORTANT: This file should only be imported and used in admin scripts or CLI tools
// It should never be bundled with client-side code as it contains service role key usage 