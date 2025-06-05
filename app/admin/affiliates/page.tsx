import PageHeader from '@/components/common/page-header';
import AffiliateList from '@/components/admin/affiliates/affiliate-list';

export default function AdminAffiliatesPage() {
  return (
    <div>
      <PageHeader 
        title="Affiliate Management" 
        description="Oversee and manage all affiliate partners, their performance, and applications."
      />
      <div className="p-4">
        <AffiliateList />
      </div>
    </div>
  );
}
