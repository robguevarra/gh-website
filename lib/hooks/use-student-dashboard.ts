import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { getBrowserClient } from '@/lib/supabase/client';
import { useStudentDashboardStore } from '@/lib/stores/student-dashboard';
import { type Database } from '@/types/supabase';
import { type UserEnrollment, type CourseProgress, type ModuleProgress, type LessonProgress } from '@/lib/stores/student-dashboard/types';

// Fetch function for SWR
const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  return response.json();
};

/**
 * Hook for getting authenticated user data
 */
export const useUserProfile = () => {
  const supabase = getBrowserClient();
  const { userId, userProfile, setUserId, setUserProfile } = useStudentDashboardStore();
  
  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        throw new Error(authError?.message || 'Not authenticated');
      }
      
      setUserId(session.user.id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      // Format joined date
      const joinedDate = profileData.created_at 
        ? new Date(profileData.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown';
      
      setUserProfile({
        name: profileData.full_name || 'Unknown',
        email: session.user.email || 'Unknown',
        avatar: profileData.avatar_url || `/placeholder.svg?height=40&width=40&text=${(profileData.full_name || 'U')[0]}`,
        joinedDate,
      });
      
      return {
        id: session.user.id,
        profile: {
          name: profileData.full_name || 'Unknown',
          email: session.user.email || 'Unknown',
          avatar: profileData.avatar_url || `/placeholder.svg?height=40&width=40&text=${(profileData.full_name || 'U')[0]}`,
          joinedDate,
        }
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [supabase, setUserId, setUserProfile]);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'user-profile',
    fetchUserProfile,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  );
  
  return {
    user: data,
    userProfile,
    userId,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

/**
 * Hook for fetching user enrollments
 */
export const useUserEnrollments = ({ includeExpired = false }: { includeExpired?: boolean } = {}) => {
  const supabase = getBrowserClient();
  const { 
    userId, 
    enrollments, 
    setEnrollments, 
    setIsLoadingEnrollments, 
    setHasEnrollmentError 
  } = useStudentDashboardStore();
  
  const fetchEnrollments = useCallback(async () => {
    if (!userId) return null;
    
    try {
      setIsLoadingEnrollments(true);
      setHasEnrollmentError(false);
      
      const { data, error } = await supabase
        .from('user_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          enrolled_at,
          expires_at,
          status,
          payment_id,
          created_at,
          updated_at,
          courses:course_id (
            id,
            title,
            description,
            slug,
            cover_image
          )
        `)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      if (!includeExpired) {
        // Filter out non-active enrollments
        const activeEnrollments = data.filter(
          enrollment => enrollment.status === 'active'
        );
        
        const mappedEnrollments: UserEnrollment[] = activeEnrollments.map((enrollment: any) => ({
          id: enrollment.id,
          userId: enrollment.user_id,
          courseId: enrollment.course_id,
          enrolledAt: enrollment.enrolled_at,
          expiresAt: enrollment.expires_at,
          status: enrollment.status as 'active' | 'suspended' | 'cancelled',
          paymentId: enrollment.payment_id,
          createdAt: enrollment.created_at,
          updatedAt: enrollment.updated_at,
          course: enrollment.courses ? {
            id: enrollment.courses.id,
            title: enrollment.courses.title,
            description: enrollment.courses.description,
            slug: enrollment.courses.slug,
            coverImage: enrollment.courses.cover_image
          } : undefined
        }));
        
        setEnrollments(mappedEnrollments);
        return mappedEnrollments;
      }
      
      // Map all enrollments
      const mappedEnrollments: UserEnrollment[] = data.map((enrollment: any) => ({
        id: enrollment.id,
        userId: enrollment.user_id,
        courseId: enrollment.course_id,
        enrolledAt: enrollment.enrolled_at,
        expiresAt: enrollment.expires_at,
        status: enrollment.status as 'active' | 'suspended' | 'cancelled',
        paymentId: enrollment.payment_id,
        createdAt: enrollment.created_at,
        updatedAt: enrollment.updated_at,
        course: enrollment.courses ? {
          id: enrollment.courses.id,
          title: enrollment.courses.title,
          description: enrollment.courses.description,
          slug: enrollment.courses.slug,
          coverImage: enrollment.courses.cover_image
        } : undefined
      }));
      
      setEnrollments(mappedEnrollments);
      return mappedEnrollments;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setHasEnrollmentError(true);
      return null;
    } finally {
      setIsLoadingEnrollments(false);
    }
  }, [
    userId, 
    supabase, 
    includeExpired, 
    setEnrollments, 
    setIsLoadingEnrollments, 
    setHasEnrollmentError
  ]);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    userId ? ['user-enrollments', userId, includeExpired] : null,
    () => fetchEnrollments(),
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  return {
    enrollments: data || enrollments,
    isLoading,
    isValidating,
    error,
    mutate,
    refetch: mutate,
  };
};

/**
 * Hook for fetching user progress for a course
 */
export const useUserCourseProgress = ({ courseId }: { courseId: string }) => {
  const supabase = getBrowserClient();
  const { 
    userId, 
    courseProgress, 
    setCourseProgress, 
    setIsLoadingProgress, 
    setHasProgressError 
  } = useStudentDashboardStore();
  
  const fetchCourseProgress = useCallback(async () => {
    if (!userId || !courseId) return null;
    
    try {
      setIsLoadingProgress(true);
      setHasProgressError(false);
      
      // 1. Get the course progress
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
        throw error;
      }
      
      if (!data) {
        // 2. If no progress, calculate it from lessons
        
        // Get all lessons for the course
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id,
            modules:module_id (
              course_id
            )
          `)
          .eq('modules.course_id', courseId);
          
        if (lessonsError) throw lessonsError;
        
        // Get progress for all of the user's lessons in this course
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessonsData.map(lesson => lesson.id));
          
        if (progressError) throw progressError;
        
        // Calculate overall percentage
        const totalLessons = lessonsData.length;
        const lessonsWithProgress = progressData.length;
        const completedLessons = progressData.filter((p: any) => p.progress_percentage === 100).length;
        const totalPercentage = progressData.reduce((sum: number, p: any) => sum + Number(p.progress_percentage), 0);
        
        // If user hasn't started any lessons, return 0%
        if (lessonsWithProgress === 0) {
          return {
            progressPercentage: 0,
            completedLessons: 0,
            totalLessons,
            hasStarted: false
          };
        }
        
        // Calculate average progress
        const progressPercentage = Math.round(totalPercentage / totalLessons);
        
        const progress = {
          id: 'calculated',
          userId,
          courseId,
          progressPercentage,
          completedLessons,
          totalLessons,
          startedAt: progressData[0]?.created_at || new Date().toISOString(),
          completedAt: completedLessons === totalLessons ? new Date().toISOString() : null,
          lastAccessedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setCourseProgress(courseId, progress as CourseProgress);
        return progress;
      }
      
      // 3. Map the data to our format
      const progress = {
        id: data.id,
        userId: data.user_id,
        courseId: data.course_id,
        progressPercentage: data.progress_percentage,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        lastAccessedAt: data.last_accessed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      setCourseProgress(courseId, progress);
      return progress;
    } catch (error) {
      console.error('Error fetching course progress:', error);
      setHasProgressError(true);
      return null;
    } finally {
      setIsLoadingProgress(false);
    }
  }, [
    userId, 
    courseId, 
    supabase, 
    setCourseProgress, 
    setIsLoadingProgress, 
    setHasProgressError
  ]);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    userId && courseId ? ['user-course-progress', userId, courseId] : null,
    () => fetchCourseProgress(),
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );
  
  return {
    progress: data || courseProgress[courseId],
    isLoading,
    isValidating,
    error,
    mutate,
    refetch: mutate,
  };
};

/**
 * Hook for fetching templates from Google Drive
 */
export const useTemplates = () => {
  const { 
    templates, 
    setTemplates, 
    setIsLoadingTemplates, 
    setHasTemplatesError,
    getFilteredTemplates,
    templateFilter,
    setTemplateFilter,
    templateSearchQuery,
    setTemplateSearchQuery
  } = useStudentDashboardStore();
  
  // This would be connected to a real API endpoint that fetches templates
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoadingTemplates(true);
      setHasTemplatesError(false);
      
      // For now we're using mock data
      // In production, this would fetch from an actual API
      const mockTemplates = [
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
      ];
      
      setTemplates(mockTemplates);
      return mockTemplates;
    } catch (error) {
      console.error('Error fetching templates:', error);
      setHasTemplatesError(true);
      return [];
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [setTemplates, setIsLoadingTemplates, setHasTemplatesError]);
  
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'templates',
    fetchTemplates,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );
  
  const filteredTemplates = getFilteredTemplates();
  
  return {
    templates: data || templates,
    filteredTemplates,
    filter: templateFilter,
    setFilter: setTemplateFilter,
    searchQuery: templateSearchQuery,
    setSearchQuery: setTemplateSearchQuery,
    isLoading,
    isValidating,
    error,
    mutate,
    refetch: mutate,
  };
};

