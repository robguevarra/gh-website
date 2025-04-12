"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

// Auth context
import { useAuth } from "@/context/auth-context"

// Dashboard UI components
import { StudentHeader } from "@/components/dashboard/student-header"
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { TemplatePreviewModal } from "@/components/dashboard/template-preview-modal"
import { GoogleDriveFile } from "@/lib/hooks/use-google-drive"

// Dashboard store hooks
import { 
  useUserProfileData,
  useEnrollmentsData, 
  useCourseProgressData,
  useTemplatesData,
  useLiveClassesData,
  usePurchasesData,
  useUIState,
  useSectionExpansion
} from "@/lib/hooks/use-dashboard-store"

// Import types
import type { CourseProgress } from "@/lib/stores/student-dashboard/types"

// Define extended CourseProgress interface to include the properties we need
interface ExtendedCourseProgress extends CourseProgress {
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
}

// Dashboard Section components
import { CourseProgressSection } from "@/components/dashboard/course-progress-section"
import { LiveClassesSection } from "@/components/dashboard/live-classes-section"
import { PurchasesSection } from "@/components/dashboard/purchases-section"
import { SupportSection } from "@/components/dashboard/support-section"
import { CommunitySection } from "@/components/dashboard/community-section-v2"
import { TemplatesLibrarySection } from "@/components/dashboard/templates-library-section"
import { ErrorBoundary } from "@/components/ui/error-boundary"

// Lucide icons
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Facebook,
  HelpCircle,
  Info,
  Lightbulb,
  Mail,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Users,
  X
} from "lucide-react"

