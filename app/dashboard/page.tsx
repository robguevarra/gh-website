"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation"
import { format } from 'date-fns'; // Added for date formatting

import { 
  hasSeenWelcomeModal, 
  markWelcomeModalShown, 
  hasSeenOnboardingTour, 
  markOnboardingTourShown,
  getDashboardUIPreferences
} from '@/lib/utils/user-preferences'

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
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { TemplatePreviewModal } from "@/components/dashboard/template-preview-modal"
import { AffiliateApplicationWizard } from "@/components/dashboard/affiliate-application-wizard"

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

// Import types
import type { CourseProgress } from "@/lib/stores/student-dashboard/types"
import type { DriveItem } from '@/lib/google-drive/driveApiUtils';
import type { Purchase as StorePurchase, PurchaseItem as StorePurchaseItem } from "@/lib/services/purchaseHistory";
import type { Purchase, PurchaseItem } from "@/components/dashboard/purchases-section";
import type { Database } from '@/types/supabase'; // Added for Announcement type

// Define interface for lesson progress tracking
interface LessonProgress {
  [lessonId: string]: string | { status: string; progress: number; lastPosition: number };
}

// Define extended CourseProgress interface to include the properties we need
interface ExtendedCourseProgress extends CourseProgress {
  progress: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  totalDurationSeconds?: number; // Total duration of all completed lessons in seconds
  lessonProgress?: LessonProgress; // Track progress for individual lessons
}

// Define proper lesson type to match the actual structure
interface CourseLesson {
  id: string;
  title: string;
  module_id: string;
  videoDuration?: number;
  duration?: number;
  metadata?: {
    duration?: number;
    durationUnit?: string;
    videoType?: string;
  };
  [key: string]: any; // For other properties that might be present
}

// Define Announcement type based on Supabase schema
type Announcement = Database['public']['Tables']['announcements']['Row'];

// Storage key for permanent affiliate banner dismissal
const AFFILIATE_CONGRATULATIONS_DISMISSED_KEY = 'gh_affiliate_congratulations_dismissed'

/**
 * Check if congratulations banner should be permanently dismissed for approved affiliates
 */
function isAffiliateCongratulationsDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AFFILIATE_CONGRATULATIONS_DISMISSED_KEY) === 'true'
}

/**
 * Mark congratulations banner as permanently dismissed
 */
function markAffiliateCongratulationsDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AFFILIATE_CONGRATULATIONS_DISMISSED_KEY, 'true')
}

