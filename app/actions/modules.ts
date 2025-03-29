'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Module, Lesson } from '@/types/courses'
import type { Database } from '@/types/supabase'
import { getAdminClient } from '@/lib/supabase/admin'

// Initialize supabaseAdmin
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function fetchModules(courseId: string): Promise<Module[]> {
  try {
    console.log('📥 Fetching modules for course:', courseId)
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                maxAge: 0,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
        },
      }
    )
    
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        lessons (*)
      `)
      .eq('course_id', courseId)
      .order('position')

    if (error) {
      console.error('❌ Error fetching modules:', error)
      throw new Error('Failed to fetch modules')
    }

    console.log('✅ Successfully fetched modules:', data.length)
    return data
  } catch (err) {
    console.error('❌ Error in fetchModules:', err)
    throw err
  }
}

export async function fetchLessons(moduleId: string): Promise<Lesson[]> {
  try {
    console.log('📥 Fetching lessons for module:', moduleId)
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                maxAge: 0,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
        },
      }
    )
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('position')

    if (error) {
      console.error('❌ Error fetching lessons:', error)
      throw new Error('Failed to fetch lessons')
    }

    console.log('✅ Successfully fetched lessons:', data.length)
    return data
  } catch (err) {
    console.error('❌ Error in fetchLessons:', err)
    throw err
  }
}

export async function fetchLesson(lessonId: string) {
  console.log('[Server] fetchLesson: Starting fetch for lessonId:', lessonId)
  
  const { data: lesson, error } = await supabaseAdmin
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  if (error) {
    console.error('[Server] fetchLesson: Error:', error)
    throw new Error('Failed to fetch lesson')
  }

  console.log('[Server] fetchLesson: Success, fetched lesson:', lesson.id)
  return lesson
}

export async function saveLesson(lessonId: string, data: {
  title?: string
  description?: string
  content_json?: any
}) {
  console.log('[Server] saveLesson: Starting save for lessonId:', lessonId)
  
  const { error } = await supabaseAdmin
    .from('lessons')
    .update({
      title: data.title,
      description: data.description,
      content_json: data.content_json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId)

  if (error) {
    console.error('[Server] saveLesson: Error:', error)
    throw new Error('Failed to save lesson')
  }

  console.log('[Server] saveLesson: Success')
  
  // Get the module_id and course_id for the lesson to revalidate the correct paths
  const { data: lesson } = await supabaseAdmin
    .from('lessons')
    .select('module_id, modules!inner(course_id)')
    .eq('id', lessonId)
    .single()

  if (lesson && lesson.modules) {
    const courseId = (lesson.modules as any).course_id
    revalidatePath(`/admin/courses/${courseId}`)
    console.log('[Server] saveLesson: Revalidated path:', `/admin/courses/${courseId}`)
  }
}

export async function addModule(courseId: string): Promise<Module> {
  try {
    console.log('➕ Adding new module to course:', courseId)
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                maxAge: 0,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
        },
      }
    )
    
    // Get the current highest position
    const { data: existingModules, error: posError } = await supabase
      .from('modules')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1)

    if (posError) {
      console.error('❌ Error getting module positions:', posError)
      throw new Error('Failed to get module positions')
    }

    const newPosition = existingModules?.[0]?.position ?? 0

    // Insert new module
    const { data, error } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: 'New Module',
        position: newPosition + 1,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding module:', error)
      throw new Error('Failed to add module')
    }

    console.log('✅ Successfully added new module:', data.id)
    revalidatePath(`/admin/courses/${courseId}`)
    return data
  } catch (err) {
    console.error('❌ Error in addModule:', err)
    throw err
  }
}

interface ModulePosition {
  id: string
  position: number
}

export async function updateModulePositions(updates: ModulePosition[]): Promise<void> {
  try {
    console.log('🔄 Updating module positions:', updates.length)
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                maxAge: 0,
              })
            } catch (error) {
              // Handle cookie mutation error in static generation
            }
          },
        },
      }
    )
    
    // Update each module's position
    await Promise.all(
      updates.map(async ({ id, position }) => {
        const { error } = await supabase
          .from('modules')
          .update({ position })
          .eq('id', id)

        if (error) {
          console.error(`❌ Error updating position for module ${id}:`, error)
          throw new Error(`Failed to update position for module ${id}`)
        }
      })
    )

    console.log('✅ Successfully updated module positions')
    // Get courseId from first module to revalidate path
    if (updates.length > 0) {
      const { data } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', updates[0].id)
        .single()
      
      if (data?.course_id) {
        revalidatePath(`/admin/courses/${data.course_id}`)
      }
    }
  } catch (err) {
    console.error('❌ Error in updateModulePositions:', err)
    throw err
  }
}

type ModuleWithCourse = {
  course_id: string;
};

interface LessonData {
  id: string;
  modules: {
    course_id: string;
  };
}

export async function createLesson(moduleId: string, title: string, position: number) {
  try {
    const adminClient = getAdminClient();
    
    // Get the course ID for the module
    const { data: module, error: moduleError } = await adminClient
      .from('modules')
      .select('course_id')
      .eq('id', moduleId)
      .single();
      
    if (moduleError || !module) {
      console.error('Error fetching module:', moduleError);
      return { error: moduleError || new Error('Module not found') };
    }
    
    // Create the lesson
    const { data: lesson, error } = await adminClient
      .from('lessons')
      .insert({
        title,
        module_id: moduleId,
        position,
        content: '',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return { error };
    }

    // Revalidate the course page
    revalidatePath(`/admin/courses/${(module as ModuleWithCourse).course_id}`);
    revalidatePath(`/courses/${(module as ModuleWithCourse).course_id}`);

    return { data: lesson };
  } catch (error) {
    console.error('Unexpected error creating lesson:', error);
    return { error };
  }
}

export async function updateLesson(lessonId: string, data: Partial<Database['public']['Tables']['lessons']['Update']>) {
  try {
    const adminClient = getAdminClient();
    
    // Get the course ID for the lesson
    const { data: lessonData, error: lessonError } = await adminClient
      .from('lessons')
      .select(`
        id,
        modules!inner (
          course_id
        )
      `)
      .eq('id', lessonId)
      .single();
      
    if (lessonError || !lessonData) {
      console.error('Error fetching lesson:', lessonError);
      return { error: lessonError || new Error('Lesson not found') };
    }
    
    // Update the lesson
    const { error } = await adminClient
      .from('lessons')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    if (error) {
      console.error('Error updating lesson:', error);
      return { error };
    }

    // Get the course ID from the nested modules object
    const typedLessonData = lessonData as unknown as LessonData;
    const courseId = typedLessonData.modules.course_id;

    // Revalidate the course page
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating lesson:', error);
    return { error };
  }
}

export async function deleteLesson(lessonId: string) {
  try {
    const adminClient = getAdminClient();
    
    // Get the course ID for the lesson before deletion
    const { data: lessonData } = await adminClient
      .from('lessons')
      .select(`
        id,
        modules!inner (
          course_id
        )
      `)
      .eq('id', lessonId)
      .single();
      
    if (!lessonData) {
      return { error: new Error('Lesson not found') };
    }
    
    // Get the course ID from the nested modules object
    const typedLessonData = lessonData as unknown as LessonData;
    const courseId = typedLessonData.modules.course_id;
    
    // Delete the lesson
    const { error } = await adminClient
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error);
      return { error };
    }

    // Revalidate the course page
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting lesson:', error);
    return { error };
  }
} 