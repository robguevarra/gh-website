'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Tag,
  BarChart4,
  Settings,
  Mail,
  ShoppingBag,
  Shield,
  UserCog, // Corrected icon name for Affiliates
  Search,
  Bot
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'User Diagnostic', href: '/admin/user-diagnostic', icon: Search },
  { name: 'Courses', href: '/admin/courses', icon: BookOpen },
  { name: 'Affiliates', href: '/admin/affiliates', icon: UserCog }, // Corrected icon name  { name: 'Email Campaigns', href: '/admin/email', icon: Mail },
  { name: 'Shop Integration', href: '/admin/shop', icon: ShoppingBag },
  { name: 'Security', href: '/admin/security', icon: Shield },
  { name: 'Email', href: '/admin/email', icon: Mail },
  { name: 'Chatbot', href: '/admin/chatbot', icon: Bot },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 md:flex-shrink-0 border-r">
      <div className="h-full py-5">
        <div className="pl-6 pr-3">
          <h2 className="text-lg font-semibold text-primary">Admin Portal</h2>
          <p className="text-xs text-muted-foreground">
            Manage your platform content
          </p>
        </div>
        <nav className="mt-6 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
} 