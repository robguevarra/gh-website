'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  LineChart, 
  Link as LinkIcon, 
  CreditCard, 
  Settings as SettingsIcon, 
  HelpCircle, 
  Loader2 
} from 'lucide-react';

import { AffiliateHeader } from '@/components/affiliate/affiliate-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAffiliateProfileData, useAffiliateDashboardUI } from '@/lib/hooks/use-affiliate-dashboard';
import { useAuth } from '@/context/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { affiliateProfile, isLoadingProfile, loadAffiliateProfile } = useAffiliateProfileData();
  const { activeDashboardTab, setActiveDashboardTab } = useAffiliateDashboardUI();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user?.id) {
      loadAffiliateProfile(user.id);
    }
  }, [user?.id, loadAffiliateProfile]);

  const navigation: NavigationItem[] = [
    {
      title: 'Overview',
      href: '/affiliate-portal',
      icon: LayoutDashboard,
    },
    {
      title: 'Performance',
      href: '/affiliate-portal/performance',
      icon: LineChart,
    },
    {
      title: 'Resources',
      href: '/affiliate-portal/resources',
      icon: HelpCircle,
    },
    {
      title: 'Payouts',
      href: '/affiliate-portal/payouts',
      icon: CreditCard,
    },
    {
      title: 'Settings',
      href: '/affiliate-portal/settings',
      icon: SettingsIcon,
    },
  ];

  const handleNavigation = (href: string, tab: 'overview' | 'payouts' | 'settings') => {
    setActiveDashboardTab(tab);
    router.push(href);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AffiliateHeader />
      
      <div className="container mx-auto px-4 pb-12">
        {isLoadingProfile ? (
          <div className="flex items-center space-x-2 mb-6">
            <Skeleton className="h-10 w-48" />
          </div>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
            {affiliateProfile && affiliateProfile.status !== 'active' && (
              <span className="ml-2 text-xs uppercase px-2 py-1 bg-amber-100 text-amber-800 rounded-md">
                {affiliateProfile.status}
              </span>
            )}
          </h1>
        )}

        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
          {/* Sidebar Navigation */}
          <aside className="md:w-64 flex-shrink-0">
            <nav className="mb-6 space-y-1 sticky top-24">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start text-left font-medium',
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !item.disabled && handleNavigation(
                      item.href, 
                      item.href.includes('performance') 
                        ? 'overview' 
                        : item.href.includes('payouts') 
                          ? 'payouts' 
                          : item.href.includes('settings') 
                            ? 'settings'
                            : 'overview'
                    )}
                    disabled={item.disabled}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </Button>
                );
              })}

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center text-sm text-muted-foreground">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  <a href="/affiliate-faq" className="hover:underline">Need help?</a>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {isLoadingProfile ? (
              <div className="flex flex-col space-y-4">
                <Skeleton className="h-8 w-full max-w-sm" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : affiliateProfile ? (
              <div>
                {/* Conditional status message */}
                {affiliateProfile.status === 'pending' && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                    <h3 className="font-semibold">Your affiliate account is pending approval</h3>
                    <p className="text-sm">
                      Our team is reviewing your application. You'll have full access to all features once approved.
                    </p>
                  </div>
                )}
                
                {affiliateProfile.status === 'flagged' && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                    <h3 className="font-semibold">Your affiliate account has been flagged</h3>
                    <p className="text-sm">
                      There may be an issue with your account. Please contact support for assistance.
                    </p>
                  </div>
                )}

                {affiliateProfile.status === 'inactive' && (
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                    <h3 className="font-semibold">Your affiliate account is inactive</h3>
                    <p className="text-sm">
                      Your account is currently inactive. Please contact support to reactivate your account.
                    </p>
                  </div>
                )}

                {/* Main content */}
                {children}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  You don't seem to have an affiliate account yet.
                </p>
                <Button className="mt-4" onClick={() => router.push('/affiliate-signup')}>
                  Apply to become an affiliate
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
