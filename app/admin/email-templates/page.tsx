/**
 * Email Templates Admin Page
 * 
 * This page provides an interface for administrators to:
 * - View all email templates
 * - Edit templates using the MJML editor
 * - Preview rendered emails
 * - Test send emails
 */

import { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import EmailTemplatesManager from './email-templates-manager';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Email Templates | Admin Dashboard',
  description: 'Manage email templates for Graceful Homeschooling',
};

async function checkAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin?message=Authentication required');
  }

  // Adjust this check based on your actual role management setup
  const isAdmin = user.user_metadata?.is_admin === true;
  if (!isAdmin) {
    redirect('/dashboard?error=Admin access required'); // Or redirect to an unauthorized page
  }
}

export default async function AdminEmailTemplatesPage() {
  await checkAdmin(); // Ensure admin access

  return (
    <div className="w-full">
      <EmailTemplatesManager />
    </div>
  );
}
