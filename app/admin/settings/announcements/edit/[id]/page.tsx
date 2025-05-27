import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AnnouncementForm from '@/components/admin/announcements/AnnouncementForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

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
  // Await params to fix the dynamic API error
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const announcement = await fetchAnnouncementById(id);

  if (!announcement) {
    notFound(); // Triggers the not-found page
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin">Admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin/settings">Settings</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin/settings/announcements">Announcements</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <Link href="/admin/settings/announcements">
              <ChevronLeft className="h-4 w-4" />
              Back to Announcements
            </Link>
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Edit Announcement</h1>
        <AnnouncementForm initialData={announcement} isEditing={true} />
      </div>
    </div>
  );
}
