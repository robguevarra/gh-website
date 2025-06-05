import AffiliateNavTabs from '@/components/admin/affiliates/affiliate-nav-tabs';

export default function AdminAffiliatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col">
      <AffiliateNavTabs />
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}
