"use client"

import { useState, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { User } from "@supabase/supabase-js"
import {
  Bell,
  ChevronDown,
  Home,
  Menu,
  BookOpen,
  ShoppingBag,
  Download,
  Calendar,
  LogOut,
  X,
  MessageSquare,
  Users,
  Receipt,
  ShoppingCart,
  Megaphone, // Added Megaphone icon
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

// Import our store hook and specific selectors/actions
import { useStudentHeader } from '@/lib/hooks/ui/use-student-header';
import { useAuth } from '@/context/auth-context';

// Import cart store
import { useCartStore } from '@/stores/cartStore';

// Import student dashboard store for clearing state on logout
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';

// We're now using the useStudentHeader hook which provides optimized access to the store
import { DashboardSwitcher } from '@/components/navigation/dashboard-switcher';

// Internal component for profile display with loading states and timeout handling
interface ProfileDisplayProps {
  isLoading: boolean;
  userProfile: { name: string; email: string; avatar: string; joinedDate: string } | null;
  user: User | null;
  displayName: string;
  displayInitial: string;
}

const ProfileDisplay = memo(function ProfileDisplay({ 
  isLoading, 
  userProfile, 
  user, 
  displayName, 
  displayInitial 
}: ProfileDisplayProps) {
  // State to force-resolve loading after a timeout
  const [forceResolveLoading, setForceResolveLoading] = useState(false);
  
  // Use effect to force-resolve loading state if it persists too long
  useEffect(() => {
    // If loading, set a timeout to force resolution after 5 seconds
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        setForceResolveLoading(true);
        console.warn('Force-resolved loading state after timeout');
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeoutId);
    } else {
      // Reset when not loading
      setForceResolveLoading(false);
    }
  }, [isLoading]);
  
  // Show loading state unless forced to resolve
  const shouldShowLoading = isLoading && !forceResolveLoading;
  
  if (shouldShowLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-3 w-[70px]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage 
          src={userProfile?.avatar || ''} 
          alt={userProfile?.name || user?.email || 'User'} 
        />
        <AvatarFallback>{displayInitial}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <p className="text-sm font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
      </div>
    </div>
  );
});

// We'll get data from the store directly instead of props
interface StudentHeaderProps {}

