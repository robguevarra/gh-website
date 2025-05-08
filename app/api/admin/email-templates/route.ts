/**
 * Admin Email Templates API
 * 
 * API routes for managing email templates in the admin interface
 * Supports viewing, editing, and previewing templates
 * Updated to support Unlayer design storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import templateManager from '@/lib/services/email/template-manager';
import { DetailedTemplate, TemplateMetadata, TemplateVariables } from './template-types';

// Initialize Supabase client for auth checks with SSR cookie handling
const getSupabaseClient = async () => {
  // Create the Supabase client with Next.js 14+ cookie handling
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: any) {
          // Readonly in API routes - this is expected
        },
        async remove(name: string, options: any) {
          // Readonly in API routes - this is expected
        }
      },
    }
  );
};

// Basic auth middleware - since this is an admin route, we just need to check if the user is authenticated
const requireAuth = async () => {
  const supabase = await getSupabaseClient();
  
  // Check if user is authenticated using getUser (more secure than getSession)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Auth error:', userError);
    return { isAuthenticated: false, error: 'Not authenticated' };
  }
  
  return { isAuthenticated: true, userId: user.id, error: null };
};

// Get all templates
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Initialize template manager if needed
    await templateManager.initialize();
    
    // Get all template categories
    const templateDir = path.join(process.cwd(), 'lib/services/email/templates');
    
    // Check if directory exists
    if (!fs.existsSync(templateDir)) {
      return NextResponse.json({ templates: [] });
    }
    
    // Read all template categories
    const categories = fs.readdirSync(templateDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Get templates from each category
    const templates = [];
    
    for (const category of categories) {
      const categoryPath = path.join(templateDir, category);
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.html'));
      
      for (const file of files) {
        const templateId = path.basename(file, '.html');
        const metadataPath = path.join(categoryPath, `${templateId}.metadata.json`);
        
        // Default template info (if no metadata exists yet)
        let templateInfo: any = {
          id: templateId,
          name: templateId,
          category,
          updatedAt: fs.statSync(path.join(categoryPath, file)).mtime.toISOString(),
          version: 1
        };
        
        // Try to load metadata for more details
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            
            // Enhance template info with metadata
            templateInfo = {
              ...templateInfo,
              subcategory: metadata.subcategory,
              version: metadata.version,
              tags: metadata.tags
            };
          } catch (err) {
            console.error(`Error parsing metadata for ${templateId}:`, err);
          }
        }
        
        templates.push(templateInfo);
      }
    }
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// Get a specific template
export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { templateId, variables } = await request.json();
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize template manager if needed
    await templateManager.initialize();
    
    // Get template details
    const template = await templateManager.getTemplate(templateId);
    
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }
    
    // Get template file paths
    const templatePath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${templateId}.html`
    );
    
    const metadataPath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${templateId}.metadata.json`
    );
    
    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Template file not found: ${templateId}` },
        { status: 404 }
      );
    }
    
    // Read HTML template content
    const htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    
    // Get metadata (version history, etc.) if available
    let metadata: any = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (err) {
        console.error(`Error parsing metadata for ${templateId}:`, err);
      }
    }
    
    // Render template with variables if provided
    let renderedHtml = htmlTemplate;
    
    if (variables) {
      renderedHtml = await templateManager.renderTemplate(templateId, variables);
    }
    
    return NextResponse.json({
      template: {
        ...template,
        htmlTemplate,
        renderedHtml,
        design: metadata.design, // Include the Unlayer design data
        version: metadata.version || 1,
        subcategory: metadata.subcategory,
        tags: metadata.tags || [],
        previousVersions: metadata.previousVersions || [],
      }
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

// Update a template
export async function PUT(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { templateId, htmlTemplate, design, category, subcategory, version, previousVersion } = await request.json();
    
    if (!templateId || !htmlTemplate) {
      return NextResponse.json(
        { error: 'Template ID and HTML content are required' },
        { status: 400 }
      );
    }
    
    // Determine the template category path
    const templateCategory = category || 'transactional'; // Default to transactional
    const templateDir = path.join(process.cwd(), 'lib/services/email/templates', templateCategory);
    
    // Ensure the directory exists
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    // Prepare template object with version history and design data
    const templateData: TemplateMetadata = {
      htmlTemplate,
      design, // Store the Unlayer design JSON for future editing
      category: templateCategory,
      subcategory: subcategory || null,
      version: version || 1,
      previousVersions: previousVersion ? [previousVersion] : [],
      tags: []
    };
    
    // Save the template
    const templatePath = path.join(templateDir, `${templateId}.html`);
    fs.writeFileSync(templatePath, htmlTemplate);
    
    // Save template metadata (including version history)
    const metadataPath = path.join(templateDir, `${templateId}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(templateData, null, 2));
    
    // Reload templates to refresh the cache
    await templateManager.initialize();
    
    return NextResponse.json({
      success: true,
      message: `Template ${templateId} updated successfully`,
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// Preview a template with test data
export async function PATCH(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { htmlTemplate, variables } = await request.json();
    
    if (!htmlTemplate) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }
    
    // Start with the provided HTML template
    let html = htmlTemplate;
    
    // Process the HTML with our email processor if needed
    // Note: If you have a separate service for this, you can call it here
    
    // Replace variables in the template if provided
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, value?.toString() || '');
      });
    }
    
    return NextResponse.json({
      html,
    });
  } catch (error) {
    console.error('Failed to preview template:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
