"use client"

import { useState, useEffect, useCallback, memo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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

// We're now using the useStudentHeader hook which provides optimized access to the store

// We'll get data from the store directly instead of props
interface StudentHeaderProps {}

export const StudentHeader = memo(function StudentHeader({}: StudentHeaderProps) {
  const router = useRouter()

  // Use the auth context to get the authenticated user and logout function
  const { user, profile, logout, isLoading: isLoadingAuth } = useAuth()

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
    if (user?.id) {
      console.log('Loading dashboard data for user:', user.id)
      loadUserData(user.id)
    }
  }, [user?.id, loadUserData])

  // Redirect to login if no user
  useEffect(() => {
    // Only redirect if auth is done loading and no user is found
    if (!user && !isLoadingAuth) {
      router.push('/auth/signin')
    }
  }, [user, isLoadingAuth, router])

  const [scrolled, setScrolled] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Mock notifications (these would come from the API in a real implementation)
  const notifications = [
    {
      id: 1,
      title: "New Templates Added",
      message: "We've just added 5 new planner templates to your free templates library.",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      title: "Live Class Reminder",
      message: "Your next live class starts tomorrow at 2:00 PM.",
      time: "5 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "Your download is ready",
      message: "Digital Planner Template has been processed and is ready for download",
      time: "Yesterday",
      read: true,
    },
  ]

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

  const handleLogout = async () => {
    try {
      // Set loading state
      setIsLoggingOut(true)

      // Use the auth context logout method
      const { error } = await logout();

      if (error) {
        console.error('Error signing out:', error);
        setIsLoggingOut(false);
        return;
      }

      // Redirect to login page after a short delay to allow for UI feedback
      setTimeout(() => {
        router.push('/auth/signin');
      }, 500);
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      setIsLoggingOut(false);
    }
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
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-brand-purple bg-brand-purple/10"
                  >
                    <Home className="h-5 w-5" />
                    Dashboard
                  </Link>
                  <Link
                    href={`/dashboard/course?courseId=${enrollments?.[0]?.course?.id || ''}`}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    prefetch={true}
                  >
                    <BookOpen className="h-5 w-5" />
                    Course Content
                  </Link>
                  <Link
                    href="/dashboard/resources"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    prefetch={true}
                  >
                    <Download className="h-5 w-5" />
                    Resources
                  </Link>
                  <Link
                    href="/dashboard/store"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    prefetch={true}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Store
                  </Link>
                  <Link
                    href="/dashboard/purchase-history"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    prefetch={true}
                  >
                    <Receipt className="h-5 w-5" />
                    Purchases
                  </Link>
                  <Link
                    href="/dashboard/live-classes"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Calendar className="h-5 w-5" />
                    Live Classes
                  </Link>
                  <Link
                    href="/dashboard/community"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Users className="h-5 w-5" />
                    Community
                  </Link>
                  <Link
                    href="/dashboard/support"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Support
                  </Link>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-4 px-4 mb-4">
                    {isLoadingAuth ? (
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-3 w-[70px]" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || user?.email || ''} />
                          <AvatarFallback>{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
                        </div>
                      </div>
                    )}
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

          <Link href="/" className="hidden md:block">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-brand-purple text-white flex items-center justify-center font-serif">
                G
              </div>
              <span className="font-serif text-lg">Graceful Homeschooling</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-brand-purple">
              Dashboard
            </Link>
            <Link
              href={`/dashboard/course?courseId=${enrollments?.[0]?.course?.id || ''}`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              prefetch={true}
            >
              Course Content
            </Link>
            <Link
              href="/dashboard/resources"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              prefetch={true}
            >
              Resources
            </Link>
            <Link
              href="/dashboard/store"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              prefetch={true}
            >
              Store
            </Link>
            <Link
              href="/dashboard/purchase-history"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              prefetch={true}
            >
              Purchases
            </Link>
            <Link
              href="/dashboard/live-classes"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Live Classes
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-1 w-80 rounded-md border bg-white shadow-md z-50"
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-medium">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b ${notification.read ? '' : 'bg-muted/30'}`}
                      >
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <div className="text-[10px] text-muted-foreground mt-2">{notification.time}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs justify-center">
                      View all notifications
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || user?.email || ''} />
                      <AvatarFallback>{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block">
                      <div className="text-sm font-medium">
                        {profile?.full_name || user?.email?.split('@')[0] || 'User'}
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
