import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const lessonSchema = z.object({
  title: z.string().min(1),
  content_json: z.object({
    content: z.string(),
    type: z.string(),
    version: z.number()
  }),
  status: z.enum(['draft', 'published', 'archived']),
  description: z.string().optional().nullable(),
  position: z.number().optional(),
  is_preview: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable()
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    console.log('🔵 [API] POST request received:', {
      endpoint: '/api/courses/[courseId]/modules/[moduleId]/lessons',
      timestamp: new Date().toISOString()
    })

    // Get authenticated user
    const supabase = await createRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('🔒 [API] Authentication error:', {
        error: authError,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('👤 [API] User authenticated:', {
      userId: user.id,
      timestamp: new Date().toISOString()
    })

    // Await dynamic params
    const resolvedParams = await params
    const { courseId, moduleId } = resolvedParams

    console.log('🔍 [API] Resolved params:', {
      courseId,
      moduleId,
      timestamp: new Date().toISOString()
    })

    // Parse and validate request body
    const body = await request.json()
    console.log('📦 [API] Request body:', {
      body,
      timestamp: new Date().toISOString()
    })

    const validatedData = lessonSchema.parse(body)
    console.log('✨ [API] Data validated:', {
      validatedData,
      timestamp: new Date().toISOString()
    })

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient()

    // Get the current highest position in the module
    const { data: existingLessons, error: positionError } = await serviceClient
      .from('lessons')
      .select('position')
      .eq('module_id', moduleId)
      .order('position', { ascending: false })
      .limit(1)

    if (positionError) {
      console.error('❌ [API] Error getting lesson positions:', {
        error: positionError,
        moduleId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to determine lesson position' }, { status: 500 })
    }

    const position = existingLessons && existingLessons[0] ? existingLessons[0].position + 1 : 0

    // Create the lesson
    const { data: lesson, error: createError } = await serviceClient
      .from('lessons')
      .insert({
        ...validatedData,
        module_id: moduleId,
        position,
        content: validatedData.content_json.content, // Store content in both places for backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ [API] Error creating lesson:', {
        error: createError,
        moduleId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
    }

    console.log('✅ [API] Lesson created successfully:', {
      lessonId: lesson.id,
      moduleId,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(lesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [API] Validation error:', {
        error: error.errors,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ [API] Unexpected error:', {
      error,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 