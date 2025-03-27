'use server';

import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'course-media';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to normalize file paths to avoid potential issues
const normalizePath = (path: string) => {
  // Remove leading slashes and ensure consistent format
  return path.replace(/^\/+/, '');
};

// Server-side upload utility
export async function uploadFileServer(file: ArrayBuffer, fileName: string, contentType: string, folder: string = 'images') {
  try {
    // Use service role key for server operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Create a unique file path
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${normalizePath(folder)}/${uniqueFileName}`;
    
    // Upload the file
    const { error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get the public URL for the file
    const { data: { publicUrl } } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);
    
    return {
      path: filePath,
      url: publicUrl,
      fileName: uniqueFileName,
      originalName: fileName
    };
  } catch (error) {
    console.error('Error uploading file on server:', error);
    throw error;
  }
} 