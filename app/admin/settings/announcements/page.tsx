import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AnnouncementsClient, { type Announcement } from '@/components/admin/announcements/AnnouncementsClient';

async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    // In a real app, you might throw the error or return a specific error state
    return []; 
  }
  return data || [];
}

export default async function AdminAnnouncementsPage() {
  const announcements = await fetchAnnouncements();

  return (
    <div className="container mx-auto py-10">
      {/* The main title is now part of AnnouncementsClient, but we can keep a general page title if needed */}
      {/* <h1 className="text-3xl font-bold mb-6">Announcements Management</h1> */}
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
