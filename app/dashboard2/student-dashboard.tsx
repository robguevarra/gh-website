"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import {
  Play,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Users,
  Video,
  Star,
  Zap,
  Award,
  TrendingUp,
  CheckCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentHeader } from "@/components/dashboard/student-header"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function StudentDashboard() {
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true)
  const [showAnnouncement, setShowAnnouncement] = useState(true)
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // References for animations
  const containerRef = useRef(null)

  // Hide welcome animation after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcomeAnimation(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  // Mock data for the student
  const student = {
    name: "Sarah Johnson",
    email: "sarah@example.com",
    avatar: "/placeholder.svg?height=40&width=40&text=SJ",
    joinedDate: "January 15, 2023",
    level: "Beginner",
    points: 450,
    badges: ["fast-learner", "community-contributor", "first-sale"],
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
    milestones: [
      { name: "Course Introduction", complete: true, percentage: 100 },
      { name: "Design Fundamentals", complete: true, percentage: 100 },
      { name: "Digital Product Creation", complete: false, percentage: 35 },
      { name: "Marketing & Sales", complete: false, percentage: 0 },
      { name: "Business Growth", complete: false, percentage: 0 },
    ]
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
    {
      id: 3,
      title: "Special Discount for Students",
      content: "Use code STUDENT20 to get 20% off on all commercial license templates in our shop.",
      date: "July 10, 2023",
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
      id: 1,
      name: "Digital Planner Template",
      type: "pdf",
      category: "planners",
      size: "2.4 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Planner",
      downloads: 1245,
      googleDriveId: "1abc123",
      featured: true,
      new: false,
    },
    {
      id: 2,
      name: "Journal Cover Design",
      type: "pdf",
      category: "journals",
      size: "1.8 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Journal",
      downloads: 987,
      googleDriveId: "2def456",
      featured: false,
      new: true,
    },
    {
      id: 3,
      name: "Weekly Schedule Template",
      type: "pdf",
      category: "planners",
      size: "1.2 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Schedule",
      downloads: 756,
      googleDriveId: "3ghi789",
      featured: false,
      new: true,
    },
    {
      id: 4,
      name: "Binding Guide",
      type: "pdf",
      category: "guides",
      size: "3.5 MB",
      thumbnail: "/placeholder.svg?height=80&width=120&text=Guide",
      downloads: 543,
      googleDriveId: "4jkl012",
      featured: false,
      new: false,
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
      attendees: 124,
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
      attendees: 98,
    },
    {
      id: 3,
      title: "Q&A Session: All About Paper Products Business",
      date: "August 3, 2023",
      time: "2:00 PM - 3:30 PM",
      host: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
      zoomLink: "https://zoom.us/j/567891234",
      attendees: 156,
    },
  ]

  // Mock data for community highlights
  const communityHighlights = [
    {
      id: 1,
      user: {
        name: "Emily Parker",
        avatar: "/placeholder.svg?height=40&width=40&text=EP",
      },
      content: "Just made my first sale on Etsy! Thank you Grace for all your guidance!",
      likes: 24,
      comments: 8,
      time: "2 hours ago",
    },
    {
      id: 2,
      user: {
        name: "Michael Thompson",
        avatar: "/placeholder.svg?height=40&width=40&text=MT",
      },
      content: "Anyone have tips for shipping internationally? I just got my first order from Canada!",
      likes: 18,
      comments: 12,
      time: "5 hours ago",
    },
    {
      id: 3,
      user: {
        name: "Jessica Williams",
        avatar: "/placeholder.svg?height=40&width=40&text=JW",
      },
      content: "Check out my new journal design! Used the techniques from Module 2 and I'm so happy with the results!",
      image: "/placeholder.svg?height=200&width=300&text=Journal+Design",
      likes: 45,
      comments: 16,
      time: "Yesterday",
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

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "reverse",
    },
  }

  // Filter templates based on active tab and search query
  const filteredTemplates = freeTemplates.filter((template) => {
    const matchesCategory = activeTemplateTab === "all" || template.category === activeTemplateTab
    const matchesSearch = searchQuery === "" || template.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white">
      <StudentHeader student={student} courseProgress={courseProgress} />

      <main ref={containerRef} className="pb-20">
        {/* Dashboard grid layout */}
        <div className="container px-4 py-8">
          {/* Welcome Banner for First-Time Users */}
          <motion.div 
            className="mb-8 bg-gradient-to-r from-brand-purple to-brand-pink rounded-2xl overflow-hidden shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="md:flex items-center">
              <div className="md:w-2/3 p-8 text-white">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <h1 className="text-3xl md:text-4xl font-serif mb-2">Welcome to Papers to Profits!</h1>
                  <p className="text-white/90 text-lg mb-6">Your journey to creating beautiful paper products that sell starts here.</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-white text-brand-purple hover:bg-white/90">
                      <Play className="mr-2 h-4 w-4" />
                      Start First Lesson
                    </Button>
                    <Button variant="outline" className="border-white text-white hover:bg-white/20">
                      <Calendar className="mr-2 h-4 w-4" />
                      Browse Live Classes
                    </Button>
                  </div>
                </motion.div>
              </div>
              <div className="hidden md:block md:w-1/3 relative h-full">
                <motion.div
                  className="absolute -right-20 -bottom-10"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Image
                    src="/placeholder.svg?height=300&width=300&text=Welcome"
                    alt="Welcome"
                    width={300}
                    height={300}
                    className="object-contain"
                  />
                </motion.div>
              </div>
            </div>
            
            {/* Quick Start Guide */}
            <div className="bg-white/10 backdrop-blur-sm border-t border-white/20 px-8 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-white font-medium">Quick Start Guide:</div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white mr-2">1</div>
                    <span className="text-white/90 text-sm">Complete your profile</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white mr-2">2</div>
                    <span className="text-white/90 text-sm">Watch the intro video</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white mr-2">3</div>
                    <span className="text-white/90 text-sm">Join the community</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Student Progress Overview */}
          <motion.div 
            className="mb-8"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="col-span-1 md:col-span-3 border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <BookOpen className="h-5 w-5 text-brand-purple mr-2" />
                      Your Learning Journey
                    </CardTitle>
                    <Link href="/dashboard/course" className="text-sm text-brand-purple hover:underline flex items-center">
                      View Full Course
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Course Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span className="text-lg font-medium text-[#5d4037] mr-2">{courseProgress.title}</span>
                          <Badge className="bg-brand-purple/20 text-brand-purple border-none">
                            {courseProgress.progress}% Complete
                          </Badge>
                        </div>
                        <span className="text-sm text-[#6d4c41]">
                          {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons completed
                        </span>
                      </div>
                      <Progress value={courseProgress.progress} className="h-2" />
                    </div>
                    
                    {/* Milestone Progress */}
                    <div className="grid grid-cols-5 gap-2">
                      {courseProgress.milestones.map((milestone, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            milestone.complete ? "bg-green-500 text-white" : 
                            milestone.percentage > 0 ? "bg-brand-purple/20 text-brand-purple" : 
                            "bg-gray-200 text-gray-400"
                          }`}>
                            {milestone.complete ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <span className="text-xs font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
                            <div 
                              className="h-1 bg-brand-purple rounded-full" 
                              style={{ width: `${milestone.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-center text-[#6d4c41] line-clamp-2">{milestone.name}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Continue Learning Section */}
                    <div className="bg-[#f9f6f2] rounded-xl p-4">
                      <h3 className="font-medium text-[#5d4037] mb-4 flex items-center">
                        <Zap className="h-5 w-5 text-brand-purple mr-2" />
                        Continue Where You Left Off
                      </h3>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/2">
                          <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                            <Image
                              src={recentLessons[0].thumbnail || "/placeholder.svg"}
                              alt={recentLessons[0].title}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <Play className="h-5 w-5 text-brand-purple ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {recentLessons[0].duration}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                              <div 
                                className="h-1 bg-brand-purple" 
                                style={{ width: `${recentLessons[0].progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <h4 className="font-medium text-[#5d4037] mb-1">{recentLessons[0].title}</h4>
                          <div className="flex items-center justify-between text-sm text-[#6d4c41]">
                            <span>{recentLessons[0].module}</span>
                            <span>{recentLessons[0].progress}% complete</span>
                          </div>
                          <Button className="w-full mt-3 bg-brand-purple hover:bg-brand-purple/90">
                            Continue Lesson
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                          <h3 className="font-medium text-[#5d4037] mb-3">Up Next</h3>
                          <div className="space-y-3">
                            {recentLessons.slice(1, 3).map((lesson) => (
                              <div key={lesson.id} className="flex gap-3">
                                <div className="relative w-20 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image
                                    src={lesson.thumbnail || "/placeholder.svg"}
                                    alt={lesson.title}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Play className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm text-[#5d4037] line-clamp-1">{lesson.title}</h4>
                                  <div className="flex items-center text-xs text-[#6d4c41] mt-1">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {lesson.duration}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-center">
                            <Link href="/dashboard/course" className="text-brand-purple hover:underline text-sm">
                              View all lessons
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Student Stats Card */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-brand-pink/10 to-brand-purple/10 pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Award className="h-5 w-5 text-brand-purple mr-2" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-3">
                      <Avatar className="h-20 w-20 border-4 border-brand-purple/20">
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback className="text-2xl">{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-brand-purple text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {student.level.charAt(0)}
                      </div>
                    </div>
                    <h3 className="font-medium text-[#5d4037]">{student.name}</h3>
                    <div className="text-sm text-[#6d4c41] mb-2">{student.level} Level</div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 mr-1" />
                      <span className="font-medium">{student.points} XP</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#5d4037] mb-2">Your Badges</h4>
                      <div className="flex justify-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-amber-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Fast Learner</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Community Contributor</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>First Sale</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-[#5d4037] mb-2">Next Live Class</h4>
                      <div className="bg-white rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4 text-brand-purple" />
                          <h4 className="font-medium text-sm">{upcomingClasses[0].title}</h4>
                        </div>
                        <div className="text-xs text-[#6d4c41] mb-3">
                          <p>{upcomingClasses[0].date}</p>
                          <p>{upcomingClasses[0].time}</p>
                        </div>
                        <Button size="sm" className="w-full bg-brand-purple hover:bg-brand-purple/90">
                          Join Zoom
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-\
