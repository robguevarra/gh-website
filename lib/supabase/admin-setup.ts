import { Database } from '@/types/supabase';
import { getAdminClient } from './admin';

// Admin user setup function 
// This should be run as a one-time script to set up the initial admin user
export async function setupAdminUser(email: string, password: string) {
  try {
    const adminClient = getAdminClient();
    
    // Create the user in Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating admin user:', authError);
      return { error: authError };
    }

    if (!authUser.user) {
      console.error('No user returned from auth creation');
      return { error: new Error('Failed to create auth user') };
    }

    // Create the profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authUser.user.id,
      email: email,
      full_name: 'Admin User',
      avatar_url: null,
      role: 'admin',
      is_admin: true,
    });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      return { error: profileError };
    }

    // Get or create admin role
    const { data: adminRole, error: roleError } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    if (roleError) {
      console.error('Error fetching admin role:', roleError);
      return { error: roleError };
    }

    // Assign admin role to user
    const { error: userRoleError } = await adminClient.from('user_roles').insert({
      user_id: authUser.user.id,
      role_id: adminRole.id,
    });

    if (userRoleError) {
      console.error('Error assigning admin role:', userRoleError);
      return { error: userRoleError };
    }

    return { data: authUser.user };
  } catch (error) {
    console.error('Unexpected error in admin setup:', error);
    return { error };
  }
}

// IMPORTANT: This file should only be imported and used in admin scripts or CLI tools
// It should never be bundled with client-side code as it contains service role key usage 