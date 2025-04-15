"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
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

// Dashboard store hooks
import {
  useEnrollmentsData,
  useCourseProgressData,
  useTemplatesData,
  useLiveClassesData,
  usePurchasesData,
  useUIState
} from "@/lib/hooks/use-dashboard-store"

// Import optimized hooks
import { useSectionExpansion } from "@/lib/hooks/use-section-expansion"
import { useUserProfile } from "@/lib/hooks/state/use-user-profile"
import { useCourseProgress } from "@/lib/hooks/state/use-course-progress"
import { useEnrollments } from "@/lib/hooks/state/use-enrollments"
import { useOptimizedUIState } from "@/lib/hooks/use-ui-state"
import { useLoadingStates } from "@/lib/hooks/use-loading-states"

// Import store
import { useStudentDashboardStore } from "@/lib/stores/student-dashboard"
import { getBrowserClient } from "@/lib/supabase/client"

// Import types
import type { CourseProgress } from "@/lib/stores/student-dashboard/types"
import type { DriveItem } from '@/lib/google-drive/driveApiUtils';

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

  // Use optimized hooks for better performance
  const { userId, isLoadingProfile, setUserId } = useUserProfile()

  // Use optimized loading states hook for better performance
  const {
    isLoadingEnrollments,
    isLoadingProgress,
    loadUserEnrollments,
    loadUserProgress
  } = useLoadingStates()

  // Use optimized UI state hook for better performance
  const {
    showWelcomeModal,
    showOnboarding,
    showAnnouncement,
    setShowWelcomeModal,
    setShowOnboarding,
    setShowAnnouncement
  } = useOptimizedUIState()

  // Use the optimized section expansion hook
  const { isSectionExpanded, toggleSection } = useSectionExpansion()

  // Local state
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // References for animations
  const containerRef = useRef(null)

  // Track data loading to prevent redundant API calls
  const dataLoadedRef = useRef(false)

  // Load initial data when user is available
  useEffect(() => {
    // Redirect to sign-in if user is not authenticated
    if (!isAuthLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    // Load data only if userId is available and not already loaded
    if (user?.id && !dataLoadedRef.current) {
      // Mark data as loaded to prevent redundant calls
      dataLoadedRef.current = true;

      // Set user ID in store
      setUserId(user.id);

      console.log('Loading dashboard data for user:', user.id);

      // Load enrollments and progress data in parallel
      Promise.all([
        loadUserEnrollments(user.id),
        loadUserProgress(user.id)
      ]).then(() => {
        console.log('Dashboard data loaded successfully');
        // Add debugging to see the current course progress after loading
        const currentState = useStudentDashboardStore.getState();
        const courseId = currentState.enrollments?.[0]?.course?.id;
        if (courseId) {
          console.log('Current course progress after loading:', {
            courseId,
            progress: currentState.courseProgress[courseId]
          });
        }
      }).catch(error => {
        console.error('Error loading dashboard data:', error);
        // Reset the ref if loading fails so we can retry
        dataLoadedRef.current = false;
      });
    }

    // Cleanup function to reset ref when component unmounts
    return () => {
      dataLoadedRef.current = false;
    };
  }, [
    user,
    isAuthLoading,
    router,
    setUserId,
    loadUserEnrollments,
    loadUserProgress
  ]);

  // Force refresh progress on every dashboard visit
  useEffect(() => {
    // Only run if user is authenticated and after initial data load
    if (user?.id && dataLoadedRef.current) {
      console.log('Refreshing course progress on dashboard visit');
      // Refresh progress data to ensure we have the latest
      loadUserProgress(user.id).then(() => {
        console.log('Course progress refreshed');

        // Add debugging to see the current course progress after loading
        const currentState = useStudentDashboardStore.getState();
        const courseId = currentState.enrollments?.[0]?.course?.id;
        if (courseId) {
          const progress = currentState.courseProgress[courseId];
          console.log('Current course progress after refresh:', {
            courseId,
            progress: progress?.progress || 0,
            completedLessons: progress?.completedLessonsCount || 0,
            totalLessons: progress?.totalLessonsCount || 0
          });

          // If we have a courseId but no progress data, try to fetch it directly from the database
          if (!progress || progress.progress === undefined) {
            console.log('No progress data found in store, fetching directly from database');
            const fetchProgressDirectly = async () => {
              const supabase = getBrowserClient();
              const { data, error } = await supabase
                .from('course_progress')
                .select('*')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .single();

              if (error) {
                console.error('Error fetching course progress:', error);
                return;
              }

              if (data) {
                console.log('Found course progress in database:', data);
                // Update the store with the database values
                useStudentDashboardStore.setState(state => {
                  const updatedCourseProgress = {
                    ...state.courseProgress
                  };

                  // If we don't have a progress object for this course, create one
                  if (!updatedCourseProgress[courseId]) {
                    updatedCourseProgress[courseId] = {
                      courseId,
                      progress: data.progress_percentage,
                      completedLessonsCount: 0, // We'll need to calculate this
                      totalLessonsCount: 0, // We'll need to calculate this
                      course: currentState.enrollments?.[0]?.course
                    };
                  } else {
                    // Update the existing progress object
                    updatedCourseProgress[courseId] = {
                      ...updatedCourseProgress[courseId],
                      progress: data.progress_percentage
                    };
                  }

                  return {
                    courseProgress: updatedCourseProgress
                  };
                });
              }
            };

            fetchProgressDirectly();
          }
        }
      });
    }
  }, [user?.id, loadUserProgress]);

  // Helper Functions
  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Format progress percentage - memoized to prevent recreation on each render
  const formatProgress = useCallback((value: number): string => {
    return `${Math.round(value)}%`
  }, [])

  // Helper function to calculate time spent - memoized
  const calculateTimeSpent = useCallback((progress: ExtendedCourseProgress | null): string => {
    if (!progress) return "0h 0m";
    // Calculate based on completed lessons (15 min per lesson)
    const minutes = (progress.completedLessonsCount || 0) * 15;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }, [])

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
  const handleFileSelect = (file: DriveItem) => {
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

  // Get enrollments data using selectors to subscribe to updates
  const enrollments = useStudentDashboardStore(state => state.enrollments || []);

  // Get course progress data using selectors to subscribe to updates
  const courseProgress = useStudentDashboardStore(state => state.courseProgress || {});

  // Get the course ID from the first enrollment
  // Using a direct selector to ensure it's always up-to-date
  const courseId = enrollments?.[0]?.course?.id || '';

  // Get the course progress from the store - memoized
  const currentCourseProgress = useMemo(() => {
    // Log all course progress for debugging
    console.log('All course progress in store:', courseProgress);

    const rawCourseProgress = courseProgress[courseId] || null;
    const course = enrollments?.[0]?.course;

    // Calculate total lessons from the course data if available
    let totalLessonsCount = 0;
    if (course?.modules) {
      course.modules.forEach(module => {
        if (module.lessons) {
          totalLessonsCount += module.lessons.length;
        }
      });
    }

    if (!rawCourseProgress) {
      // If no progress data, return a default object with the calculated total
      console.log('No progress data found for course:', courseId);

      // If we have a courseId but no progress, try to fetch it directly from the database
      if (courseId && user?.id) {
        console.log('Fetching progress directly from database for course:', courseId);
        const fetchProgressDirectly = async () => {
          const supabase = getBrowserClient();
          const { data, error } = await supabase
            .from('course_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          if (error) {
            console.error('Error fetching course progress:', error);
            return;
          }

          if (data) {
            console.log('Found course progress in database:', data);
            // Calculate completed lessons based on progress percentage
            const completedLessons = Math.round((data.progress_percentage / 100) * totalLessonsCount);

            // Update the store with the database values
            useStudentDashboardStore.setState(state => {
              const updatedCourseProgress = {
                ...state.courseProgress
              };

              updatedCourseProgress[courseId] = {
                courseId,
                progress: data.progress_percentage,
                completedLessonsCount: completedLessons,
                totalLessonsCount,
                course: enrollments?.[0]?.course
              };

              return {
                courseProgress: updatedCourseProgress
              };
            });
          }
        };

        fetchProgressDirectly();
      }

      return {
        progress: 0,
        completedLessonsCount: 0,
        totalLessonsCount: totalLessonsCount || 0,
      } as ExtendedCourseProgress;
    }

    console.log('Using existing progress data:', rawCourseProgress);
    return {
      ...rawCourseProgress,
      progress: rawCourseProgress.progress || 0,
      completedLessonsCount: rawCourseProgress.completedLessonsCount || 0,
      // Use the calculated total if available, otherwise fall back to the stored value
      totalLessonsCount: totalLessonsCount || rawCourseProgress.totalLessonsCount || 0,
    } as ExtendedCourseProgress;
  }, [courseProgress, courseId, enrollments, user?.id]);

  // Create a formatted version for the UI components - memoized
  const formattedCourseProgress = useMemo(() => {
    // Log the current course progress for debugging
    console.log('Formatting course progress:', {
      courseId,
      rawProgress: currentCourseProgress,
      progress: currentCourseProgress?.progress,
      completedLessonsCount: currentCourseProgress?.completedLessonsCount,
      totalLessonsCount: currentCourseProgress?.totalLessonsCount
    });

    return {
      title: enrollments?.[0]?.course?.title || "Papers to Profits",
      courseId: courseId,
      progress: currentCourseProgress?.progress || 0,
      completedLessons: currentCourseProgress?.completedLessonsCount || 0,
      totalLessons: currentCourseProgress?.totalLessonsCount || 0,
      nextLesson: "Continue Learning",
      timeSpent: calculateTimeSpent(currentCourseProgress),
      nextLiveClass: upcomingClasses?.[0] ? `${upcomingClasses[0].date} - ${upcomingClasses[0].time}` : "No upcoming classes",
      instructor: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
    };
  }, [enrollments, courseId, currentCourseProgress, upcomingClasses])

  // Helper function to calculate time spent is now defined above as a memoized function

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

  // Get the continue learning lesson from the store using a selector to subscribe to updates
  const continueLearningLesson = useStudentDashboardStore(state => state.continueLearningLesson);
  const isLoadingContinueLearningLesson = useStudentDashboardStore(state => state.isLoadingContinueLearningLesson);

  // Define extended course type with modules and lessons
  type ExtendedCourse = {
    id: string;
    title: string;
    modules?: Array<{
      id: string;
      title: string;
      order: number;
      lessons?: Array<{
        id: string;
        title: string;
        order: number;
        duration?: string;
      }>;
    }>;
  };

  // Get the first course and its modules/lessons - memoized
  const firstCourse = useMemo(() => {
    return enrollments?.[0]?.course as ExtendedCourse | undefined;
  }, [enrollments]);

  // Define module type to handle both cases
  type ModuleType = {
    id?: string;
    title: string;
    order?: number;
    lessons?: Array<{
      id: string;
      title: string;
      order?: number;
      duration?: string;
    }>;
  };

  // Get first module with proper typing - memoized
  const firstModule = useMemo(() => {
    return firstCourse?.modules?.[0] || { title: "Getting Started" } as ModuleType;
  }, [firstCourse]);

  // Get first lesson with fallback - memoized
  const firstLesson = useMemo(() => {
    return firstModule?.lessons?.[0] || {
      id: "1",
      title: "Introduction to Course",
      duration: "15 min"
    };
  }, [firstModule]);

  // Format the continue learning lesson data for the component - memoized
  const recentLessons = useMemo(() => {
    // If we're still loading, return an empty array to show loading state
    if (isLoadingContinueLearningLesson && !continueLearningLesson) {
      return [];
    }

    if (continueLearningLesson) {
      return [{
        id: parseInt(continueLearningLesson.lessonId) || 1,
        title: continueLearningLesson.lessonTitle,
        module: continueLearningLesson.moduleTitle,
        moduleId: continueLearningLesson.moduleId,
        duration: "15 min",
        thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson",
        progress: continueLearningLesson.progress,
        current: true,
      }];
    } else {
      // Only use fallback if we're not loading and there's no continue learning lesson
      return [{
        id: parseInt(firstLesson.id) || 1,
        title: firstLesson.title || "Introduction to Course",
        module: firstModule.title || "Getting Started",
        moduleId: firstModule.id,
        duration: firstLesson.duration || "15 min",
        thumbnail: "/placeholder.svg?height=120&width=200&text=Lesson+1",
        progress: 0,
        current: true,
      }];
    }
  }, [continueLearningLesson, isLoadingContinueLearningLesson, firstLesson, firstModule])

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
          courseProgress={{
            ...formattedCourseProgress,
            // Ensure courseId is always the latest value
            courseId: enrollments?.[0]?.course?.id || formattedCourseProgress.courseId || ''
          }}
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
