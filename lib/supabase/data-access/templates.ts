/**
 * Data access functions for templates
 */

import { createServerSupabaseClient } from '@/lib/supabase/client';
import { type Database } from '@/types/supabase';
import { type Template } from '@/lib/stores/student-dashboard/types';

/**
 * Get all templates available to a user
 */
export const getUserTemplates = async ({
  userId, 
  category,
  searchQuery = '',
  limit = 50,
  offset = 0,
}: {
  userId: string;
  category?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<{ templates: Template[]; total: number }> => {
  const supabase = createServerSupabaseClient();
  
  let query = supabase
    .from('templates')
    .select('id, name, type, category, size, thumbnail, downloads, google_drive_id, description, created_at, updated_at', { count: 'exact' })
    .eq('is_public', true);
    
  // Apply category filter if provided
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  
  // Apply search filter if provided
  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`);
  }
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
  
  // Transform the data to match our Template type
  const templates: Template[] = (data || []).map(template => ({
    id: template.id,
    name: template.name,
    type: template.type,
    category: template.category,
    size: template.size,
    thumbnail: template.thumbnail,
    downloads: template.downloads,
    googleDriveId: template.google_drive_id,
    description: template.description || '',
    createdAt: template.created_at,
    updatedAt: template.updated_at
  }));
  
  return { templates, total: count || 0 };
};

/**
 * Get template categories
 */
export const getTemplateCategories = async (): Promise<string[]> => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('templates')
    .select('category')
    .eq('is_public', true)
    .order('category', { ascending: true });
    
  if (error) {
    console.error('Error fetching template categories:', error);
    throw error;
  }
  
  // Extract unique categories
  const categories = [...new Set(data.map(item => item.category))];
  
  return categories;
};

/**
 * Get a specific template by ID
 */
export const getTemplateById = async ({
  templateId,
}: {
  templateId: string;
}): Promise<Template | null> => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, type, category, size, thumbnail, downloads, google_drive_id, description, created_at, updated_at')
    .eq('id', templateId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // Template not found
      return null;
    }
    console.error('Error fetching template:', error);
    throw error;
  }
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    category: data.category,
    size: data.size,
    thumbnail: data.thumbnail,
    downloads: data.downloads,
    googleDriveId: data.google_drive_id,
    description: data.description || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

// New Type for Detailed Email Templates
export interface EmailTemplateDetail {
  id: string;
  name: string;
  subject: string | null;
  category: string | null;
  html_content: string | null;
  design_json: any | null; // Mapped from 'design' column
  version: number | null;
  tags: string[] | null;
  created_at: string | null; 
  updated_at: string | null; 
}

/**
 * Get a specific email template by ID, including its design and content.
 */
export const getEmailTemplateById = async (
  templateId: string
): Promise<EmailTemplateDetail | null> => {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('email_templates') 
    .select(`
      id,
      name,
      subject,
      category,
      html_content,
      design,  
      version,
      tags,
      created_at,
      updated_at
    `)
    .eq('id', templateId)
    .single<Pick<Database['public']['Tables']['email_templates']['Row'], 'id' | 'name' | 'subject' | 'category' | 'html_content' | 'design' | 'version' | 'tags' | 'created_at' | 'updated_at'>>(); 
    
  if (error) {
    if (error.code === 'PGRST116') {
      // Template not found
      console.warn(`Email template with id ${templateId} not found.`);
      return null;
    }
    console.error('Error fetching email template:', error);
    throw error;
  }
  
  if (!data) return null;
  
  // Ensure design_json is an object if it's null/undefined from DB
  // to prevent issues with Unlayer expecting an object.
  const designJson = data.design || {}; 

  return {
    id: data.id,
    name: data.name,
    subject: data.subject,
    category: data.category,
    html_content: data.html_content,
    design_json: designJson, // Use the potentially defaulted design_json
    version: data.version,
    tags: data.tags,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}; 

/**
 * Increment download count for a template
 */
export const incrementTemplateDownloads = async ({
  templateId,
}: {
  templateId: string;
}): Promise<void> => {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase.rpc('increment_template_downloads', {
    template_id: templateId
  });
  
  if (error) {
    console.error('Error incrementing template downloads:', error);
    throw error;
  }
};
