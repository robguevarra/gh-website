"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner'; 
import type { Database } from '@/types/supabase';

// Define the type for a single announcement based on Supabase schema
export type Announcement = Database['public']['Tables']['announcements']['Row'];

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[];
}

export default function AnnouncementsClient({ initialAnnouncements }: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const router = useRouter(); 

  // TODO: Implement functions for create, edit

  const openDeleteDialog = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;

    try {
      const response = await fetch(`/api/admin/announcements/${announcementToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete announcement');
      }

      setAnnouncements((prev) => prev.filter((ann) => ann.id !== announcementToDelete.id));
      toast.success('Announcement deleted successfully!');
      router.refresh(); 
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setShowDeleteDialog(false);
      setAnnouncementToDelete(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Manage Announcements</h2>
        <Button asChild>
          <Link href="/admin/settings/announcements/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Announcement
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publish Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">{announcement.title}</TableCell>
                  <TableCell>{announcement.type}</TableCell>
                  <TableCell>{announcement.status}</TableCell>
                  <TableCell>
                    {announcement.publish_date
                      ? new Date(announcement.publish_date).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/settings/announcements/edit/${announcement.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(announcement)} >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No announcements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the announcement
              titled "<strong>{announcementToDelete?.title}</strong>".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
