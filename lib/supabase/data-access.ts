import { createServerSupabaseClient } from './client';
import type { Database } from '@/types/supabase';

// User Profile Management
export async function getUserProfile(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createUserProfile(profile: Database['public']['Tables']['profiles']['Insert']) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserProfile(profile: Database['public']['Tables']['profiles']['Update']) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', profile.id!)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Course Management
export async function getCourses(options?: { 
  featured?: boolean, 
  limit?: number,
  publishedOnly?: boolean
}) {
  const supabase = createServerSupabaseClient();
  
  let query = supabase.from('courses').select('*, membership_tiers(name)');
  
  if (options?.publishedOnly) {
    query = query.eq('status', 'published');
  }
  
  if (options?.featured) {
    query = query.eq('is_featured', true);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getCourseBySlug(slug: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('courses')
    .select('*, membership_tiers(name, price_monthly, price_yearly)')
    .eq('slug', slug)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCourseModules(courseId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function getModuleLessons(moduleId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('position', { ascending: true });
  
  if (error) throw error;
  return data;
}

// Membership Tiers
export async function getMembershipTiers() {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('membership_tiers')
    .select('*')
    .order('price_monthly', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function getUserMembership(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_memberships')
    .select('*, membership_tiers(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
  return data || null;
}

// User Enrollments
export async function getUserEnrollments(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, courses(id, title, slug, thumbnail_url)')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  if (error) throw error;
  return data;
}

export async function enrollUserInCourse(userId: string, courseId: string, paymentId?: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      payment_id: paymentId,
      status: 'active'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Progress Tracking
export async function getUserLessonProgress(userId: string, lessonId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
  return data || null;
}

export async function updateUserProgress(
  userId: string, 
  lessonId: string, 
  progress: Partial<Database['public']['Tables']['user_progress']['Update']>
) {
  const supabase = createServerSupabaseClient();
  
  // Check if progress exists
  const { data: existingProgress } = await supabase
    .from('user_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single();
  
  if (existingProgress) {
    // Update existing progress
    const { data, error } = await supabase
      .from('user_progress')
      .update(progress)
      .eq('id', existingProgress.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new progress
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        ...progress
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Error handling wrapper for data access functions
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage = 'Database operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new Error(errorMessage);
  }
} 