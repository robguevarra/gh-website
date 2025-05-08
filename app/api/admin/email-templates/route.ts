/**
 * Admin Email Templates API
 * 
 * API routes for managing email templates in the admin interface
 * - GET: List all templates or get a specific one by ID
 * - POST: Create a new template with Unlayer design
 * - PUT: Update an existing template
 * - PATCH: Preview a template with variables
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
    return { isAuthenticated: false, userId: null, error: 'Not authenticated' };
  }
  
  return { isAuthenticated: true, userId: user.id, error: null };
};

/**
 * Helper function to sanitize a template ID
 * Ensures we use consistent IDs that work as filenames across the system
 */
const sanitizeTemplateId = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
};

// GET: List all templates OR get a specific template by ID
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check if we're getting a specific template
  const url = new URL(request.url);
  const templateId = url.searchParams.get('templateId');
  const variables = url.searchParams.get('variables') 
    ? JSON.parse(url.searchParams.get('variables') || '{}')
    : null;
  
  // If no template ID is provided, get all templates
  if (!templateId) {
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
  
  // Get a specific template - sanitize ID for consistency
  const sanitizedId = sanitizeTemplateId(templateId);
  console.log(`Getting template: ${sanitizedId}`);
  
  try {
    // Initialize template manager if needed
    await templateManager.initialize();
    
    // Get template details
    const template = await templateManager.getTemplate(sanitizedId);
    
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${sanitizedId}` },
        { status: 404 }
      );
    }
    
    // Get template file paths
    const templatePath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${sanitizedId}.html`
    );
    
    const metadataPath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${sanitizedId}.metadata.json`
    );
    
    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Template file not found: ${sanitizedId}` },
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
        console.error(`Error parsing metadata for ${sanitizedId}:`, err);
      }
    }
    
    // Render template with variables if provided
    let renderedHtml = htmlTemplate;
    
    if (variables) {
      renderedHtml = await templateManager.renderTemplate(sanitizedId, variables);
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

// POST: Create a new template
export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error, userId } = await requireAuth();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { id, name, category, description, isActive, design, htmlTemplate } = await request.json();
    
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }
    
    // Use provided ID or generate a unique template ID
    const baseTemplateId = id || `${category}-${name.toLowerCase().replace(/\\s+/g, '-')}-${Date.now().toString().substring(9)}`;
    
    // Sanitize the template ID for consistent usage
    const sanitizedId = sanitizeTemplateId(baseTemplateId);
    
    // Ensure the templates directory exists
    const templatesDir = path.join(process.cwd(), 'lib/services/email/templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // Create directory for category if it doesn't exist
    const categoryDir = path.join(templatesDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    console.log(`Creating template: ${sanitizedId} in directory: ${categoryDir}`);
    
    // Create template file with sanitized ID
    const templatePath = path.join(categoryDir, `${sanitizedId}.html`);
    
    // If we have HTML from the request, use it; otherwise, create a minimal starter template
    const initialHtml = htmlTemplate || `<!DOCTYPE html>
<html>
<head>
    <title>${name}</title>
</head>
<body>
    <h1>${name}</h1>
    <p>This is a starter template.</p>
</body>
</html>`;
    
    // Write the HTML file
    fs.writeFileSync(templatePath, initialHtml, 'utf-8');
    
    // Create metadata file with design JSON using sanitized ID
    const metadataPath = path.join(categoryDir, `${sanitizedId}.metadata.json`);
    const metadata = {
      version: 1,
      design: design || null,
      category,
      description: description || `${name} template`,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      previousVersions: []
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    // Initialize template manager to refresh templates
    await templateManager.initialize();
    
    // Return the sanitized ID to ensure consistency
    return NextResponse.json({ 
      template: {
        id: sanitizedId, // Use sanitized ID for consistency
        name,
        category,
        design: metadata.design,
        htmlTemplate: initialHtml,
        renderedHtml: initialHtml, // For initial render
        version: 1,
        updatedAt: metadata.updatedAt
      }
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing template
export async function PUT(request: NextRequest) {
  // Verify user is authenticated
  const { isAuthenticated, error, userId } = await requireAuth();
  
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
    
    // Sanitize the template ID for consistent usage
    const sanitizedId = sanitizeTemplateId(templateId);
    console.log(`Updating template: ${sanitizedId}`);
    
    // Initialize template manager if needed
    await templateManager.initialize();
    
    // Get template details
    const template = await templateManager.getTemplate(sanitizedId);
    
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${sanitizedId}` },
        { status: 404 }
      );
    }
    
    // Get template file paths using sanitized ID
    const templatePath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${sanitizedId}.html`
    );
    
    const metadataPath = path.join(
      process.cwd(),
      'lib/services/email/templates',
      template.category,
      `${sanitizedId}.metadata.json`
    );
    
    console.log(`Template path: ${templatePath}`);
    console.log(`Metadata path: ${metadataPath}`);
    
    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Template file not found: ${sanitizedId}` },
        { status: 404 }
      );
    }
    
    // Update HTML content
    fs.writeFileSync(templatePath, htmlTemplate, 'utf-8');
    
    // Update or create metadata
    let metadata: any = {
      version: version || 1,
      category: template.category,
      updatedAt: new Date().toISOString(),
      previousVersions: [] as any[]
    };
    
    // Try to load existing metadata
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (err) {
        console.error(`Error parsing metadata for ${sanitizedId}:`, err);
      }
    }
    
    // Update metadata
    metadata.version = version || (metadata.version ? metadata.version + 1 : 1);
    metadata.design = design || metadata.design;
    metadata.updatedAt = new Date().toISOString();
    metadata.updatedBy = userId;
    
    // Add subcategory if provided
    if (subcategory) {
      metadata.subcategory = subcategory;
    }
    
    // Add previous version to history if provided
    if (previousVersion) {
      metadata.previousVersions = metadata.previousVersions || [];
      metadata.previousVersions.push(previousVersion);
    }
    
    // Write metadata back to file
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    return NextResponse.json({
      template: {
        id: sanitizedId,
        name: template.name,
        category: template.category,
        subcategory: metadata.subcategory,
        design: metadata.design,
        version: metadata.version,
        updatedAt: metadata.updatedAt
      }
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// PATCH: Preview a template with variables
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
    const { templateId, variables, html } = await request.json();
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Sanitize template ID for consistency
    const sanitizedId = sanitizeTemplateId(templateId);
    
    // Render template with variables
    let renderedHtml;
    
    if (html) {
      // Render the provided HTML with variables
      renderedHtml = await templateManager.renderHtml(html, variables);
    } else {
      // Render the stored template with variables
      renderedHtml = await templateManager.renderTemplate(sanitizedId, variables);
    }
    
    return NextResponse.json({
      renderedHtml
    });
  } catch (error) {
    console.error('Failed to preview template:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
