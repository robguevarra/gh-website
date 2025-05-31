'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  LogOut,
  Receipt,
  Settings,
  User as UserIcon,
  BarChart2,
  CreditCard,
  Users,
  HelpCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

// Import auth context
import { useAuth } from '@/context/auth-context'

// Import dashboard switcher component
import { DashboardSwitcher } from '@/components/navigation/dashboard-switcher'

// Import student dashboard store for user context
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard'

export const AffiliateHeader = memo(function AffiliateHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  // Get user context from store
  const userContext = useStudentDashboardStore((state) => state.userContext)
  
  // Get currently logged in user's display name
  const displayName = userContext?.firstName && userContext?.lastName
    ? `${userContext.firstName} ${userContext.lastName}`
    : user?.email?.split('@')[0] || 'Affiliate'
  
  // Get user initials for avatar fallback
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'A'

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true)
      
      // Clear any application state that needs to be reset
      // Instead of using reset(), we'll just let the page navigation handle this
      // as the store will be reinitialized on next login
      
      // Sign out the user
      await logout()
      
      // Note: logout() already handles redirect in auth-context.tsx, but we'll keep this as a fallback
      router.push('/auth/signin')
    } catch (error) {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }, [router, logout])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link 
            href="/affiliate-portal"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <span className="inline-block font-bold text-xl md:text-2xl">Affiliate Portal</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Main navigation links */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
            <Link 
              href="/affiliate-portal" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              <BarChart2 className="h-4 w-4 mr-1 inline-block" />
              <span>Dashboard</span>
            </Link>
            <Link 
              href="/affiliate-portal/referrals" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Users className="h-4 w-4 mr-1 inline-block" />
              <span>Referrals</span>
            </Link>
            <Link 
              href="/affiliate-portal/payouts" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <CreditCard className="h-4 w-4 mr-1 inline-block" />
              <span>Payouts</span>
            </Link>
            <Link 
              href="/affiliate-portal/help" 
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <HelpCircle className="h-4 w-4 mr-1 inline-block" />
              <span>Help</span>
            </Link>
          </nav>

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-8 w-8 rounded-full md:h-auto md:w-auto md:px-4 md:py-2">
                <Avatar className="h-8 w-8 md:mr-2">
                  <AvatarImage src="" alt={displayName} />
                  <AvatarFallback>{displayInitial}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">
                    {displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email || 'affiliate@example.com'}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/affiliate-portal/settings">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/affiliate-portal/profile">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/affiliate-portal/earnings">
                  <Receipt className="mr-2 h-4 w-4" /> Earnings History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <DashboardSwitcher />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                {isLoggingOut ? (
                  <div className="flex items-center w-full px-2 py-1.5">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ) : (
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="flex items-center w-full justify-start cursor-pointer"
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </Button>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
})
