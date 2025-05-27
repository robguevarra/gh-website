import React from 'react';
import AnnouncementForm from '@/components/admin/announcements/AnnouncementForm';

export default async function NewAnnouncementPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Announcement</h1>
        <AnnouncementForm isEditing={false} />
      </div>
    </div>
  );
}
