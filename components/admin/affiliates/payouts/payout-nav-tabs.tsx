'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, FileSpreadsheet, Package, Activity, Settings, CheckCircle2 } from 'lucide-react';

const payoutNavItems = [
  { 
    name: 'Conversions', 
    href: '/admin/affiliates/conversions', 
    baseRoute: '/admin/affiliates/conversions',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Verify conversions for payout eligibility'
  },
  { 
    name: 'Payouts', 
    href: '/admin/affiliates/payouts', 
    baseRoute: '/admin/affiliates/payouts',
    exact: true,
    icon: <Package className="h-4 w-4" />,
    description: 'Manage affiliate payouts'
  },
  { 
    name: 'Preview', 
    href: '/admin/affiliates/payouts/preview', 
    baseRoute: '/admin/affiliates/payouts/preview',
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: 'Preview eligible payouts'
  },
  { 
    name: 'Batches', 
    href: '/admin/affiliates/payouts/batches', 
    baseRoute: '/admin/affiliates/payouts/batches',
    icon: <Package className="h-4 w-4" />,
    description: 'Manage payout batches'
  },
  { 
    name: 'Monitoring', 
    href: '/admin/affiliates/payouts/monitoring', 
    baseRoute: '/admin/affiliates/payouts/monitoring',
    icon: <Activity className="h-4 w-4" />,
    description: 'Monitor payout processing'
  },
  { 
    name: 'Reports', 
    href: '/admin/affiliates/payouts/reports', 
    baseRoute: '/admin/affiliates/payouts/reports',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'View payout analytics'
  },
];

// Sort by baseRoute length descending to match more specific paths first
const sortedNavItems = [...payoutNavItems].sort((a, b) => b.baseRoute.length - a.baseRoute.length);

export default function PayoutNavTabs() {
  const pathname = usePathname();

  const getCurrentActiveTabHref = () => {
    // First check for exact matches
    const exactMatch = payoutNavItems.find(item => 
      item.exact && pathname === item.baseRoute
    );
    
    if (exactMatch) {
      return exactMatch.href;
    }

    // Then check for prefix matches
    const activeItem = sortedNavItems.find(item => 
      !item.exact && pathname.startsWith(item.baseRoute)
    );
    
    return activeItem ? activeItem.href : '/admin/affiliates/payouts';
  };

  const activeTabValue = getCurrentActiveTabHref();

  return (
    <div className="border-b">
      <Tabs value={activeTabValue} className="mb-0">
        <TabsList className="h-12 bg-transparent border-none">
          {payoutNavItems.map((item) => (
            <TabsTrigger 
              key={item.name} 
              value={item.href} 
              asChild
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
              title={item.description}
            >
              <Link href={item.href} className="flex items-center gap-2">
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
} 