'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function fetchModules(courseId: string) {
  console.log('[Server] fetchModules: Starting fetch for courseId:', courseId)
  
  const { data: modules, error } = await supabaseAdmin
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position')

  if (error) {
    console.error('[Server] fetchModules: Error:', error)
    throw new Error('Failed to fetch modules')
  }

  console.log('[Server] fetchModules: Success, found', modules.length, 'modules')
  return modules
}

export async function fetchLessons(moduleId: string) {
  console.log('[Server] fetchLessons: Starting fetch for moduleId:', moduleId)
  
  const { data: lessons, error } = await supabaseAdmin
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('position')

  if (error) {
    console.error('[Server] fetchLessons: Error:', error)
    throw new Error('Failed to fetch lessons')
  }

  console.log('[Server] fetchLessons: Success, found', lessons.length, 'lessons')
  return lessons
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

  if (lesson) {
    const courseId = lesson.modules.course_id
    revalidatePath(`/admin/courses/${courseId}`)
    console.log('[Server] saveLesson: Revalidated path:', `/admin/courses/${courseId}`)
  }
}

export async function addModule(courseId: string) {
  console.log('[Server] addModule: Starting add for courseId:', courseId)
  
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('course_id', courseId)

  const position = modules?.length || 0
  console.log('[Server] addModule: Calculated position:', position)

  const { data: newModule, error } = await supabaseAdmin
    .from('modules')
    .insert({
      course_id: courseId,
      title: 'New Module',
      position,
      is_published: false,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    console.error('[Server] addModule: Error:', error)
    throw new Error('Failed to add module')
  }

  console.log('[Server] addModule: Success, created module:', newModule.id)
  
  // Revalidate the course page
  revalidatePath(`/admin/courses/${courseId}`)
  console.log('[Server] addModule: Revalidated path:', `/admin/courses/${courseId}`)
  
  return newModule
}

export async function updateModulePositions(updates: { id: string; position: number }[]) {
  console.log('[Server] updateModulePositions: Starting update for', updates.length, 'modules')
  
  const { error } = await supabaseAdmin
    .from('modules')
    .upsert(updates)

  if (error) {
    console.error('[Server] updateModulePositions: Error:', error)
    throw new Error('Failed to update module positions')
  }

  console.log('[Server] updateModulePositions: Success')
  
  // Since we don't have the courseId in this function, we'll need to
  // revalidate all course pages. In production, you might want to
  // pass the courseId as a parameter to make this more specific.
  revalidatePath('/admin/courses/[id]', 'layout')
  console.log('[Server] updateModulePositions: Revalidated course pages')
} 