'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Workflow, Settings, Users } from 'lucide-react';

// Streamlined navigation following Graceful Homeschooling design principles
// Clean 3-tab structure for complete affiliate management workflow
const navItems = [
  { 
    name: 'Affiliates', 
    href: '/admin/affiliates', 
    baseRoute: '/admin/affiliates',
    icon: <Users className="h-4 w-4" />,
    description: 'Manage affiliate users, applications, and account details'
  },
  { 
    name: 'Conversions & Payouts', 
    href: '/admin/affiliates/conversions', 
    baseRoute: '/admin/affiliates/conversions',
    icon: <Workflow className="h-4 w-4" />,
    description: 'Review conversions and manage payouts in a unified workflow'
  },
  { 
    name: 'Analytics & Reports', 
    href: '/admin/affiliates/analytics', 
    baseRoute: '/admin/affiliates/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Performance metrics, financial reports, and system insights'
  },
  { 
    name: 'Settings', 
    href: '/admin/affiliates/settings', 
    baseRoute: '/admin/affiliates/settings',
    icon: <Settings className="h-4 w-4" />,
    description: 'Configure affiliate program rules and system preferences'
  }
];

export default function AffiliateNavTabs() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveValue = () => {
    // Handle exact matches and nested routes
    if (pathname === '/admin/affiliates') return '/admin/affiliates';
    if (pathname.startsWith('/admin/affiliates/conversions')) return '/admin/affiliates/conversions';
    if (pathname.startsWith('/admin/affiliates/analytics')) return '/admin/affiliates/analytics';
    if (pathname.startsWith('/admin/affiliates/settings')) return '/admin/affiliates/settings';
    
    // Default to affiliates for any other affiliate-related routes
    return '/admin/affiliates';
  };

  return (
    <div className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Tabs value={getActiveValue()} className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-auto">
            {navItems.map((item) => (
              <TabsTrigger 
                key={item.href} 
                value={item.href} 
                asChild
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Link href={item.href} className="flex items-center gap-2">
                  {item.icon}
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Elegant description text for current section */}
      <div className="px-4 pb-3">
        <p className="text-sm text-muted-foreground">
          {navItems.find(item => getActiveValue() === item.href)?.description}
        </p>
      </div>
    </div>
  );
}
