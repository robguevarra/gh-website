import { Metadata } from 'next';
import { AdminHeading } from '@/components/admin';
import { AccountReconciliation } from '@/components/admin/account-reconciliation';
import { validateAdmin } from '@/app/actions/admin-users';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Account Reconciliation | Admin',
  description: 'Search, compare, and merge user accounts across different systems',
};

/**
 * Account Reconciliation Page
 * 
 * This page provides an interface for administrators to search for potentially
 * related user accounts across different systems, compare their data, and
 * merge or link accounts as needed.
 */
export default async function AccountReconciliationPage() {
  // Validate admin access
  const { isAdmin } = await validateAdmin();
  
  if (!isAdmin) {
    redirect('/login?callbackUrl=/admin/users/reconciliation');
  }
  
  return (
    <div className="container py-6 space-y-6">
      <AdminHeading
        title="Account Reconciliation"
        description="Search, compare, and merge user accounts across different systems"
        backHref="/admin/users"
      />
      
      <AccountReconciliation />
    </div>
  );
}
