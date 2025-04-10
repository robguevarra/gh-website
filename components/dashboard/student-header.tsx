"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { signOut } from "@/lib/supabase/auth"
import {
  Bell,
  ChevronDown,
  Home,
  Menu,
  Search,
  BookOpen,
  ShoppingBag,
  Download,
  Calendar,
  LogOut,
  X,
  MessageSquare,
  Users,
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
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// Import our store hooks
import { useUserProfileData, useCourseProgressData } from "@/lib/hooks/use-dashboard-store"
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { useAuth } from '@/context/auth-context';

// We'll get data from the store directly instead of props
interface StudentHeaderProps {}

export function StudentHeader({}: StudentHeaderProps) {
  const router = useRouter()
  
  // Use the auth context to get the authenticated user
  const { user, profile, isLoading: isLoadingAuth } = useAuth()
  
  // Get course progress data from our store
  const { 
    courseProgress, 
    isLoadingProgress,
    continueLearningLesson
  } = useCourseProgressData()
  
  // Get the initialize function from the store
  const { loadUserDashboardData } = useStudentDashboardStore()
  
  // Initialize dashboard data when user is authenticated
  useEffect(() => {
    if (user?.id) {
      console.log('Loading dashboard data for user:', user.id)
      loadUserDashboardData(user.id)
    }
  }, [user?.id, loadUserDashboardData])
  
  // Redirect to login if no user
  useEffect(() => {
    // Only redirect if auth is done loading and no user is found
    if (!user && !isLoadingAuth) {
      router.push('/login')
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

  // Handle logout using the auth context
  const { logout } = useAuth()
  
  const handleLogout = async () => {
    try {
      // Use the auth context logout method
      const { error } = await logout();
      
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      
      // Redirect to login page
      router.push('/login');
    } catch (err) {
      console.error('Unexpected error during logout:', err);
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
                    href="/dashboard/course"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <BookOpen className="h-5 w-5" />
                    Course Content
                  </Link>
                  <Link
                    href="/dashboard/templates"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Download className="h-5 w-5" />
                    Templates
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
                  <Link
                    href="https://gracefulhomeschooling.myshopify.com"
                    target="_blank"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Shop
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
            <Link href="/dashboard/course" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Course Content
            </Link>
            <Link
              href="/dashboard/templates"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Templates
            </Link>
            <Link
              href="/dashboard/live-classes"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Live Classes
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[200px] pl-8 bg-white/50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                {isLoadingAuth ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="hidden md:block">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Purchase History</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="flex items-center w-full justify-start cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden lg:block border-l ml-4 pl-4">
            {isLoadingProgress || !continueLearningLesson ? (
              <div className="flex items-center gap-2">
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-medium mb-0.5">Currently learning</div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {continueLearningLesson?.lessonTitle || "No current lesson"}
                  </div>
                  <Progress value={continueLearningLesson?.progress || 0} className="h-1.5 w-[180px]" />
                </div>
                {continueLearningLesson && (
                  <Link 
                    href={`/courses/${continueLearningLesson.courseId}/modules/${continueLearningLesson.moduleId}/lessons/${continueLearningLesson.lessonId}`}
                  >
                    <Button variant="outline" size="sm">
                      Continue
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
