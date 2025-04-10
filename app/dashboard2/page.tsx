"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Dashboard UI components
import { StudentHeader } from "@/components/dashboard/student-header"
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { TemplatePreviewModal } from "@/components/dashboard/template-preview-modal"

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
  // State hooks
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>("course")

  // References for animations
  const containerRef = useRef(null)

  // Helper Functions
  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Format progress percentage
  function formatProgress(value: number): string {
    return `${Math.round(value)}%`
  }

  // Toggle section expansion (for mobile)
  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null)
    } else {
      setExpandedSection(section)
    }
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

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = freeTemplates.find(t => t.id === templateId)
    if (template) {
      setPreviewTemplate(template)
      setIsPreviewOpen(true)
    }
  }

  // Get selected template
  const getSelectedTemplate = () => {
    return freeTemplates.find((template) => template.id === selectedTemplate) || freeTemplates[0]
  }

  // Mock data for the student
  const student = {
    name: "Sarah Johnson",
    email: "sarah@example.com",
    avatar: "/placeholder.svg?height=40&width=40&text=SJ",
    joinedDate: "January 15, 2023",
  }

  // Mock data for course progress
  const courseProgress = {
    title: "Papers to Profits",
    progress: 42,
    completedLessons: 8,
    totalLessons: 19,
    nextLesson: "Creating Your First Digital Planner",
    timeSpent: "12h 45m",
    nextLiveClass: "July 20, 2023 - 2:00 PM",
    instructor: {
      name: "Grace Guevarra",
      avatar: "/placeholder.svg?height=40&width=40&text=GG",
    },
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

  // Mock data for recent lessons
  const recentLessons = [
    {
      id: 7,
      title: "Creating Your First Digital Planner",
      module: "Digital Product Creation",
      duration: "19:45",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson+7",
      progress: 35,
      current: true,
    },
    {
      id: 8,
      title: "Setting Up Your Etsy Shop",
      module: "Selling Your Products",
      duration: "23:10",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson+8",
      progress: 0,
    },
    {
      id: 9,
      title: "Product Photography Basics",
      module: "Marketing Your Products",
      duration: "18:22",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson+9",
      progress: 0,
    },
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

  // Mock data for live classes
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
        template={previewTemplate}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={(template) => {
          // Open Google Drive download link in new tab
          window.open(`https://drive.google.com/uc?export=download&id=${template.googleDriveId}`, '_blank');
          
          // Track download (we could add analytics here)
          console.log(`Template downloaded: ${template.name}`);
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
                  <div className="text-lg font-bold text-[#5d4037]">{formatProgress(courseProgress.progress)}</div>
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
                  <div className="text-lg font-bold text-[#5d4037]">{courseProgress.timeSpent}</div>
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
                    {courseProgress.completedLessons}/{courseProgress.totalLessons}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Dashboard Sections */}
          <div className="space-y-6">
            {/* Course Progress Section */}
            <ErrorBoundary componentName="Course Progress Section">
              <CourseProgressSection 
                courseProgress={courseProgress}
                recentLessons={recentLessons}
                upcomingClasses={upcomingClasses}
                isMobile={false}
                isSectionExpanded={isSectionExpanded}
                toggleSection={toggleSection}
              />
            </ErrorBoundary>

            {/* Templates Library Section */}
            <ErrorBoundary componentName="Templates Library Section">
              <TemplatesLibrarySection
                isSectionExpanded={isSectionExpanded}
                toggleSection={toggleSection}
                onTemplateSelect={(template) => {
                  setPreviewTemplate(template);
                  setIsPreviewOpen(true);
                }}
                isPreviewOpen={isPreviewOpen}
                setIsPreviewOpen={setIsPreviewOpen}
              />
            </ErrorBoundary>

            {/* Two-column layout for Recent Purchases and Live Classes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Purchases from Shopify */}
              <ErrorBoundary componentName="Purchases Section">
                <PurchasesSection
                  recentPurchases={recentPurchases}
                  isSectionExpanded={isSectionExpanded}
                  toggleSection={toggleSection}
                />
              </ErrorBoundary>

              {/* Live Classes */}
              <ErrorBoundary componentName="Live Classes Section">
                <LiveClassesSection
                  upcomingClasses={upcomingClasses}
                  isSectionExpanded={isSectionExpanded}
                  toggleSection={toggleSection}
                />
              </ErrorBoundary>
            </div>

            {/* Support and Community Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Support Section */}
              <ErrorBoundary componentName="Support Section">
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
              </ErrorBoundary>

              {/* Community Section */}
              <ErrorBoundary componentName="Community Section">
                <CommunitySection
                  communityPosts={communityPosts}
                  isSectionExpanded={isSectionExpanded}
                  toggleSection={toggleSection}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
