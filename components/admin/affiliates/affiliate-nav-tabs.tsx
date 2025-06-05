'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const navItems = [
  { name: 'Affiliate List', href: '/admin/affiliates', baseRoute: '/admin/affiliates' },
  { name: 'Analytics', href: '/admin/affiliates/analytics', baseRoute: '/admin/affiliates/analytics' },
  { name: 'Settings', href: '/admin/affiliates/settings', baseRoute: '/admin/affiliates/settings' },
  { name: 'Fraud Flags', href: '/admin/affiliates/flags', baseRoute: '/admin/affiliates/flags' },
];

// Sort by baseRoute length descending to match more specific paths first
const sortedNavItems = [...navItems].sort((a, b) => b.baseRoute.length - a.baseRoute.length);

export default function AffiliateNavTabs() {
  const pathname = usePathname();

  const getCurrentActiveTabHref = () => {
    const activeItem = sortedNavItems.find(item => pathname.startsWith(item.baseRoute));
    return activeItem ? activeItem.href : '/admin/affiliates'; // Default to main list href
  };

  const activeTabValue = getCurrentActiveTabHref();

  return (
    <Tabs value={activeTabValue} className="mb-4">
      <TabsList>
        {navItems.map((item) => ( // Use original navItems for rendering order
          <TabsTrigger key={item.name} value={item.href} asChild>
            <Link href={item.href}>{item.name}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
