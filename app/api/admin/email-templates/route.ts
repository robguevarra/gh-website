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
import templateManager from '@/lib/services/email/template-manager';
import { DetailedTemplate, TemplateMetadata, TemplateVariables } from './template-types';
import { createRouteHandlerClient, validateAdminAccess, handleUnauthorized, handleAdminOnly } from '@/lib/supabase/route-handler';
import { securityLogger } from '@/lib/security/security-logger';

// Process template variables - replaces {{variableName}} with values from variables object
function processTemplateVariables(template: string, variables: TemplateVariables): string {
  let processed = template;
  
  // Replace each variable in the template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{s*${key}s*}}`, 'g');
    processed = processed.replace(regex, value ? String(value) : '');
  }
  
  // Convert literal \n to HTML <br> tags
  processed = processed.replace(/\n/g, '<br />');
  
  return processed;
}

/**
 * Helper function to sanitize a template ID
 * Ensures we use consistent IDs that work as filenames across the system
 */
const sanitizeTemplateId = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
};

// GET: List all templates OR get a specific template by ID
export async function GET(request: NextRequest) {
  // Verify user is authenticated and has admin access
  const authResult = await validateAdminAccess();
  
  if (authResult.error) {
    securityLogger.warn('Unauthorized access attempt to admin email templates', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: 'GET /api/admin/email-templates',
      error: authResult.error
    });
    
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  const user = authResult.user;
  
  // Ensure user is valid
  if (!user) {
    return NextResponse.json(
      { error: 'User authentication failed' },
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
      // Get Supabase client
      const supabase = await createRouteHandlerClient();
      
      // Fetch templates from Supabase database
      const { data: templates, error: fetchError } = await supabase
        .from('email_templates')
        .select('id, name, category, subcategory, created_at, updated_at, version, tags, active, metadata')
        .order('category')
        .order('name');
      
      if (fetchError) {
        console.error('Error fetching templates from Supabase:', fetchError);
        throw new Error(fetchError.message);
      }
      
      // Map to the format expected by the frontend
      const formattedTemplates = templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        subcategory: template.subcategory,
        updatedAt: template.updated_at,
        version: template.version,
        tags: template.tags,
        active: template.active
      }));
      
      // If database has no templates, try to initialize from file system as fallback
      if (formattedTemplates.length === 0) {
        console.log('No templates found in database, checking filesystem...');
        
        // Initialize template manager if needed
        await templateManager.initialize();
        
        // This is just a fallback and will be removed once all templates are in the database
        // Code intentionally left minimized as it's only for fallback and transition
      }
      
      return NextResponse.json({ templates: formattedTemplates });
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
    // Get Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Fetch the specific template from database
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching template ${templateId} from Supabase:`, fetchError);
      
      // If not found in database, check by name as fallback
      if (fetchError.code === 'PGRST116') { // Not found error
        const findTemplate = async (name: string) => {
          // Attempt to find template in database first
          const { data: templateByName, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('name', name)
            .maybeSingle();
          
          // Type-safe handling for database response
          let safeTemplateByName: Record<string, any> | null = null;
          if (templateByName) {
            safeTemplateByName = {
              ...templateByName,
              previous_versions: Array.isArray(templateByName.previous_versions) 
                ? templateByName.previous_versions 
                : []
            };
          }
          
          return safeTemplateByName;
        };
        
        const safeTemplateByName = await findTemplate(templateId);
        
        if (!safeTemplateByName) {
          return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        
        // Process template with variables if provided
        let renderedHtml = safeTemplateByName.html_content;
        if (variables) {
          renderedHtml = processTemplateVariables(safeTemplateByName.html_content, variables);
        }
        
        // Map database fields to the expected format
        const formattedTemplate: DetailedTemplate = {
          id: safeTemplateByName.id,
          name: safeTemplateByName.name,
          category: safeTemplateByName.category,
          subcategory: safeTemplateByName.subcategory || '',
          version: safeTemplateByName.version || 1,
          htmlTemplate: safeTemplateByName.html_content || '',
          renderedHtml,
          subject: safeTemplateByName.subject || '',
          design: safeTemplateByName.design,
          updatedAt: safeTemplateByName.updated_at || new Date().toISOString(),
          previousVersions: safeTemplateByName.previous_versions.map((versionItem: Record<string, any>) => {
            // Safely cast JSON data from database to expected structure
            const v = versionItem;
            return {
              version: typeof v?.version === 'number' ? v.version : 1,
              htmlTemplate: typeof v?.htmlTemplate === 'string' ? v.htmlTemplate : '',
              design: v?.design,
              updatedAt: typeof v?.updatedAt === 'string' ? v.updatedAt : new Date().toISOString(),
              editedBy: typeof v?.editedBy === 'string' ? v.editedBy : undefined
            };
          })
        };
        
        return NextResponse.json({ template: formattedTemplate });
      }
      
      throw new Error(fetchError.message);
    }
    
    // Process template with variables if provided
    let renderedHtml = template.html_content;
    if (variables) {
      renderedHtml = processTemplateVariables(template.html_content, variables);
    }
    
    // Map database fields to the expected format
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      category: template.category,
      subcategory: template.subcategory || '',
      updatedAt: template.updated_at || new Date().toISOString(),
      version: template.version || 1,
      htmlTemplate: template.html_content || '',
      renderedHtml,
      subject: template.subject || '',
      design: template.design,
      previousVersions: Array.isArray(template.previous_versions) 
        ? template.previous_versions.map((versionItem) => {
            // Safely handle potentially null items in the array
            if (!versionItem || typeof versionItem !== 'object') {
              return {
                version: 1,
                htmlTemplate: '',
                design: null,
                updatedAt: new Date().toISOString(),
                editedBy: undefined
              };
            }
            
            // Process valid version item
            const v = versionItem as any;
            return {
              version: typeof v.version === 'number' ? v.version : 1,
              htmlTemplate: typeof v.htmlTemplate === 'string' ? v.htmlTemplate : '',
              design: v.design,
              updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : new Date().toISOString(),
              editedBy: typeof v.editedBy === 'string' ? v.editedBy : undefined
            };
          })
        : []
    };
    
    // Return the properly formatted template with type-safe data
    return NextResponse.json({ template: formattedTemplate });
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
  // Verify user is authenticated and has admin access
  const authResult = await validateAdminAccess();
  
  if (authResult.error) {
    securityLogger.warn('Unauthorized access attempt to create template', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: 'POST /api/admin/email-templates',
      error: authResult.error
    });
    
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  const user = authResult.user;
  
  // Ensure user is valid
  if (!user) {
    return NextResponse.json(
      { error: 'User authentication failed' },
      { status: 401 }
    );
  }
  
  try {
    const { name, category, subcategory, description, design, htmlTemplate, subject } = await request.json();
    
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }
    
    // Get Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Create initial HTML content from design or use minimal template
    const initialHtml = htmlTemplate || `<!DOCTYPE html>
