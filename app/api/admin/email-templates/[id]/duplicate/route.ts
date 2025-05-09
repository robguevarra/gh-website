import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function checkAdminAccess() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { isAdmin: false, error: 'User not authenticated', status: 401 };
  }

  // Check for admin role - assumes 'is_admin' boolean in user_metadata
  // Adjust this check based on your actual role management setup (e.g., RLS, custom claims, 'roles' table)
  const isAdmin = user.user_metadata?.is_admin === true;

  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin access required', status: 403 };
  }

  return { isAdmin: true, error: null, status: 200 };
}

// Handler for POST requests (Duplicate Template)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const templateIdToDuplicate = params.id;
  console.log(`POST request received to duplicate template ID: ${templateIdToDuplicate}`);

  const accessCheck = await checkAdminAccess();
  if (!accessCheck.isAdmin) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  const supabase = await createServerSupabaseClient();

  try {
    // 1. Fetch the original template
    const { data: originalTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateIdToDuplicate)
      .single();

    if (fetchError || !originalTemplate) {
      console.error(`Error fetching template ${templateIdToDuplicate} for duplication:`, fetchError);
      return NextResponse.json({ error: 'Original template not found' }, { status: 404 });
    }

    // 2. Prepare the new template data
    const newTemplateData = {
      ...originalTemplate,
      id: undefined, // Let Supabase generate a new UUID
      created_at: undefined, // Let Supabase set the timestamp
      updated_at: undefined, // Let Supabase set the timestamp
      name: `Copy of ${originalTemplate.name}`, // Modify the name
    };

    // Remove the original id from the data object explicitly if it wasn't undefined
    delete newTemplateData.id;

    // 3. Insert the new template
    const { data: newTemplate, error: insertError } = await supabase
      .from('email_templates')
      .insert(newTemplateData)
      .select()
      .single();

    if (insertError) {
      console.error(`Error inserting duplicated template based on ${templateIdToDuplicate}:`, insertError);
      return NextResponse.json({ error: 'Failed to duplicate template', details: insertError.message }, { status: 500 });
    }

    console.log(`Template ${templateIdToDuplicate} duplicated successfully with new ID: ${newTemplate.id}`);
    return NextResponse.json({ message: 'Template duplicated successfully', newTemplate }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error(`Unexpected error duplicating template ${templateIdToDuplicate}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 