export const StudentHeader = memo(function StudentHeader({}: StudentHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Use auth context ONLY for authentication state
  const { user, logout, isLoading: isLoadingAuth, isAuthReady } = useAuth()

  // Use Zustand store directly for all application data with individual selectors for better performance
  const userProfile = useStudentDashboardStore(state => state.userProfile)
  const isLoadingProfile = useStudentDashboardStore(state => state.isLoadingProfile)
  const hasProfileError = useStudentDashboardStore(state => state.hasProfileError)
  const initializeAuthenticatedUser = useStudentDashboardStore(state => state.initializeAuthenticatedUser)
  const clearUserState = useStudentDashboardStore(state => state.clearUserState)
  
  // Combined loading state for UI purposes
  const isLoading = isLoadingAuth || isLoadingProfile

  // Use our optimized hook for the student header
  const {
    courseProgress,
    isLoadingProgress,
    continueLearningLesson,
    loadUserData,
    enrollments
  } = useStudentHeader()

  // Get cart items from Zustand store
  const cartItems = useCartStore((state) => state.items);
  const totalCartItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);

  // Initialize dashboard data when user is authenticated
  useEffect(() => {
    if (isAuthReady && user?.id && !userProfile) {
      initializeAuthenticatedUser();
    } else if (isAuthReady && !user) {
      clearUserState();
    }
  }, [isAuthReady, user?.id, userProfile, initializeAuthenticatedUser, clearUserState])

  // Note: Dashboard data is loaded by the dashboard page, not here
  // This prevents redundant calls and infinite loops

  // Redirect to login if no user
  useEffect(() => {
    // Only redirect if auth is done loading and no user is found
    if (!user && !isLoadingAuth && isAuthReady) {
      router.push('/auth/signin')
    }
  }, [user, isLoadingAuth, isAuthReady, router])

  // Compute display name with proper fallbacks
  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'User'
  const displayInitial = userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'

  const [scrolled, setScrolled] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // State for logout loading
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Handle logout with proper store cleanup
  const handleLogout = async () => {
    clearUserState(); // Clear store first
    await logout(); // Then logout
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white border-b"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <VisuallyHidden>
                <SheetTitle>Mobile Navigation Menu</SheetTitle>
              </VisuallyHidden>

              <div className="h-16 flex items-center px-6 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-brand-purple text-white flex items-center justify-center font-serif">
                    G
                  </div>
                  <span className="font-serif text-lg">Graceful Homeschooling</span>
                </div>
              </div>

              <div className="px-2 py-6">
                <div className="space-y-1">
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <Home className="h-5 w-5" />
                    Dashboard
                  </Link>
                  <Link
                    href={`/dashboard/course?courseId=${enrollments?.[0]?.course?.id || ''}`}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/course" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    prefetch={true}
                  >
                    <BookOpen className="h-5 w-5" />
                    Course Content
                  </Link>
                  <Link
                    href="/dashboard/resources"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/resources" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    prefetch={true}
                  >
                    <Download className="h-5 w-5" />
                    Student Course Library
                  </Link>
                  <Link
                    href="/dashboard/store"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/store" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    prefetch={true}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Store
                  </Link>
                  <Link
                    href="/dashboard/purchase-history"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/purchase-history" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    prefetch={true}
                  >
                    <Receipt className="h-5 w-5" />
                    Purchases
                  </Link>
                  <Link
                    href="/dashboard/announcements" // Updated Announcements link
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/announcements" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <Megaphone className="h-5 w-5" />
                    Announcements
                  </Link>
                  <Link
                    href="/dashboard/community"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/community" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <Users className="h-5 w-5" />
                    Community
                  </Link>
                  <Link
                    href="/dashboard/support"
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 ${pathname === "/dashboard/support" ? "text-brand-purple bg-brand-purple/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    Support
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-4 px-4 mb-4">
                    <ProfileDisplay 
                      isLoading={isLoading} 
                      userProfile={userProfile} 
                      user={user} 
                      displayName={displayName} 
                      displayInitial={displayInitial} 
                    />
                  </div>

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full justify-start font-normal"
                  >
                    <LogOut className="h-5 w-5" />
                    Log Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="hidden md:block">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-brand-purple text-white flex items-center justify-center font-serif">
                G
              </div>
              <span className="font-serif text-lg">Graceful Homeschooling</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className={`text-sm font-medium ${pathname === "/dashboard" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}>
              Dashboard
            </Link>
            <Link
              href={`/dashboard/course?courseId=${enrollments?.[0]?.course?.id || ''}`}
              className={`text-sm font-medium ${pathname === "/dashboard/course" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}
              prefetch={true}
            >
              Course Content
            </Link>
            <Link
              href="/dashboard/resources"
              className={`text-sm font-medium ${pathname === "/dashboard/resources" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}
              prefetch={true}
            >
              Student Course Library
            </Link>
            <Link
              href="/dashboard/store"
              className={`text-sm font-medium ${pathname === "/dashboard/store" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}
              prefetch={true}
            >
              Store
            </Link>
            <Link
              href="/dashboard/purchase-history"
              className={`text-sm font-medium ${pathname === "/dashboard/purchase-history" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}
              prefetch={true}
            >
              Purchases
            </Link>
            <Link
              href="/dashboard/announcements" // Updated Announcements link for desktop
              className={`text-sm font-medium ${pathname === "/dashboard/announcements" ? "text-brand-purple" : "text-muted-foreground hover:text-foreground"}`}
            >
              Announcements
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">

          <Link href="/dashboard/checkout" aria-label={`Shopping Cart with ${totalCartItems} items`}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalCartItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 min-w-[1rem] p-0.5 text-[10px] leading-none flex items-center justify-center rounded-full border-2 border-white"
                 >
                  {totalCartItems}
                </Badge>
              )}
              <span className="sr-only">Shopping Cart</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto bg-transparent hover:bg-transparent flex items-center gap-2">
                {isLoadingAuth ? (
                  <>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="hidden md:block">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar>
                      <AvatarImage src={userProfile?.avatar || ''} alt={userProfile?.name || user?.email || ''} />
                      <AvatarFallback>{displayInitial}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block">
                      <div className="text-sm font-medium">
                        {displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user?.email || 'user@example.com'}
                      </div>
                    </div>
                  </>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/purchase-history" prefetch={true}>
                  <Receipt className="mr-2 h-4 w-4" /> Purchases
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