// Dashboard Section components
import { CourseProgressSection } from "@/components/dashboard/course-progress-section"
import { LiveClassesSection, type LiveClass } from "@/components/dashboard/live-classes-section" // Added LiveClass import
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();

  // Use optimized hooks for better performance
  const { userId, isLoadingProfile, setUserId } = useUserProfile()

  // Use optimized loading states hook for better performance
  const {
    isLoadingEnrollments,
    isLoadingProgress
  } = useLoadingStates()

  // Use optimized UI state hook for better performance
  const {
    showAnnouncement,
    setShowAnnouncement
  } = useOptimizedUIState()

  // Use the optimized section expansion hook
  const { isSectionExpanded, toggleSection } = useSectionExpansion()

  // Get the master load function from the store
  const loadUserDashboardData = useStudentDashboardStore((state) => state.loadUserDashboardData);

  // Local state
  const [activeTemplateTab, setActiveTemplateTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]); // Added state for live announcements
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0); // Track current announcement in carousel
  const [showPortalSwitcher, setShowPortalSwitcher] = useState(false);
  const [showAffiliateWizard, setShowAffiliateWizard] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateStatus, setAffiliateStatus] = useState<string | null>(null);
  const [isAffiliateBannerDismissed, setIsAffiliateBannerDismissed] = useState(false);
  const [affiliateStatusLoaded, setAffiliateStatusLoaded] = useState(false);

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

      // Load ALL dashboard data including purchases
      loadUserDashboardData(user.id).then(() => {
        // Dashboard data loaded successfully
      }).catch(error => {
        console.error('[Dashboard] Error loading dashboard data:', error);
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
    loadUserDashboardData
  ]);

  // Add focus listener to refresh data when tab becomes visible
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when the window gains focus
      // Use the loadUserDashboardData action, which now contains staleness logic
      if (user?.id) {
        // Call the function retrieved outside the effect
        loadUserDashboardData(user.id, true); // Pass true to indicate a refresh check
      }
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup: remove listener when component unmounts
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, loadUserDashboardData]); // Depend on user ID and the load function



  // Fetch live announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements?limit=5'); // Fetch a few, sorted by publish_date desc by default
        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }
        const responseData = await response.json(); // Get the full response object
        const announcementsArray: Announcement[] = responseData.data || []; // Extract the array from the 'data' property
        
        setLiveAnnouncements(announcementsArray);
        setCurrentAnnouncementIndex(0); // Reset to first announcement
        if (announcementsArray.length > 0) {
          setShowAnnouncement(true); // Show section if there are announcements
        } else {
          setShowAnnouncement(false);
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
        setShowAnnouncement(false); // Hide section on error
      }
    };

    if (user?.id) { // Only fetch if user is available
      fetchAnnouncements();
    }
  }, [user?.id, setShowAnnouncement]);

  // Effect to check for portal switcher query param
  useEffect(() => {
    if (searchParams.get('choosePortal') === 'true') {
      setShowPortalSwitcher(true);
    }
  }, [searchParams]);
  
  // Carousel effect for announcements
  useEffect(() => {
    // Only set up carousel if there are multiple announcements
    if (liveAnnouncements.length <= 1) return;
    
    // Set up interval to rotate announcements every 8 seconds
    const carouselInterval = setInterval(() => {
      setCurrentAnnouncementIndex(prevIndex => {
        // Cycle to the next announcement, loop back to beginning if at the end
        return (prevIndex + 1) % liveAnnouncements.length;
      });
    }, 8000); // 8 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(carouselInterval);
  }, [liveAnnouncements.length]);

  // Prepare live class data from announcements
  const upcomingLiveClasses: LiveClass[] = useMemo(() => {
    return liveAnnouncements
      .filter(ann => ann.type === 'live_class')
      .sort((a, b) => {
        // Sort by publish_date (ascending) to get the earliest upcoming class first
        if (!a.publish_date) return 1;
        if (!b.publish_date) return -1;
        return new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime();
      })
      .map(ann => ({
        id: ann.id, // id is already a string (uuid)
        title: ann.title || 'Live Class Event',
        date: ann.publish_date ? format(new Date(ann.publish_date), 'MMMM d, yyyy') : 'Date TBD',
        time: ann.publish_date ? format(new Date(ann.publish_date), 'p') : 'Time TBD',
        host: {
          name: ann.host_name || 'TBD',
          avatar: ann.host_avatar_url || '/placeholder.svg?height=40&width=40&text=H',
        },
        zoomLink: ann.link_url || '#',
      }));
  }, [liveAnnouncements]);
  
  // Get the earliest upcoming live class
  const nextLiveClass = useMemo(() => {
    return upcomingLiveClasses.length > 0 ? upcomingLiveClasses[0] : null;
  }, [upcomingLiveClasses]);

  const handlePortalChoice = (path: string) => {
    setShowPortalSwitcher(false);
    // Use replace to remove query param from history and avoid back button issues
    router.replace(path, { scroll: false }); 
  };

  // If portal switcher is active, render it and nothing else for the dashboard
  if (showPortalSwitcher) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-background p-6 sm:p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border border-border"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">Choose Your Portal</h2>
          <p className="mb-6 sm:mb-8 text-muted-foreground text-sm sm:text-base">
            Welcome! You have access to multiple areas. Please select where you'd like to go:
          </p>
          <div className="space-y-3 sm:space-y-4">
            <Button 
              onClick={() => handlePortalChoice('/dashboard')}
              className="w-full bg-brand-primary hover:bg-brand-primary-dark text-primary-foreground text-base sm:text-lg py-3 h-auto"
            >
              <Users className="mr-2 h-5 w-5" /> Student Dashboard
            </Button>
            <Button 
              onClick={() => router.push('/affiliate-portal')} 
              variant="outline"
              className="w-full text-base sm:text-lg py-3 h-auto border-brand-secondary text-brand-secondary hover:bg-brand-secondary/10"
            >
              <Sparkles className="mr-2 h-5 w-5" /> Affiliate Portal
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Helper Functions
  function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Format progress percentage - memoized to prevent recreation on each render
  const formatProgress = useCallback((value: number): string => {
    return `${Math.round(value)}%`
  }, [])

  // Helper function to calculate time spent - memoized
  // Helper function to format time spent - directly used now
  const formatTimeSpent = useCallback((totalSeconds: number): string => {
    // Convert seconds to hours and minutes
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  }, []);
  
  // Original function - kept for compatibility but not used now
  const calculateTimeSpent = useCallback((progress: ExtendedCourseProgress | null): string => {
    if (!progress) return "0h 0m";
    
    // Use the actual duration from lesson metadata if available
    // Fall back to an estimate based on completed lessons if totalDurationSeconds isn't available yet
    let totalSeconds = 0;
    
    if (typeof progress.totalDurationSeconds === 'number') {
      totalSeconds = progress.totalDurationSeconds;
    } else {
      // Fall back to an estimate based on average lesson duration (still better than fixed 15min)
      totalSeconds = (progress.completedLessonsCount || 0) * (60 * 15); // 15 minutes per lesson in seconds
    }
    
    return formatTimeSpent(totalSeconds);
  }, [formatTimeSpent])

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

  // Get enrollments data using selectors to subscribe to updates
  const enrollments = useStudentDashboardStore(state => state.enrollments || []);

  // Get course progress data using selectors to subscribe to updates
  const courseProgress = useStudentDashboardStore(state => state.courseProgress || {});

  // Get the course ID from the first enrollment
  // Using a direct selector to ensure it's always up-to-date
  const courseId = enrollments?.[0]?.course?.id || '';

  // Get the course progress from the store - memoized
  const currentCourseProgress = useMemo(() => {
    // Progress data is now properly loaded from the store

    const rawCourseProgress = courseProgress[courseId] || null;
    const course = enrollments?.[0]?.course;

    // Calculate total lessons from the course data if available
    let totalLessonsCount = 0;
    let totalDurationSeconds = 0;
    
    // Map to store all completed lessons by ID for quick lookup
    const completedLessonIds = new Set();
    
    // Get completed lesson IDs from the progress data
    const lessonProgress = (rawCourseProgress as any)?.lessonProgress;
    
    if (lessonProgress) {
      Object.entries(lessonProgress).forEach(([lessonId, statusData]) => {
        // Handle both string status and object with status property
        let status: string | undefined;
        if (typeof statusData === 'string') {
          status = statusData;
        } else if (statusData && typeof statusData === 'object') {
          status = (statusData as {status?: string}).status;
        }
        
        if (status === 'completed') {
          completedLessonIds.add(lessonId);
        }
      });
    }
    
    // Process course structure to count lessons and sum durations
    
    if (course?.modules) {
      course.modules.forEach(module => {
        if (module.lessons) {
          totalLessonsCount += module.lessons.length;
          
          // Sum up durations for completed lessons
          module.lessons.forEach((lesson: CourseLesson) => {
            // Only count completed lessons
            if (completedLessonIds.has(lesson.id)) {
              // Get duration from different sources with proper priority
              let lessonDuration = 0;
              
              if (typeof lesson.videoDuration === 'number') {
                // Video duration from Vimeo is in seconds
                lessonDuration = lesson.videoDuration;
              } else if (lesson.metadata?.duration) {
                // Check if metadata duration needs conversion from minutes to seconds
                if (lesson.metadata.duration < 60 && !lesson.metadata.durationUnit) {
                  // Small numbers likely represent minutes, convert to seconds
                  lessonDuration = lesson.metadata.duration * 60;
                } else {
                  // Otherwise assume it's already in seconds
                  lessonDuration = lesson.metadata.duration;
                }
              } else if (typeof lesson.duration === 'number') {
                // Fallback to basic duration property
                lessonDuration = lesson.duration;
              }
              
              // Add to total
              totalDurationSeconds += lessonDuration;
            }
          });
        }
      });
    }
    

    if (!rawCourseProgress) {
      // If no progress data from store, return a default object
      return {
        progress: 0,
        completedLessonsCount: 0,
        totalLessonsCount: totalLessonsCount || 0, // Use calculated total if available
        totalDurationSeconds: 0, // No completed lessons, so duration is 0
      } as ExtendedCourseProgress;
    }

    // Using existing progress data from the store

    return {
      ...rawCourseProgress,
      progress: rawCourseProgress.progress || 0,
      completedLessonsCount: rawCourseProgress.completedLessonsCount || 0,
      // Use the calculated total if available, otherwise fall back to the stored value
      totalLessonsCount: totalLessonsCount || rawCourseProgress.totalLessonsCount || 0,
      // Add the total duration in seconds
      totalDurationSeconds, 
    } as ExtendedCourseProgress;
  }, [courseProgress, courseId, enrollments]);

  // Directly access the lesson progress data from store for accurate calculations
  const lessonProgressData = useStudentDashboardStore(state => state.lessonProgress || {});
  
  // Create a formatted version for the UI components - memoized
  const formattedCourseProgress = useMemo(() => {
    // Calculate both total course duration and completed lesson duration
    let totalCourseDurationSeconds = 0; // Total duration of ALL lessons
    let completedDurationSeconds = 0;   // Duration of only completed lessons
    const completedLessonIds = new Set<string>();
    
    // First identify completed lessons from the progress data
    Object.entries(lessonProgressData).forEach(([lessonId, progressData]) => {
      // Check if the lesson is marked as completed
      if (progressData && typeof progressData === 'object' && progressData.status === 'completed') {
        completedLessonIds.add(lessonId);
      }
    });
    
    
    // Now calculate duration for both total course and completed lessons
    if (enrollments?.[0]?.course?.modules) {
      enrollments[0].course.modules.forEach(module => {
        if (module.lessons) {
          module.lessons.forEach((lesson: any) => {
            let lessonDuration = 0;
            
            // Extract lesson duration from different sources with proper priority
            if (typeof lesson.videoDuration === 'number') {
              // Video duration from Vimeo is in seconds
              lessonDuration = lesson.videoDuration;
            } else if (lesson.metadata?.duration) {
              // Check if metadata duration needs conversion from minutes to seconds
              if (lesson.metadata.duration < 60 && !lesson.metadata.durationUnit) {
                // Small numbers likely represent minutes, convert to seconds
                lessonDuration = lesson.metadata.duration * 60;
              } else {
                // Otherwise assume it's already in seconds
                lessonDuration = lesson.metadata.duration;
              }
            } else if (typeof lesson.duration === 'number') {
              // Fallback to basic duration property
              lessonDuration = lesson.duration;
            }
            
            // Add to total course duration (all lessons)
            totalCourseDurationSeconds += lessonDuration;
            
            // Only add to completed duration if the lesson is completed
            if (completedLessonIds.has(lesson.id)) {
              completedDurationSeconds += lessonDuration;
            }
          });
        }
      });
    }
    
    // Format course progress data for UI components
    return {
      title: enrollments?.[0]?.course?.title || "Papers to Profits",
      courseId: courseId,
      progress: currentCourseProgress?.progress || 0,
      completedLessons: currentCourseProgress?.completedLessonsCount || 0,
      totalLessons: currentCourseProgress?.totalLessonsCount || 0,
      nextLesson: "Continue Learning",
      // Use our directly calculated duration instead of the helper function
      timeSpent: formatTimeSpent(completedDurationSeconds),
      // Store both duration values for use in course progress section
      totalCourseDuration: totalCourseDurationSeconds,
      nextLiveClass: upcomingLiveClasses?.[0] ? `${upcomingLiveClasses[0].date} - ${upcomingLiveClasses[0].time}` : "No upcoming classes",
      instructor: {
        name: "Grace Guevarra",
        avatar: "/placeholder.svg?height=40&width=40&text=GG",
      },
    };
  }, [enrollments, courseId, currentCourseProgress, upcomingLiveClasses, lessonProgressData])

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
        duration: "15 min", // Assuming a default or fetched duration
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

  // Get purchase data from the store using the hook
  const { 
    purchases, 
    isLoadingPurchases, 
    hasPurchasesError
  } = usePurchasesData()
  
  // Transform the store purchase type to the format expected by PurchasesSection
  const mapStorePurchasesToUIFormat = useCallback((storePurchases: StorePurchase[]): Purchase[] => {
    return storePurchases.map(purchase => {
      // Create properly mapped purchase item objects that include both required properties
      // Use type assertion to ensure compatibility with both database and UI types
      const mappedItems = purchase.items.map(item => {
        const mappedItem = {
          // Include required PurchaseItem properties
          id: item.id,
          product_id: item.product_id,
          title: item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
          image_url: item.image_url,
          google_drive_file_id: item.google_drive_file_id,
          source: item.source,
          
          // Include UI-specific properties
          name: item.title || 'Product',
          price: item.price_at_purchase,
          image: item.image_url || `/placeholder.svg?height=60&width=60&text=${item.title?.charAt(0) || 'P'}`,
          googleDriveId: item.google_drive_file_id || null
        };
        
        return mappedItem as PurchaseItem; // Type assertion to ensure compatibility
      });
      
      // Return properly typed Purchase object with type assertion to ensure compatibility
      const result = {
        // Include required Purchase properties
        id: purchase.id,
        order_number: purchase.order_number,
        created_at: purchase.created_at,
        order_status: purchase.order_status,
        total_amount: purchase.total_amount,
        currency: purchase.currency,
        source: purchase.source,
        items: mappedItems,
        
        // Include UI-specific properties
        date: new Date(purchase.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        status: purchase.order_status || 'completed',
        total: purchase.total_amount ? purchase.total_amount * 100 : 0
      };
      
      return result as Purchase; // Final type assertion
    });
  }, [])

  // Get the most recent purchases (limited to 3)
  const recentPurchases = useMemo(() => {
    // Generate fallback data if there's an error
    if (hasPurchasesError) {
      return [{
        id: 'error',
        date: 'Error loading purchases',
        status: 'error',
        total: 0,
        items: []
      }]
    }

    // Map the purchases to the expected format and take the 3 most recent
    return mapStorePurchasesToUIFormat(purchases || []).slice(0, 3)
  }, [purchases, hasPurchasesError, mapStorePurchasesToUIFormat])

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

  // State for welcome modal and onboarding tour
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showOnboardingTour, setShowOnboardingTour] = useState(false)
  const preferencesLoadedRef = useRef(false)

  // Load user interface preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || preferencesLoadedRef.current) return
    
    // Only load preferences once
    preferencesLoadedRef.current = true
    
    const preferences = getDashboardUIPreferences()
    setShowWelcomeModal(preferences.showWelcomeModal)
    setShowOnboardingTour(preferences.showOnboarding)
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboardingTour(false)
    markOnboardingTourShown()
  }
  
  const handleOnboardingSkip = () => {
    markOnboardingTourShown()
  }

  // Check affiliate status when user context loads
  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/student/affiliate-status?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsAffiliate(data.isAffiliate);
          setAffiliateStatus(data.status);
          
          // Auto-show wizard for approved affiliates (unless permanently dismissed)
          // Check dismissal status BEFORE showing the wizard to prevent phantom load
          if (data.isAffiliate && data.status === 'active') {
            const isWizardDismissed = typeof window !== 'undefined' && 
              localStorage.getItem('gh_affiliate_wizard_dismissed') === 'true';
            
            if (!isWizardDismissed) {
              setShowAffiliateWizard(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking affiliate status:', error);
      } finally {
        // Mark that affiliate status has been checked
        setAffiliateStatusLoaded(true);
      }
    };

    if (user?.id) {
      checkAffiliateStatus();
    }
  }, [user?.id]);

  // Force banner to show for all users - no debug logs needed
  useEffect(() => {
    // Clear any dismissed state to ensure banner shows for all users
    sessionStorage.removeItem('isAffiliateBannerDismissed');
    setIsAffiliateBannerDismissed(false);
  }, []);

  // Calculate if banner should show (optimized to prevent phantom loads)
  const shouldShowAffiliateBanner = useMemo(() => {
    // Don't show if temporarily dismissed for this session
    if (isAffiliateBannerDismissed) return false;
    
    // CRITICAL: Don't show banner until affiliate status has been loaded to prevent phantom text
    if (!affiliateStatusLoaded) return false;
    
    // For approved affiliates, check if permanently dismissed
    if (isAffiliate && affiliateStatus === 'active') {
      // Use direct localStorage check to prevent phantom loads
      const isPermanentlyDismissed = typeof window !== 'undefined' && 
        localStorage.getItem('gh_affiliate_congratulations_dismissed') === 'true';
      return !isPermanentlyDismissed;
    }
    
    // For non-affiliates or pending, show the banner (unless temporarily dismissed)
    return (!isAffiliate || affiliateStatus === 'pending');
  }, [isAffiliateBannerDismissed, isAffiliate, affiliateStatus, affiliateStatusLoaded]);



  return (
    <div className="min-h-screen bg-[#f9f6f2]">

      {/* Welcome Modal for First-time Users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false)
          markWelcomeModalShown()
          
          // Only show onboarding tour if user hasn't seen it before
          if (!hasSeenOnboardingTour()) {
            setShowOnboardingTour(true)
          }
        }}
        onComplete={() => {
          markWelcomeModalShown()
        }}
      />

      {/* Onboarding Tour */}
      {showOnboardingTour && <OnboardingTour onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />}

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={isPreviewOpen}
        file={previewFile}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={(file) => {
          // Open Google Drive download link in new tab
          if (file.id.startsWith('mock-')) {
            // Mock download triggered for this file
            return;
          }

          window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, '_blank');

          // Track download (we could add analytics here)
          // Template downloaded successfully
        }}
      />

      <main ref={containerRef} className="pb-20">
        <div className="container px-4 py-8">
          {/* Announcement Banner */}
          <AnimatePresence>
            {showAnnouncement && liveAnnouncements.length > 0 && (
              <div className="mb-6 bg-gradient-to-r from-brand-purple/10 to-brand-pink/10 rounded-xl p-4 border border-brand-purple/20 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAnnouncementIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-brand-purple/20 rounded-full p-2 mt-0.5">
                        <Bell className="h-5 w-5 text-brand-purple" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-brand-purple">{liveAnnouncements[currentAnnouncementIndex].title}</h3>
                        <p className="text-sm text-[#6d4c41]">{liveAnnouncements[currentAnnouncementIndex].content}</p>
                        <div className="flex items-center justify-between gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            {liveAnnouncements[currentAnnouncementIndex].publish_date && (
                              <span className="text-xs text-[#6d4c41]">
                                {format(new Date(liveAnnouncements[currentAnnouncementIndex].publish_date), 'MMMM d, yyyy')}
                              </span>
                            )}
                            
                          </div>
                          {liveAnnouncements.length > 1 && (
                            <div className="flex items-center gap-1">
                              {liveAnnouncements.map((_, index) => (
                                <button 
                                  key={index}
                                  onClick={() => setCurrentAnnouncementIndex(index)}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentAnnouncementIndex ? 'bg-brand-purple scale-125' : 'bg-brand-purple/30'}`}
                                  aria-label={`View announcement ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
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
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>

          {/* Affiliate Program Invitation */}
          {shouldShowAffiliateBanner && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="bg-gradient-to-r from-brand-purple to-brand-pink rounded-xl p-6 text-white shadow-lg relative">
                {/* Dismiss button */}
                <button
                  onClick={() => {
                    if (isAffiliate && affiliateStatus === 'active') {
                      // For approved affiliates, permanently dismiss
                      markAffiliateCongratulationsDismissed();
                    }
                    // Always dismiss for this session
                    setIsAffiliateBannerDismissed(true);
                  }}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                  aria-label="Dismiss banner"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <div className="flex items-center justify-between pr-8">
                  <div className="flex-1">
                    {isAffiliate && affiliateStatus === 'active' ? (
                      <>
                        <h3 className="text-lg font-bold mb-2 font-serif">🎉 Congratulations! You're an Affiliate!</h3>
                        <p className="text-white/90 mb-0 leading-relaxed">
                          You're earning 25% commission on referrals. Access your affiliate portal from your profile dropdown to track performance and get marketing materials.
                        </p>
                      </>
                    ) : affiliateStatus === 'pending' ? (
                      <>
                        <h3 className="text-lg font-bold mb-2 font-serif">Application Under Review</h3>
                        <p className="text-white/90 mb-0 leading-relaxed">
                          Your affiliate application is being reviewed. We'll notify you once it's approved. Thank you for your patience!
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold mb-2 font-serif">Join Our Affiliate Program!</h3>
                        <p className="text-white/90 mb-0 leading-relaxed">
                          Earn 25% commission by sharing Graceful Homeschooling with others. As a student, you get special access to our affiliate program.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {isAffiliate && affiliateStatus === 'active' ? (
                      <>
                        <Button
                          onClick={() => window.open('/affiliate-portal', '_blank')}
                          className="bg-white text-brand-purple hover:bg-gray-100 font-semibold transition-colors duration-200 shadow-sm"
                        >
                          View Portal
                        </Button>
                        <Button
                          onClick={() => window.open('https://facebook.com/groups/gracefulhomeschooling-affiliates', '_blank')}
                          variant="outline"
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm transition-colors duration-200 backdrop-blur-sm"
                        >
                          Join Facebook Group
                        </Button>
                      </>
                    ) : affiliateStatus === 'pending' ? (
                      <Button
                        disabled
                        className="bg-white/20 text-white/60 font-semibold cursor-not-allowed border border-white/20"
                      >
                        Pending Review
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowAffiliateWizard(true)}
                        className="bg-white text-brand-purple hover:bg-gray-100 font-semibold transition-colors duration-200 shadow-sm"
                      >
                        Apply Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                <div className="flex-1">
                  <div className="text-xs text-[#6d4c41]">Next Live Class</div>
                  {nextLiveClass ? (
                    <div>
                      <div className="text-sm font-bold text-[#5d4037] line-clamp-1">{nextLiveClass.title}</div>
                      <div className="text-xs text-[#6d4c41]">{nextLiveClass.date}, {nextLiveClass.time}</div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-[#5d4037]">No upcoming classes</div>
                  )}
                </div>
                {nextLiveClass?.zoomLink && nextLiveClass.zoomLink !== '#' && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="px-2 h-8 text-brand-blue hover:text-brand-blue/80 hover:bg-brand-blue/10"
                    onClick={() => window.open(nextLiveClass.zoomLink, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
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
          upcomingClasses={upcomingLiveClasses} // Use the new live data
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
            {user?.id ? (
              <PurchasesSection
                userId={user.id}
                viewAllUrl="/dashboard/purchase-history"
              />
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ErrorBoundary>

        {/* Live Classes */}
        <ErrorBoundary componentName="Live Classes Section">
          <div>
            <LiveClassesSection
              upcomingClasses={upcomingLiveClasses} // Use the new live data
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
                  id: "templates-access",
                  question: "How do I access all the templates?",
                  answer: "You can access all templates in the Templates Library section of your dashboard. Click on any template to preview it, then download or use it directly."
                },
                {
                  id: "course-modules",
                  question: "When will the next course module be available?",
                  answer: "New course modules are typically released every two weeks. You'll receive an email notification when new content becomes available."
                },
                {
                  id: "technical-issues",
                  question: "I'm having technical issues with the course videos",
                  answer: "If you're experiencing video playback issues, try clearing your browser cache, using a different browser, or checking your internet connection. For persistent problems, please contact our support team."
                },
                {
                  id: "payment-questions",
                  question: "How do I update my payment method?",
                  answer: "To update your payment method, go to your Account Settings page, select the 'Billing' tab, and click 'Update Payment Method'."
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

      {/* Affiliate Application Wizard */}
      {showAffiliateWizard && affiliateStatusLoaded && (
        <AffiliateApplicationWizard
          isOpen={showAffiliateWizard}
          onClose={() => setShowAffiliateWizard(false)}
        />
      )}
</div>
  )
}
