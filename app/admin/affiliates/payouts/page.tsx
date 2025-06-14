import { redirect } from 'next/navigation';

// Redirect to unified Conversions & Payouts page
// This maintains the streamlined navigation while preserving functionality
export default async function AffiliatePayoutsPage() {
  redirect('/admin/affiliates/conversions');
}