export default function StudentDashboard() {
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()
  
  // Dashboard store hooks
  const { userId, userProfile, isLoadingProfile, setUserId, setUserProfile } = useUserProfileData()
  const { enrollments = [], isLoadingEnrollments = false, loadUserEnrollments } = useEnrollmentsData() || {}
  const { courseProgress = {}, isLoadingProgress = false, loadUserProgress } = useCourseProgressData() || {}
  const { templates = [], isLoadingTemplates = false, loadUserTemplates } = useTemplatesData() || {}
  const { liveClasses = [], isLoadingLiveClasses = false } = useLiveClassesData() || {}
  const { purchases = [], isLoadingPurchases = false } = usePurchasesData() || {}
  
  // UI state from store
  const { 
    showWelcomeModal = false, 
    showOnboarding = false, 
    showAnnouncement = false,
    expandedSection = null,
    setShowWelcomeModal = () => {},
    setShowOnboarding = () => {},
    setShowAnnouncement = () => {},
    toggleSection = () => {} 
  } = useUIState() || {}
  
  // Local state
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<GoogleDriveFile | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // References for animations
  const containerRef = useRef(null)
  
  // Load user data when authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      // Redirect to login if not authenticated
      router.push('/auth/signin')
      return
    }
    
    if (user?.id) {
      // Set user ID in store
      setUserId(user.id)
      
      // Load user profile if available
      if (user.email) {
        setUserProfile({
          name: user.user_metadata?.full_name || 'Student',
          email: user.email,
          avatar: user.user_metadata?.avatar_url || `/placeholder.svg?height=40&width=40&text=${user.email.substring(0, 2).toUpperCase()}`,
          joinedDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        })
      }
      
      // Load user data
      loadUserEnrollments(user.id)
      loadUserProgress(user.id)
      loadUserTemplates(user.id)
    }
  }, [user, isAuthLoading, router, setUserId, setUserProfile, loadUserEnrollments, loadUserProgress, loadUserTemplates])

  // Helper Functions
  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Format progress percentage
  function formatProgress(value: number): string {
    return `${Math.round(value)}%`
  }

  // Check if section is expanded
  const isSectionExpanded = (section: string) => {
    return expandedSection === section
  }
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  }
  
  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Handle file selection
  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFile(file.id)
    setPreviewFile(file)
    setIsPreviewOpen(true)
  }
  
  // Mock data for upcoming classes
  const upcomingClasses = [
    {
      id: 1,
      title: "Designing Digital Planners that Sell",
      date: "July 20, 2023",
      time: "2:00 PM - 3:30 PM EDT",
      host: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
      zoomLink: "https://example.com/zoom1",
    },
    {
      id: 2,
      title: "Marketing Your Digital Products in 2023",
      date: "July 27, 2023",
      time: "2:00 PM - 3:30 PM EDT",
      host: {
        name: "Rob Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=RG",
      },
      zoomLink: "https://example.com/zoom2",
    },
  ]

  // Format the course progress data for the component using real data from the store
  const courseId = enrollments?.[0]?.course?.id || '';
  
  // Get the course progress from the store
  // Use a safer approach to handle the type conversion
  const rawCourseProgress = courseProgress[courseId] || null;
  const currentCourseProgress: ExtendedCourseProgress | null = rawCourseProgress ? {
    ...rawCourseProgress,
    progress: 0, // Default values that will be overridden if they exist in the actual data
    completedLessonsCount: 0,
    totalLessonsCount: 0,
    // Use any actual values from the raw data if they exist
    ...(rawCourseProgress as any)
  } : null;
  
  // Create a formatted version for the UI components with real data
  // This avoids TypeScript errors by not directly accessing properties that might not exist
  const formattedCourseProgress = {
    title: enrollments?.[0]?.course?.title || "Papers to Profits",
    progress: currentCourseProgress ? currentCourseProgress.progress : 0,
    completedLessons: currentCourseProgress ? currentCourseProgress.completedLessonsCount : 0,
    totalLessons: currentCourseProgress ? currentCourseProgress.totalLessonsCount : 0,
    nextLesson: "Continue Learning", // Will be updated with real data in future
    timeSpent: calculateTimeSpent(currentCourseProgress),
    nextLiveClass: upcomingClasses?.[0] ? `${upcomingClasses[0].date} - ${upcomingClasses[0].time}` : "No upcoming classes",
    instructor: {
      name: "Grace Guevarra",
      avatar: "/placeholder.svg?height=40&width=40&text=GG",
    },
  }
  
  // Helper function to calculate time spent
  function calculateTimeSpent(progress: ExtendedCourseProgress | null): string {
    if (!progress) return "0h 0m";
    // In a real implementation, this would calculate based on actual time tracking data
    // For now, we'll estimate based on completed lessons (15 min per lesson)
    const minutes = (progress.completedLessonsCount || 0) * 15;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // Mock data for announcements
  const announcements = [
    {
      id: 1,
      title: "New Templates Added!",
      content: "We've just added 5 new planner templates to your free templates library. Check them out now!",
      date: "July 15, 2023",
      isNew: true,
    },
    {
      id: 2,
      title: "Upcoming Live Q&A Session",
      content: "Join us for a live Q&A session on July 20 at 2:00 PM to get all your questions answered.",
      date: "July 14, 2023",
      isNew: false,
    },
  ]

  // Get the continue learning lesson from the store
  const { continueLearningLesson } = useCourseProgressData();
  
  // Format the continue learning lesson data for the component
  const recentLessons = continueLearningLesson ? [
    {
      id: parseInt(continueLearningLesson.lessonId) || 1,
      title: continueLearningLesson.lessonTitle,
      module: continueLearningLesson.moduleTitle,
      duration: "15 min", // This should come from the actual lesson data in a real implementation
      thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson",
      progress: continueLearningLesson.progress,
      current: true,
    }
  ] : [
    // Fallback if no continue learning lesson is available
    {
      id: 1,
      title: "Introduction to Course",
      module: "Getting Started",
      duration: "15 min",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson+1",
      progress: 0,
      current: true,
    }
  ]

  // Mock data for free templates
  const freeTemplates = [
    {
      id: "template1",
      name: "Digital Planner Template",
      type: "pdf",
      category: "planners",
      size: "2.4 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Planner",
      downloads: 1245,
      googleDriveId: "1abc123",
    },
    {
      id: "template2",
      name: "Journal Cover Design",
      type: "pdf",
      category: "journals",
      size: "1.8 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Journal",
      downloads: 987,
      googleDriveId: "2def456",
    },
    {
      id: "template3",
      name: "Weekly Schedule Template",
      type: "pdf",
      category: "planners",
      size: "1.2 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Schedule",
      downloads: 756,
      googleDriveId: "3ghi789",
    },
    {
      id: "template4",
      name: "Binding Guide",
      type: "pdf",
      category: "guides",
      size: "3.5 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Guide",
      downloads: 532,
      googleDriveId: "4jkl012",
    },
    {
      id: "template5",
      name: "Digital Stickers Pack",
      type: "zip",
      category: "stickers",
      size: "8.2 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Stickers",
      downloads: 1879,
      googleDriveId: "5mno345",
    },
  ]

  // Mock data for recent purchases
  const recentPurchases = [
    {
      id: "order1",
      date: "July 10, 2023",
      status: "completed",
      total: 1999, // in cents
      items: [
        {
          name: "Digital Planner Pro Pack",
          price: 1999, // in cents
          image: "/placeholder.svg?height=60&width=60&text=PP"
        }
      ]
    },
    {
      id: "order2",
      date: "June 22, 2023",
      status: "completed",
      total: 1299, // in cents
      items: [
        {
          name: "Instagram Marketing Guide",
          price: 1299, // in cents
          image: "/placeholder.svg?height=60&width=60&text=IMG"
        }
      ]
    },
    {
      id: "order3",
      date: "June 5, 2023",
      status: "completed",
      total: 899, // in cents
      items: [
        {
          name: "Custom Etsy Store Banner",
          price: 899, // in cents
          image: "/placeholder.svg?height=60&width=60&text=EB"
        }
      ]
    }
  ]

  // This section is now using the upcomingClasses defined above
  /* Removed duplicate upcomingClasses declaration */

  // Mock data for community posts
  const communityPosts = [
    {
      id: "post-1",
      user: {
        name: "Emily Parker",
        avatar: "/placeholder.svg?height=40&width=40&text=EP"
      },
      content: "Just launched my first digital planner and made 3 sales already! The tips from Module 4 were super helpful.",
      date: "2 hours ago",
      likes: 12,
      comments: 5
    },
    {
      id: "post-2",
      user: {
        name: "Jason Lee",
        avatar: "/placeholder.svg?height=40&width=40&text=JL"
      },
      content: "Anyone have tips for getting more visits to my Etsy shop? I'm implementing the SEO strategies but traffic is slow.",
      date: "1 day ago",
      likes: 8,
      comments: 15
    }
  ]

  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <StudentHeader />

      {/* Welcome Modal for First-time Users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false)
          setShowOnboarding(true)
        }}
      />

      {/* Onboarding Tour */}
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
      
      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        file={previewFile}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={(file) => {
          // Open Google Drive download link in new tab
          if (file.id.startsWith('mock-')) {
            console.log('Mock download triggered for:', file.name);
            return;
          }
          
          window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, '_blank');
          
          // Track download (we could add analytics here)
          console.log(`Template downloaded: ${file.name}`);
        }}
      />

      <main ref={containerRef} className="pb-20">
        <div className="container px-4 py-8">
          {/* Announcement Banner */}
          <AnimatePresence>
            {showAnnouncement && (
              <motion.div
                className="mb-6 bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 rounded-xl p-4 border border-brand-purple/20 relative"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-3">
                  <div className="bg-brand-purple/20 rounded-full p-2 mt-0.5">
                    <Bell className="h-5 w-5 text-brand-purple" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-brand-purple">{announcements[0].title}</h3>
                    <p className="text-sm text-[#6d4c41]">{announcements[0].content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-[#6d4c41]">{announcements[0].date}</span>
                      <Link href="/dashboard/announcements" className="text-xs text-brand-purple hover:underline">
                        View all announcements
                      </Link>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 absolute top-2 right-2"
                    onClick={() => setShowAnnouncement(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-brand-purple/10 rounded-full p-2">
                  <BookOpen className="h-5 w-5 text-brand-purple" />
                </div>
                <div>
                  <div className="text-xs text-[#6d4c41]">Course Progress</div>
                  <div className="text-lg font-bold text-[#5d4037]">{formatProgress(formattedCourseProgress.progress)}</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-brand-pink/10 rounded-full p-2">
                  <Clock className="h-5 w-5 text-brand-pink" />
                </div>
                <div>
                  <div className="text-xs text-[#6d4c41]">Time Spent</div>
                  <div className="text-lg font-bold text-[#5d4037]">{formattedCourseProgress.timeSpent}</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-brand-blue/10 rounded-full p-2">
                  <Calendar className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <div className="text-xs text-[#6d4c41]">Next Live Class</div>
                  <div className="text-sm font-bold text-[#5d4037]">Jul 20, 2:00 PM</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-[#6d4c41]">Completed Lessons</div>
                  <div className="text-lg font-bold text-[#5d4037]">
                    {formattedCourseProgress.completedLessons}/{formattedCourseProgress.totalLessons}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

      {/* Course Progress Section */}
      <ErrorBoundary componentName="Course Progress Section">
        <div className="mt-8">
          <CourseProgressSection
          courseProgress={formattedCourseProgress}
          recentLessons={recentLessons}
          upcomingClasses={upcomingClasses}
          isSectionExpanded={isSectionExpanded}
          toggleSection={toggleSection}
        />
        </div>
      </ErrorBoundary>

      {/* Templates Library Section */}
      <ErrorBoundary componentName="Templates Library Section">
        <div className="mt-8">
          <TemplatesLibrarySection
            isSectionExpanded={isSectionExpanded}
            toggleSection={toggleSection}
            onTemplateSelect={(file) => {
              setPreviewFile(file)
              setIsPreviewOpen(true)
            }}
            isPreviewOpen={isPreviewOpen}
            setIsPreviewOpen={setIsPreviewOpen}
          />
        </div>
      </ErrorBoundary>

      {/* Two-column layout for Recent Purchases and Live Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Recent Purchases from Shopify */}
        <ErrorBoundary componentName="Purchases Section">
          <div>
            <PurchasesSection
              recentPurchases={recentPurchases}
              isSectionExpanded={isSectionExpanded}
              toggleSection={toggleSection}
            />
          </div>
        </ErrorBoundary>

        {/* Live Classes */}
        <ErrorBoundary componentName="Live Classes Section">
          <div>
            <LiveClassesSection
              upcomingClasses={upcomingClasses}
              isSectionExpanded={isSectionExpanded}
              toggleSection={toggleSection}
            />
          </div>
        </ErrorBoundary>
      </div>

      {/* Support and Community */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Support Section */}
        <ErrorBoundary componentName="Support Section">
          <div>
            <SupportSection
              faqs={[
                {
                  id: "faq-1",
                  question: "How do I access the course materials?",
                  content: "You can access all course materials by clicking on the course modules in the 'Course Progress' section."
                }
              ]}
              isSectionExpanded={isSectionExpanded}
              toggleSection={toggleSection}
            />
          </div>
        </ErrorBoundary>

        {/* Community Section */}
        <ErrorBoundary componentName="Community Section">
          <div>
            <CommunitySection
              communityPosts={communityPosts}
              isSectionExpanded={isSectionExpanded}
              toggleSection={toggleSection}
            />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  </main>
</div>
  )
}
