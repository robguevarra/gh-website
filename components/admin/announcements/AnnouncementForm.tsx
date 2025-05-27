"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Assuming you have a DatePicker component, or you might use <Input type="datetime-local" />
// import { DatePicker } from '@/components/ui/date-picker'; 
import { createAnnouncementSchema, announcementStatusSchema, announcementTypeSchema } from '@/lib/validations/announcement';
import type { Announcement } from './AnnouncementsClient'; // Re-using the type

// Infer the type from the Zod schema
export type AnnouncementFormData = z.infer<typeof createAnnouncementSchema>;

interface AnnouncementFormProps {
  initialData?: Announcement | null;
  isEditing: boolean;
}

export default function AnnouncementForm({ initialData, isEditing }: AnnouncementFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema), // We might need a different schema for updates if fields differ
    defaultValues: initialData
      ? {
          ...initialData,
          type: initialData.type as AnnouncementFormData['type'], // Cast to specific union type
          status: initialData.status as AnnouncementFormData['status'], // Cast to specific union type
          publish_date: initialData.publish_date ? new Date(initialData.publish_date).toISOString().substring(0, 16) : undefined,
          expiry_date: initialData.expiry_date ? new Date(initialData.expiry_date).toISOString().substring(0, 16) : undefined,
          link_url: initialData.link_url ?? '',
          link_text: initialData.link_text ?? '',
          image_url: initialData.image_url ?? '',
          host_name: initialData.host_name ?? '',
          host_avatar_url: initialData.host_avatar_url ?? '',
          sort_order: initialData.sort_order ?? 0, // Assuming 0 is a safe default if null
        }
      : {
          title: '',
          content: '',
          type: 'general_update',
          status: 'draft',
          publish_date: undefined,
          expiry_date: undefined,
          link_url: '',
          link_text: '',
          image_url: '',
          host_name: '',
          host_avatar_url: '',
          target_audience: 'all_users',
          sort_order: 0,
        },
  });

  const onSubmit = async (values: AnnouncementFormData) => {
    setIsLoading(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/admin/announcements/${initialData?.id}` : '/api/admin/announcements';

      // Convert date strings back to ISO strings for the API if they are not empty
      const payload = {
        ...values,
        publish_date: values.publish_date ? new Date(values.publish_date).toISOString() : null,
        expiry_date: values.expiry_date ? new Date(values.expiry_date).toISOString() : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      toast.success(isEditing ? 'Announcement updated successfully!' : 'Announcement created successfully!');
      router.push('/admin/settings/announcements');
      router.refresh(); // Refresh server components
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter announcement title" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter announcement content (Markdown supported)" {...field} rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select announcement type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {announcementTypeSchema.options.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select announcement status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {announcementStatusSchema.options.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="publish_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publish Date</FormLabel>
                <FormControl>
                  {/* Replace with DatePicker if available */}
                  <Input type="datetime-local" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>When the announcement should become visible.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>When the announcement should cease to be visible.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: Order in which to display (lower numbers first).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium pt-4 border-t">Optional Details</h3>

        <FormField
          control={form.control}
          name="link_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/learn-more" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: A URL for a call to action or more information.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="link_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link Text (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Learn More" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: Text for the call to action link (e.g., 'Learn More', 'Register Now').
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: URL of an image to display with the announcement.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium pt-4 border-t">Host Information (for 'Live Class' type)</h3>

        <FormField
          control={form.control}
          name="host_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: Name of the host (for 'Live Class' type).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="host_avatar_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host Avatar URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/avatar.png" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Optional: URL for the host's avatar image (for 'Live Class' type).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* target_audience is not included in createAnnouncementSchema by default, add if needed */}
        {/* <FormField
          control={form.control}
          name="target_audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Audience</FormLabel>
              <FormControl>
                <Input placeholder="e.g., all_users" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Announcement')}
        </Button>
      </form>
    </Form>
  );
}
