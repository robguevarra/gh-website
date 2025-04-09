"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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

interface StudentHeaderProps {
  student: {
    name: string
    email: string
    avatar: string
  }
  courseProgress: {
    title: string
    progress: number
  }
}

export function StudentHeader({ student, courseProgress }: StudentHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Mock notifications
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

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"
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
                    <Avatar>
                      <AvatarImage src={student.avatar} alt={student.name} />
                      <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                  <Link
                    href="/logout"
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    Log Out
                  </Link>
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
          <div className="hidden md:flex relative">
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
              {notifications.some((n) => !n.read) && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-medium">Notifications</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNotifications(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b ${notification.read ? "" : "bg-brand-purple/5"}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.read && <Badge className="bg-brand-purple text-white text-xs">New</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                          <p className="text-xs text-gray-400">{notification.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    )}
                  </div>
                  <div className="p-2 border-t text-center">
                    <Button variant="link" className="text-brand-purple text-xs">
                      Mark all as read
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={student.avatar} alt={student.name} />
                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">{student.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col w-full">
                  <span className="text-xs text-muted-foreground">Course Progress</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium">{courseProgress.progress}%</span>
                    <span className="text-xs text-muted-foreground">{courseProgress.title}</span>
                  </div>
                  <Progress value={courseProgress.progress} className="h-1 mt-1" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem>Purchase History</DropdownMenuItem>
              <DropdownMenuItem>Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
