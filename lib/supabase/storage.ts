import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'course-media';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to normalize file paths to avoid potential issues
const normalizePath = (path: string) => {
  // Remove leading slashes and ensure consistent format
  return path.replace(/^\/+/, '');
};

// Client-side upload utility
export const uploadFile = async (file: File, folder: string = 'images') => {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create a unique file path to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${normalizePath(folder)}/${fileName}`;
    
    // Upload the file
    const { error, data } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
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
      fileName,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get files in a folder
export const getFiles = async (folder: string = 'images') => {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .list(normalizePath(folder), {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) throw error;
    
    if (!data) return [];
    
    // Add public URLs to each file
    const filesWithUrls = data.map((file: any) => {
      const { data: { publicUrl } } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(`${normalizePath(folder)}/${file.name}`);
      
      return {
        ...file,
        url: publicUrl
      };
    });
    
    return filesWithUrls;
  } catch (error) {
    console.error('Error getting files:', error);
    throw error;
  }
};

// Delete a file
export const deleteFile = async (filePath: string) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .remove([normalizePath(filePath)]);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Create a folder
export const createFolder = async (folderPath: string) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // To create a folder in Supabase Storage, we upload an empty file with a trailing slash
    const { error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(`${normalizePath(folderPath)}/.folder`, new Blob([]), {
        cacheControl: '0',
        upsert: false
      });
    
    if (error && error.message !== 'The resource already exists') throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

// List all folders
export const getFolders = async () => {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .list('', {
        limit: 100,
        offset: 0
      });
    
    if (error) throw error;
    
    if (!data) return [];
    
    // Filter to only include folders (objects ending with '/')
    const folders = data
      .filter((item: any) => item.id.endsWith('/') || item.name === '.folder')
      .map((item: any) => ({
        name: item.name === '.folder' 
          ? item.id.split('/').filter(Boolean).pop() || item.id
          : item.name.replace('/', ''),
        id: item.id,
        path: item.id
      }));
    
    return folders;
  } catch (error) {
    console.error('Error getting folders:', error);
    throw error;
  }
}; 