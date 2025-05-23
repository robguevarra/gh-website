import EmailAnalyticsDashboard from '@/components/admin/email-analytics-dashboard';
import { AdminHeading } from '@/components/admin/admin-heading';

export default function EmailAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <AdminHeading 
        title="Email Analytics"
        description="View platform-wide email performance, trends, and key metrics."
        className="mb-6"
      />
      <EmailAnalyticsDashboard />
    </div>
  );
} 