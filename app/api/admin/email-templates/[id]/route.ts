import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Zod schema for validating the request body for PUT (rename)
const updateTemplateSchema = z.object({
  name: z.string().min(1, { message: 'Template name cannot be empty' }),
  // Add other fields like subject, description if needed
});

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

// Handler for PUT requests (Rename Template)
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  // Extract the id parameter from context
  const { id: templateId } = context.params;
  console.log(`PUT request received for template ID: ${templateId}`);

  const accessCheck = await checkAdminAccess();
  if (!accessCheck.isAdmin) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  let validatedData;
  try {
    const body = await request.json();
    validatedData = updateTemplateSchema.parse(body);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json({ error: 'Invalid request body', details: error instanceof z.ZodError ? error.errors : error }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('email_templates')
      .update({
        name: validatedData.name,
        // Add other fields here if they are part of the update
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single(); // Use single to ensure the ID exists or throw error

    if (error) {
      console.error(`Error updating template ${templateId}:`, error);
      if (error.code === 'PGRST116') { // code for "resource not found"
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update template', details: error.message }, { status: 500 });
    }

    console.log(`Template ${templateId} updated successfully.`);
    return NextResponse.json({ message: 'Template updated successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Unexpected error updating template ${templateId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handler for DELETE requests (Delete Template)
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  // Extract the id parameter from context (proper App Router way)
  const { id: templateIdentifier } = context.params;
  console.log(`DELETE request received for template identifier: ${templateIdentifier}`);

  const accessCheck = await checkAdminAccess();
  if (!accessCheck.isAdmin) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  const supabase = await createServerSupabaseClient();

  try {
    // For file-system based templates, we need to look up the template by name/path
    // The templateIdentifier could be a name like "authentication-test-2673"
    // or a more complex path like "authentication/welcome"
    
    // Split for possible category/subcategory/name format
    const pathParts = templateIdentifier.split('/');
    const templateName = pathParts[pathParts.length - 1]; // Last part is likely the template name
    
    // 1. First try to find and delete from the database by exact name match
    const dbResult = await supabase
      .from('email_templates')
      .delete({ count: 'exact' })
      .or(`name.eq.${templateName},name.eq.${templateIdentifier}`);
    
    const dbError = dbResult.error;
    const dbCount = dbResult.count || 0;
    
    // 2. If that fails or doesn't find anything, look for files that match the pattern
    // This is a simplified approach - in a real system, you'd want more precise file finding logic
    if (dbCount === 0 || dbError) {
      // Use Node.js file operations to find and delete template files
      const templateDir = path.join(process.cwd(), 'lib/services/email/templates');
      
      let filesToDelete = [];
      let filesDeleted = 0;
      
      // Option 1: Direct match in the file system (if we know exact path structure)
      // Typically templates might be in lib/services/email/templates/CATEGORY/NAME.html
      // and related lib/services/email/templates/CATEGORY/NAME.json for Unlayer design
      
      // Try both direct template name and with common extensions
      const possiblePaths = [
        path.join(templateDir, `${templateIdentifier}.html`),
        path.join(templateDir, `${templateIdentifier}.json`),
        path.join(templateDir, templateIdentifier, 'index.html'),
      ];
      
      // For category/template structure (e.g., "authentication/welcome")
      if (pathParts.length > 1) {
        const category = pathParts[0];
        possiblePaths.push(
          path.join(templateDir, category, `${templateName}.html`),
          path.join(templateDir, category, `${templateName}.json`),
        );
      }
      
      // Check which paths exist and collect for deletion
      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          filesToDelete.push(filePath);
        }
      }
      
      // Option 2: Search by approximate match
      // Find files that contain the templateName
      const searchDirs = pathParts.length > 1 
        ? [path.join(templateDir, pathParts[0])] // If category specified, search just that dir
        : [templateDir]; // Otherwise search all template dirs
        
      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          // Search recursively for files that match the template name
          const walkDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                walkDir(fullPath);
              } else if (entry.name.includes(templateName)) {
                filesToDelete.push(fullPath);
              }
            }
          };
          
          try {
            walkDir(dir);
          } catch (err) {
            console.error(`Error searching directory ${dir}:`, err);
          }
        }
      }
      
      // Delete any found files
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file);
          filesDeleted++;
          console.log(`Deleted file: ${file}`);
        } catch (err) {
          console.error(`Error deleting file ${file}:`, err);
        }
      }
      
      // Return success if we deleted any files
      if (filesDeleted > 0) {
        return NextResponse.json({ 
          message: `Template files deleted successfully (${filesDeleted} files)` 
        }, { status: 200 });
      }
      
      // If we reach here and dbCount was 0, nothing was found to delete
      if (dbCount === 0) {
        return NextResponse.json({ 
          error: 'Template not found', 
          details: 'No template with this identifier exists in the database or file system'
        }, { status: 404 });
      }
    }

    if (dbError) {
      console.error(`Error deleting template ${templateIdentifier}:`, dbError);
      return NextResponse.json({ error: 'Failed to delete template', details: dbError.message }, { status: 500 });
    }

    if (dbCount === 0) {
        console.warn(`Attempted to delete non-existent template: ${templateIdentifier}`);
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log(`Template ${templateIdentifier} deleted successfully.`);
    return NextResponse.json({ message: 'Template deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Unexpected error deleting template ${templateIdentifier}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 