/**
 * Hook for tracking an individual lesson's progress with auto-save
 */
export const useProgressTracker = ({
  lessonId,
  initialPosition = 0,
  initialPercentage = 0,
}: {
  lessonId: string;
  initialPosition?: number;
  initialPercentage?: number;
}) => {
  const supabase = getBrowserClient();
  const { userId, setLessonProgress } = useStudentDashboardStore();
  
  // Local state tracking
  const [progress, setProgress] = useState(initialPercentage);
  const [position, setPosition] = useState(initialPosition);
  const [isCompleted, setIsCompleted] = useState(initialPercentage === 100);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Save progress to database
  const saveProgress = async () => {
    if (!userId || !lessonId) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          progress_percentage: progress,
          last_position: position,
          status: isCompleted ? 'completed' : progress > 0 ? 'in_progress' : 'started',
          completed_at: isCompleted ? new Date().toISOString() : null,
        }, { onConflict: 'user_id,lesson_id' });
        
      if (error) throw error;
      
      // Update the store
      setLessonProgress(lessonId, {
        status: isCompleted ? 'completed' : progress > 0 ? 'in_progress' : 'started',
        progress,
        lastPosition: position
      });
      
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save time spent to database
  const saveTimeSpent = async () => {
    if (!userId || !lessonId || !startTime || timeSpent === 0) return;
    
    try {
      const { error } = await supabase
        .from('user_time_spent')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          duration_seconds: timeSpent,
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error saving time spent:', error);
    }
  };
  
  // Start tracking when component mounts
  useEffect(() => {
    if (userId) {
      setStartTime(new Date());
      const interval = setInterval(() => {
        if (startTime) {
          const now = new Date();
          setTimeSpent(Math.floor((now.getTime() - startTime.getTime()) / 1000));
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
        // Save time spent when unmounting
        if (timeSpent > 0) {
          saveTimeSpent();
        }
      };
    }
  }, [userId, startTime, timeSpent]);
  
  // Update progress with throttling
  useEffect(() => {
    if (userId && lessonId) {
      const intervalId = setInterval(async () => {
        if (progress > 0 && !isSaving) {
          await saveProgress();
        }
      }, 30000); // Save every 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [userId, lessonId, progress, isSaving]);

  
  // Update progress
  const updateProgress = (newProgress: number) => {
    setProgress(newProgress);
    
    if (newProgress === 100) {
      setIsCompleted(true);
      saveProgress(); // Save immediately when completed
    }
  };
  
  // Update video position
  const updatePosition = (newPosition: number) => {
    setPosition(newPosition);
  };
  
  // Mark as complete
  const markComplete = async () => {
    setProgress(100);
    setIsCompleted(true);
    await saveProgress();
  };
  
  return {
    progress,
    position,
    isCompleted,
    isSaving,
    lastSavedAt,
    timeSpent,
    updateProgress,
    updatePosition,
    markComplete,
    saveProgress,
  };
};

// Export convenience hooks
export const useStudentDashboard = () => {
  const user = useUserProfile();
  const enrollments = useUserEnrollments();
  const templates = useTemplates();
  
  return {
    user,
    enrollments,
    templates,
  };
};
