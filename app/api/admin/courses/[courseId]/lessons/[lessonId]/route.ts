import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; lessonId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const courseId = await Promise.resolve(params.courseId);
    const lessonId = await Promise.resolve(params.lessonId);
    const data = await request.json();

    console.log('📝 [API] Updating lesson:', { courseId, lessonId, data });

    // Validate required fields
    if (!lessonId) {
      return NextResponse.json(
        { error: { message: 'Missing lesson ID' } },
        { status: 400 }
      );
    }

    // First, get the current lesson to merge content properly
    const { data: currentLesson, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (fetchError) {
      console.error('❌ [API] Failed to fetch current lesson:', fetchError);
      return NextResponse.json(
        { error: { message: fetchError.message } },
        { status: 500 }
      );
    }

    // Prepare update data with proper content merging
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
      version: (currentLesson?.version || 0) + 1
    };

    // If content_json is provided, ensure it's properly structured
    if (data.content_json) {
      if (typeof data.content_json === 'string') {
        try {
          updateData.content_json = JSON.parse(data.content_json);
        } catch (e) {
          return NextResponse.json(
            { error: { message: 'Invalid content_json format' } },
            { status: 400 }
          );
        }
      } else {
        updateData.content_json = {
          content: data.content_json.content,
          type: data.content_json.type || 'lesson',
          version: data.content_json.version || 1
        };
      }
      // Ensure content field is updated to match content_json
      updateData.content = updateData.content_json.content;
    }

    console.log('📤 [API] Sending update to database:', updateData);

    // Update the lesson with returning option
    const { data: updatedLesson, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Failed to update lesson:', error);
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 500 }
      );
    }

    if (!updatedLesson) {
      return NextResponse.json(
        { error: { message: 'Lesson not found' } },
        { status: 404 }
      );
    }

    // Ensure content_json is properly structured in response
    const response = {
      ...updatedLesson,
      content: updatedLesson.content_json?.content || updatedLesson.content || '',
      content_json: updatedLesson.content_json || { 
        content: updatedLesson.content || '',
        type: 'lesson',
        version: 1
      }
    };

    // Revalidate with tags for more precise cache invalidation
    revalidateTag(`course-${courseId}`);
    revalidateTag(`lesson-${lessonId}`);
    
    // Force immediate revalidation of the course pages
    revalidatePath(`/admin/courses/${courseId}`, 'layout');
    revalidatePath(`/admin/courses/${courseId}/edit`, 'layout');

    console.log('✅ [API] Lesson updated successfully:', response);

    // Return response with cache control headers
    return new NextResponse(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('❌ [API] Error updating lesson:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 