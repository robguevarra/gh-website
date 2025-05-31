'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// Icons for each portal type
import { BookOpen, Users, Settings } from 'lucide-react';

export function DashboardSwitcher() {
  const userContext = useStudentDashboardStore((state) => state.userContext);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration mismatch by mounting only on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !userContext) {
    return null;
  }

  // Access properties using camelCase as defined in the store
  const { isStudent, isAffiliate, isAdmin } = userContext;
  
  // Define roles with icons and paths
  const availableRoles = [
    isStudent && { 
      name: 'Student Dashboard', 
      path: '/dashboard',
      icon: BookOpen
    },
    isAffiliate && { 
      name: 'Affiliate Portal', 
      path: '/affiliate-portal',
      icon: Users
    },
    isAdmin && { 
      name: 'Admin Panel', 
      path: '/admin',
      icon: Settings
    },
  ].filter(Boolean) as { name: string; path: string; icon: any }[];

  // Only render the switcher if there's more than one role available
  if (availableRoles.length <= 1) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
          Your Access
        </div>
        <nav className="flex flex-col space-y-0.5">
          {availableRoles.map((role) => {
            const isActive = pathname.startsWith(role.path);
            const Icon = role.icon;
            
            return (
              <motion.div
                key={role.path}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  href={role.path}
                  className={`
                    group flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-all duration-200
                    ${isActive 
                      ? 'text-primary font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  <span className="flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{role.name}</span>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto text-primary"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </motion.div>
    </AnimatePresence>
  );
}
