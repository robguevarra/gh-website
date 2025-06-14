import { redirect } from 'next/navigation';

// Redirect to unified Analytics & Reports page
// This maintains the streamlined navigation while preserving functionality
export default function PayoutMonitoringPage() {
  redirect('/admin/affiliates/analytics');
} 