<html>
<head>
    <title>${name}</title>
</head>
<body>
    <h1>${name}</h1>
    <p>This is a starter template created with Unlayer.</p>
</body>
</html>`;
    
    // Create the template in Supabase database
    const { data: newTemplate, error: createError } = await supabase
      .from('email_templates')
      .insert({
        name,
        category,
        subcategory: subcategory || null,
        description: description || `${name} template created using Unlayer Editor`,
        subject: subject || name,
        html_content: initialHtml,
        text_content: '', // Will be generated from HTML if needed
        design: design || null,
        version: 1,
        active: true,
        variables: [],
        previous_versions: [],
        metadata: {
          createdBy: user.id,
          createdAt: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating template in Supabase:', createError);
      return NextResponse.json(
        { error: `Failed to create template: ${createError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`✅ Template created successfully in Supabase:`, newTemplate.id);
    
    // Format the response to match the expected frontend structure
    const formattedTemplate = {
      id: newTemplate.id,
      name: newTemplate.name,
      category: newTemplate.category,
      subcategory: newTemplate.subcategory,
      design: newTemplate.design,
      htmlTemplate: newTemplate.html_content,
      renderedHtml: newTemplate.html_content,
      subject: newTemplate.subject,
      version: newTemplate.version,
      updatedAt: newTemplate.updated_at,
      previousVersions: []
    };
    
    return NextResponse.json({ 
      template: formattedTemplate,
      message: 'Template created successfully'
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
  // Verify user is authenticated and has admin access
  const authResult = await validateAdminAccess();
  
  if (authResult.error) {
    securityLogger.warn('Unauthorized access attempt to update template', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: 'PUT /api/admin/email-templates',
      error: authResult.error
    });
    
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  const user = authResult.user;
  
  // Ensure user is valid
  if (!user) {
    return NextResponse.json(
      { error: 'User authentication failed' },
      { status: 401 }
    );
  }
  
  try {
    const requestBody = await request.json();    
    const { templateId, htmlTemplate, design, category, subcategory, version, previousVersion } = requestBody;
    
    if (!templateId || !htmlTemplate) {
      return NextResponse.json(
        { error: 'Template ID and HTML content are required' },
        { status: 400 }
      );
    }
    
    // Get current timestamp for updates
    const now = new Date().toISOString();
    
    // Get Supabase client
    const supabase = await createRouteHandlerClient();
    
    // First, get the existing template to check if it exists and to preserve any data we're not updating
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching template ${templateId}:`, fetchError);
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }
    
    // Prepare previous versions array if we need to archive the current version
    let previousVersions = existingTemplate.previous_versions || [];
    if (Array.isArray(previousVersions)) {
      if (previousVersion) {
        previousVersions.push(previousVersion);
      } else if (existingTemplate.html_content && existingTemplate.html_content !== htmlTemplate) {
        // Automatically create previous version if content changed
        previousVersions.push({
          version: existingTemplate.version || 1,
          htmlTemplate: existingTemplate.html_content,
          design: existingTemplate.design,
          updatedAt: existingTemplate.updated_at
        });
      }
    } else {
      // If previousVersions is not an array, initialize it
      previousVersions = [];
      if (previousVersion) {
        previousVersions.push(previousVersion);
      } else if (existingTemplate.html_content && existingTemplate.html_content !== htmlTemplate) {
        previousVersions.push({
          version: existingTemplate.version || 1,
          htmlTemplate: existingTemplate.html_content,
          design: existingTemplate.design,
          updatedAt: existingTemplate.updated_at
        });
      }
    }
    
    // Increment version if not explicitly provided
    const newVersion = version || (existingTemplate.version ? existingTemplate.version + 1 : 1);
    
    // Prepare the update payload
    // Prepare the update payload
    // Important: design is already a JSON object from request.json(), so we pass it as-is
    // Supabase will store it properly in the JSONB column
    const updatePayload = {
      html_content: htmlTemplate,
      design,  // Do not stringify - pass the JSON object directly
      category: category || existingTemplate.category,
      subcategory: subcategory || existingTemplate.subcategory,
      version: newVersion,
      updated_at: now,
      previous_versions: previousVersions
    };

    
    // Update the template in the database with additional logging
    console.time('Database update operation');
    const { data, error: updateError } = await supabase
      .from('email_templates')
      .update(updatePayload)
      .eq('id', templateId)
      .select()
      .single();
    console.timeEnd('Database update operation');
    
    // Log raw response to debug issues
    
    if (updateError) {
      console.error('Database error updating template:', updateError);
      return NextResponse.json(
        { error: `Failed to update template: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    
    // Return the updated template in the expected format with safe defaults
    return NextResponse.json({
      template: {
        id: data.id,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory || '',
        design: data.design,  // Pass design as-is (JSONB from database)
        version: data.version || 1,
        updatedAt: data.updated_at || new Date().toISOString(),
        htmlTemplate: data.html_content || '',
        previousVersions: Array.isArray(data.previous_versions) 
          ? data.previous_versions.map((versionItem) => {
              // Safely handle potentially null items in the array
              if (!versionItem || typeof versionItem !== 'object') {
                return {
                  version: 1,
                  htmlTemplate: '',
                  design: null,
                  updatedAt: new Date().toISOString(),
                  editedBy: undefined
                };
              }
            
              // Process valid version item
              const v = versionItem as any;
              return {
                version: typeof v.version === 'number' ? v.version : 1,
                htmlTemplate: typeof v.htmlTemplate === 'string' ? v.htmlTemplate : '',
                design: v.design,  // Pass design as-is
                updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : new Date().toISOString(),
                editedBy: typeof v.editedBy === 'string' ? v.editedBy : undefined
              };
            })
          : []
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
  // Verify user is authenticated and has admin access
  const authResult = await validateAdminAccess();
  
  if (authResult.error) {
    securityLogger.warn('Unauthorized access attempt to template preview', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      endpoint: 'PATCH /api/admin/email-templates',
      error: authResult.error
    });
    
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }
  
  const user = authResult.user;
  
  // Ensure user is valid
  if (!user) {
    return NextResponse.json(
      { error: 'User authentication failed' },
      { status: 401 }
    );
  }
  
  try {
    // Convert request data
    const { templateId, html, variables } = await request.json();
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Sanitize template ID for consistency
    const sanitizedId = sanitizeTemplateId(templateId);
    
    // Preview is always the action for PATCH requests
    try {
      let renderedHtml;
      
      if (html) {
        // Render the provided HTML with variables
        renderedHtml = processTemplateVariables(html, variables || {});
      } else {
        // Get template from Supabase
        const supabase = await createRouteHandlerClient();
        const { data: template, error } = await supabase
          .from('email_templates')
          .select('html_content')
          .eq('id', sanitizedId)
          .single();
          
        if (error || !template) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }
        
        // Render with variables
        renderedHtml = processTemplateVariables(template.html_content, variables || {});
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
  } catch (error) {
    console.error('Failed to preview template:', error);
    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    );
  }
}
