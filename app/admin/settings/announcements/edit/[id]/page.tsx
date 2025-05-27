import React from 'react';
import { notFound } from 'next/navigation';
import AnnouncementForm from '@/components/admin/announcements/AnnouncementForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Announcement = Database['public']['Tables']['announcements']['Row'];

async function fetchAnnouncementById(id: string): Promise<Announcement | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching announcement by ID:', error);
    // If it's a 'PGRST116' error (resource not found), we'll handle it with notFound()
    if (error.code === 'PGRST116') {
      return null;
    }
    // For other errors, you might want to throw or handle differently
    throw new Error('Failed to fetch announcement details.');
  }
  return data;
}

interface EditAnnouncementPageProps {
  params: {
    id: string;
  };
}

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const { id } = params;
  const announcement = await fetchAnnouncementById(id);

  if (!announcement) {
    notFound(); // Triggers the not-found page
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Edit Announcement</h1>
        <AnnouncementForm initialData={announcement} isEditing={true} />
      </div>
    </div>
  );
}
