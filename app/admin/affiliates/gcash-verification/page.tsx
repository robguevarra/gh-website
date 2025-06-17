import { redirect } from 'next/navigation';

export default function GCashVerificationRedirect() {
  // Redirect to the main affiliates page since verification is now integrated
  redirect('/admin/affiliates?message=verification-integrated');
} 