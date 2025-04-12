import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;
  
  if (!templateId) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }
  
  // Check if user is authenticated
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // This is just for type compatibility, we don't actually set cookies here
        },
        remove(name: string, options: any) {
          // This is just for type compatibility, we don't actually remove cookies here
        },
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Get template from database
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Track template download
    await supabase.rpc('increment_template_downloads', { template_id: templateId });
    
    // Check if user has downloaded this template before
    const { data: userTemplate } = await supabase
      .from('user_templates')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('template_id', templateId)
      .single();
    
    if (userTemplate) {
      // Update existing record
      await supabase
        .from('user_templates')
        .update({
          last_accessed: new Date().toISOString(),
          download_count: userTemplate.download_count + 1
        })
        .eq('id', userTemplate.id);
    } else {
      // Create new record
      await supabase
        .from('user_templates')
        .insert({
          user_id: session.user.id,
          template_id: templateId,
          last_accessed: new Date().toISOString(),
          view_count: 0,
          download_count: 1
        });
    }
    
    // Return the download URL
    return NextResponse.json({
      downloadUrl: `https://drive.google.com/uc?export=download&id=${template.google_drive_id}`,
      template: {
        id: template.id,
        name: template.name,
        type: template.file_type
      }
    });
  } catch (error) {
    console.error('Error tracking template download:', error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
