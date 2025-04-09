"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
  Play,
  BookOpen,
  Download,
  Calendar,
  Clock,
  MessageSquare,
  ArrowRight,
  FileText,
  ExternalLink,
  Info,
  Bell,
  X,
  ChevronRight,
  Users,
  Facebook,
  Mail,
  Video,
  Search,
  ShoppingBag,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { StudentHeader } from "@/components/dashboard/student-header"
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"

export default function StudentDashboard() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>("course")

  // References for animations
  const containerRef = useRef(null)

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
      downloads: 543,
      googleDriveId: "4jkl012",
    },
  ]

  // Mock data for recent purchases
  const recentPurchases = [
    {
      id: "ORD-1234",
      date: "July 14, 2023",
      items: [
        {
          name: "Commercial License - Digital Planner Bundle",
          price: 4999,
          image: "/placeholder.svg?height=60&width=60&text=Bundle",
        },
      ],
      total: 4999,
      status: "completed",
    },
    {
      id: "ORD-1235",
      date: "June 28, 2023",
      items: [
        {
          name: "Commercial License - Journal Template",
          price: 2999,
          image: "/placeholder.svg?height=60&width=60&text=Journal",
        },
      ],
      total: 2999,
      status: "completed",
    },
  ]

  // Mock data for upcoming live classes
  const upcomingClasses = [
    {
      id: 1,
      title: "How to Price Your Products for Profit",
      date: "July 20, 2023",
      time: "2:00 PM - 3:30 PM",
      host: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
      zoomLink: "https://zoom.us/j/123456789",
    },
    {
      id: 2,
      title: "Marketing Your Paper Products",
      date: "July 27, 2023",
      time: "2:00 PM - 3:30 PM",
      host: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
      zoomLink: "https://zoom.us/j/987654321",
    },
  ]

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  // Filter templates based on active tab and search query
  const filteredTemplates = freeTemplates.filter((template) => {
    const matchesCategory = activeTemplateTab === "all" || template.category === activeTemplateTab
    const matchesSearch = searchQuery === "" || template.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
  }

  // Get selected template
  const getSelectedTemplate = () => {
    return freeTemplates.find((template) => template.id === selectedTemplate) || freeTemplates[0]
  }

  return (
    <div className="min-h-screen bg-[#f9f6f2]">
      <StudentHeader student={student} courseProgress={courseProgress} />

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
                  <div className="text-lg font-bold text-[#5d4037]">{courseProgress.progress}%</div>
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
            <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                {/* Section Header - Mobile Toggle */}
                <div
                  className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleSection("course")}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-purple/10 rounded-full p-2">
                      <BookOpen className="h-5 w-5 text-brand-purple" />
                    </div>
                    <h2 className="text-lg font-medium text-[#5d4037]">Continue Learning</h2>
                  </div>
                  {isSectionExpanded("course") ? (
                    <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                  )}
                </div>

                {/* Section Content */}
                <div className={`${isSectionExpanded("course") ? "block" : "hidden"} md:block`}>
                  <div className="p-6 pt-0 md:pt-6">
                    <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                      <div className="flex items-center gap-2">
                        <div className="bg-brand-purple/10 rounded-full p-2">
                          <BookOpen className="h-5 w-5 text-brand-purple" />
                        </div>
                        <h2 className="text-xl font-medium text-[#5d4037]">Continue Learning</h2>
                      </div>
                      <Link
                        href="/dashboard/course"
                        className="text-brand-purple hover:underline text-sm flex items-center"
                      >
                        View All Lessons
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    <div className="space-y-6">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#5d4037]">{courseProgress.title}</span>
                            <Badge className="bg-brand-purple/10 text-brand-purple border-brand-purple/20">
                              {courseProgress.progress}%
                            </Badge>
                          </div>
                          <span className="text-xs text-[#6d4c41]">
                            {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-purple to-brand-pink rounded-full"
                            style={{ width: `${courseProgress.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Current Lesson */}
                      <div className="bg-gradient-to-r from-brand-purple/5 to-brand-pink/5 rounded-xl p-5 border border-brand-purple/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-brand-purple" />
                          <h3 className="text-sm font-medium text-brand-purple">Pick up where you left off</h3>
                        </div>

                        <div className="flex gap-4 mt-3">
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={recentLessons[0].thumbnail || "/placeholder.svg"}
                              alt={recentLessons[0].title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-[#5d4037] line-clamp-1">{recentLessons[0].title}</h4>
                            <div className="flex items-center text-xs text-[#6d4c41] mt-1">
                              <span className="bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full">
                                {recentLessons[0].module}
                              </span>
                              <span className="mx-2">•</span>
                              <Clock className="h-3 w-3 mr-1" />
                              {recentLessons[0].duration}
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-[#6d4c41]">Progress</span>
                                <span className="text-xs font-medium">{recentLessons[0].progress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-purple rounded-full"
                                  style={{ width: `${recentLessons[0].progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <Button className="w-full bg-brand-purple hover:bg-brand-purple/90">
                            Continue Lesson
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Next Live Class */}
                      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Video className="h-4 w-4 text-brand-pink" />
                          <h3 className="text-sm font-medium text-[#5d4037]">Next Live Class</h3>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-[#5d4037]">{upcomingClasses[0].title}</h4>
                            <div className="text-xs text-[#6d4c41] mt-1">
                              <p>{upcomingClasses[0].date}</p>
                              <p>{upcomingClasses[0].time}</p>
                            </div>
                          </div>
                          <Button size="sm" className="bg-brand-pink hover:bg-brand-pink/90">
                            Join Zoom
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t text-center md:hidden">
                      <Link
                        href="/dashboard/course"
                        className="text-brand-purple hover:underline text-sm flex items-center justify-center"
                      >
                        View All Lessons
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Templates Library Section */}
            <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.1 }}>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                {/* Section Header - Mobile Toggle */}
                <div
                  className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleSection("templates")}
                >
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-blue/10 rounded-full p-2">
                      <Download className="h-5 w-5 text-brand-blue" />
                    </div>
                    <h2 className="text-lg font-medium text-[#5d4037]">Free Templates</h2>
                  </div>
                  {isSectionExpanded("templates") ? (
                    <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                  )}
                </div>

                {/* Section Content */}
                <div className={`${isSectionExpanded("templates") ? "block" : "hidden"} md:block`}>
                  <div className="p-6 pt-0 md:pt-6">
                    <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                      <div className="flex items-center gap-2">
                        <div className="bg-brand-blue/10 rounded-full p-2">
                          <Download className="h-5 w-5 text-brand-blue" />
                        </div>
                        <h2 className="text-xl font-medium text-[#5d4037]">Free Templates</h2>
                      </div>
                      <Link
                        href="/dashboard/templates"
                        className="text-brand-blue hover:underline text-sm flex items-center"
                      >
                        View All Templates
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {/* Search and Filter */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Search templates..."
                            className="pl-8 bg-white border-gray-200 focus:border-brand-blue transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Tabs
                          defaultValue="all"
                          value={activeTemplateTab}
                          onValueChange={(value) => setActiveTemplateTab(value)}
                          className="w-full sm:w-auto"
                        >
                          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                            <TabsTrigger value="all" className="text-xs">
                              All
                            </TabsTrigger>
                            <TabsTrigger value="planners" className="text-xs">
                              Planners
                            </TabsTrigger>
                            <TabsTrigger value="journals" className="text-xs">
                              Journals
                            </TabsTrigger>
                            <TabsTrigger value="guides" className="text-xs">
                              Guides
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Templates Grid with Preview */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Templates List */}
                        <div className="lg:col-span-1 space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {filteredTemplates.map((template) => (
                            <div
                              key={template.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                selectedTemplate === template.id
                                  ? "border-brand-blue bg-brand-blue/5"
                                  : "border-gray-100 bg-white hover:border-gray-200"
                              } transition-all duration-200 cursor-pointer`}
                              onClick={() => handleTemplateSelect(template.id)}
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={template.thumbnail || "/placeholder.svg"}
                                  alt={template.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-[#5d4037] truncate">{template.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-[#6d4c41]">
                                  <span className="uppercase">{template.type}</span>
                                  <span>•</span>
                                  <span>{template.size}</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="flex-shrink-0">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          {filteredTemplates.length === 0 && (
                            <div className="text-center py-8 text-[#6d4c41]">
                              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                              <p>No templates found</p>
                            </div>
                          )}
                        </div>

                        {/* Template Preview */}
                        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
                            <div className="font-medium text-sm text-[#5d4037]">{getSelectedTemplate()?.name}</div>
                            <Button size="sm" variant="outline" className="h-8">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                          <GoogleDriveViewer fileId={getSelectedTemplate()?.googleDriveId || ""} height="300px" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t text-center md:hidden">
                      <Link
                        href="/dashboard/templates"
                        className="text-brand-blue hover:underline text-sm flex items-center justify-center"
                      >
                        View All Templates
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Two-column layout for Recent Purchases and Live Classes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Purchases from Shopify */}
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.2 }}>
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 h-full">
                  {/* Section Header - Mobile Toggle */}
                  <div
                    className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleSection("purchases")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 rounded-full p-2">
                        <ShoppingBag className="h-5 w-5 text-green-600" />
                      </div>
                      <h2 className="text-lg font-medium text-[#5d4037]">Recent Purchases</h2>
                    </div>
                    {isSectionExpanded("purchases") ? (
                      <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                    )}
                  </div>

                  {/* Section Content */}
                  <div className={`${isSectionExpanded("purchases") ? "block" : "hidden"} md:block`}>
                    <div className="p-6 pt-0 md:pt-6">
                      <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 rounded-full p-2">
                            <ShoppingBag className="h-5 w-5 text-green-600" />
                          </div>
                          <h2 className="text-xl font-medium text-[#5d4037]">Recent Purchases</h2>
                        </div>
                        <Link
                          href="https://gracefulhomeschooling.myshopify.com"
                          target="_blank"
                          className="text-green-600 hover:underline text-sm flex items-center"
                        >
                          Visit Shop
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </div>

                      {recentPurchases.length > 0 ? (
                        <div className="space-y-4">
                          {recentPurchases.map((purchase) => (
                            <div key={purchase.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">Order #{purchase.id}</div>
                                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                  {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">{purchase.date}</div>

                              <div className="space-y-2">
                                {purchase.items.map((item, index) => (
                                  <div key={index} className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-md overflow-hidden relative flex-shrink-0">
                                      <Image
                                        src={item.image || "/placeholder.svg"}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm line-clamp-1">{item.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        ₱{(item.price / 100).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="font-medium">Total: ₱{(purchase.total / 100).toFixed(2)}</div>
                                <Button variant="outline" size="sm" className="text-xs">
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">No purchases yet</p>
                          <Button variant="outline" className="mt-4" asChild>
                            <Link href="https://gracefulhomeschooling.myshopify.com" target="_blank">
                              Browse Shop
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t text-center md:hidden">
                        <Link
                          href="https://gracefulhomeschooling.myshopify.com"
                          target="_blank"
                          className="text-green-600 hover:underline text-sm flex items-center justify-center"
                        >
                          Visit Shop
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Live Class Schedule */}
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.3 }}>
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 h-full">
                  {/* Section Header - Mobile Toggle */}
                  <div
                    className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleSection("classes")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-brand-pink/10 rounded-full p-2">
                        <Calendar className="h-5 w-5 text-brand-pink" />
                      </div>
                      <h2 className="text-lg font-medium text-[#5d4037]">Live Classes</h2>
                    </div>
                    {isSectionExpanded("classes") ? (
                      <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                    )}
                  </div>

                  {/* Section Content */}
                  <div className={`${isSectionExpanded("classes") ? "block" : "hidden"} md:block`}>
                    <div className="p-6 pt-0 md:pt-6">
                      <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                        <div className="flex items-center gap-2">
                          <div className="bg-brand-pink/10 rounded-full p-2">
                            <Calendar className="h-5 w-5 text-brand-pink" />
                          </div>
                          <h2 className="text-xl font-medium text-[#5d4037]">Live Classes</h2>
                        </div>
                        <Link
                          href="/dashboard/live-classes"
                          className="text-brand-pink hover:underline text-sm flex items-center"
                        >
                          View Schedule
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>

                      <div className="space-y-4">
                        {upcomingClasses.map((liveClass) => (
                          <div
                            key={liveClass.id}
                            className="p-4 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow"
                          >
                            <h4 className="font-medium text-[#5d4037] mb-2">{liveClass.title}</h4>
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs text-[#6d4c41]">
                                <p>{liveClass.date}</p>
                                <p>{liveClass.time}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={liveClass.host.avatar} alt={liveClass.host.name} />
                                  <AvatarFallback>{liveClass.host.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-[#6d4c41]">{liveClass.host.name}</span>
                              </div>
                            </div>
                            <Button size="sm" className="w-full bg-brand-pink hover:bg-brand-pink/90">
                              Add to Calendar
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t text-center md:hidden">
                        <Link
                          href="/dashboard/live-classes"
                          className="text-brand-pink hover:underline text-sm flex items-center justify-center"
                        >
                          View Schedule
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Support and Community Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Support Section */}
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.4 }}>
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  {/* Section Header - Mobile Toggle */}
                  <div
                    className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleSection("support")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 rounded-full p-2">
                        <HelpCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <h2 className="text-lg font-medium text-[#5d4037]">Support & Help</h2>
                    </div>
                    {isSectionExpanded("support") ? (
                      <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                    )}
                  </div>

                  {/* Section Content */}
                  <div className={`${isSectionExpanded("support") ? "block" : "hidden"} md:block`}>
                    <div className="p-6 pt-0 md:pt-6">
                      <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-100 rounded-full p-2">
                            <HelpCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <h2 className="text-xl font-medium text-[#5d4037]">Support & Help</h2>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg p-5 border border-amber-100/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            <h3 className="text-sm font-medium text-[#5d4037]">Need Help?</h3>
                          </div>

                          <p className="text-sm text-[#6d4c41] mb-4">
                            We're here to help you with any questions about the course or your paper products business.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button className="bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email Support
                            </Button>
                            <Button
                              variant="outline"
                              className="border-amber-600 text-amber-600 hover:bg-amber-50 flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Live Chat
                            </Button>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-[#5d4037] mb-2">Common Questions</h3>
                          <div className="space-y-2">
                            <div className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-amber-600" />
                                <h4 className="font-medium text-sm">How do I access my templates?</h4>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-amber-600" />
                                <h4 className="font-medium text-sm">Can I sell products made with the templates?</h4>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-amber-600" />
                                <h4 className="font-medium text-sm">How do I join the live classes?</h4>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Community Section */}
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.5 }}>
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  {/* Section Header - Mobile Toggle */}
                  <div
                    className="md:hidden flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleSection("community")}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-[#1877F2]/10 rounded-full p-2">
                        <Users className="h-5 w-5 text-[#1877F2]" />
                      </div>
                      <h2 className="text-lg font-medium text-[#5d4037]">Community</h2>
                    </div>
                    {isSectionExpanded("community") ? (
                      <ChevronUp className="h-5 w-5 text-[#6d4c41]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#6d4c41]" />
                    )}
                  </div>

                  {/* Section Content */}
                  <div className={`${isSectionExpanded("community") ? "block" : "hidden"} md:block`}>
                    <div className="p-6 pt-0 md:pt-6">
                      <div className="md:flex md:items-center md:justify-between mb-6 hidden">
                        <div className="flex items-center gap-2">
                          <div className="bg-[#1877F2]/10 rounded-full p-2">
                            <Users className="h-5 w-5 text-[#1877F2]" />
                          </div>
                          <h2 className="text-xl font-medium text-[#5d4037]">Community</h2>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-[#1877F2]/5 to-[#1877F2]/10 rounded-lg p-5 border border-[#1877F2]/10 flex items-center gap-4">
                          <div className="bg-[#1877F2] rounded-full p-3">
                            <Facebook className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-[#5d4037]">Join Our Facebook Community</h3>
                            <p className="text-sm text-[#6d4c41]">
                              Connect with other students, share your progress, and get inspired!
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                          <h3 className="font-medium text-[#5d4037] mb-3">Community Highlights</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder.svg?height=40&width=40&text=EP" alt="Emily Parker" />
                                <AvatarFallback>EP</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Emily Parker</div>
                                <p className="text-xs text-[#6d4c41] line-clamp-1">
                                  Just made my first sale on Etsy! Thank you Grace for all your guidance!
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src="/placeholder.svg?height=40&width=40&text=MT" alt="Michael Thompson" />
                                <AvatarFallback>MT</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium text-sm">Michael Thompson</div>
                                <p className="text-xs text-[#6d4c41] line-clamp-1">
                                  Anyone have tips for shipping internationally? I just got my first order from Canada!
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90">
                          <Facebook className="h-4 w-4 mr-2" />
                          Join Facebook Group
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
