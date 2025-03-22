'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';
import slugify from 'slugify';

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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define schema for form validation
const courseFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    }),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean().default(false),
  thumbnail_url: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  trailer_url: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  required_tier_id: z.string().uuid().optional().or(z.literal('none')),
  auto_generate_slug: z.boolean().default(true),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

// Define props for the component
interface MembershipTier {
  id: string;
  name: string;
  description?: string;
}

interface CourseFormProps {
  initialData?: Partial<CourseFormValues> & { id?: string };
  membershipTiers: MembershipTier[];
  isEditing?: boolean;
  isUnified?: boolean;
}

export default function CourseForm({
  initialData,
  membershipTiers,
  isEditing = false,
  isUnified = false,
}: CourseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(
    initialData?.auto_generate_slug !== false
  );

  // Initialize the form with default values or existing data
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      status: (initialData?.status as any) || 'draft',
      is_featured: initialData?.is_featured || false,
      thumbnail_url: initialData?.thumbnail_url || '',
      trailer_url: initialData?.trailer_url || '',
      required_tier_id: initialData?.required_tier_id || 'none',
      auto_generate_slug: initialData?.auto_generate_slug !== false,
    },
  });

  // Watch the title field to auto-generate slug
  const title = form.watch('title');

  // Handle title changes to auto-update slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('title', e.target.value);
    
    if (autoGenerateSlug) {
      const newSlug = slugify(e.target.value, { lower: true, strict: true });
      form.setValue('slug', newSlug);
    }
  };

  // Toggle auto-generate slug
  const handleAutoGenerateChange = (checked: boolean) => {
    setAutoGenerateSlug(checked);
    form.setValue('auto_generate_slug', checked);
    
    if (checked) {
      const newSlug = slugify(title, { lower: true, strict: true });
      form.setValue('slug', newSlug);
    }
  };

  // Handle form submission
  const onSubmit = async (values: CourseFormValues) => {
    setIsLoading(true);

    try {
      // Omit the auto_generate_slug field and process required_tier_id
      const { auto_generate_slug, ...formData } = values;
      
      // Convert 'none' to null for required_tier_id
      const courseData = {
        ...formData,
        required_tier_id: formData.required_tier_id === 'none' ? null : formData.required_tier_id
      };
      
      const apiEndpoint = isEditing
        ? `/api/admin/courses/${initialData?.id}`
        : '/api/admin/courses';
        
      const method = isEditing ? 'PATCH' : 'POST';

      console.log('Submitting form data:', { apiEndpoint, method, courseData });

      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} course`);
      }
      
      const course = await response.json();
      console.log('API success response:', course);
      
      // Provide more detailed feedback with specific fields that were updated
      const courseTitle = values.title;
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">{`Course ${isEditing ? 'updated' : 'created'} successfully`}</p>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? `"${courseTitle}" has been updated with your changes.` 
              : `"${courseTitle}" has been created and is ready to edit.`}
          </p>
        </div>,
        {
          duration: 4000,
          action: {
            label: isEditing ? "View Changes" : "View Course",
            onClick: () => {
              if (isUnified) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                router.push(`/admin/courses/${course.id}/unified`);
              }
            }
          }
        }
      );
      
      if (!isUnified) {
        router.push('/admin/courses');
        router.refresh();
      } else {
        // Briefly highlight form to indicate successful update
        const formElement = document.querySelector('form');
        if (formElement) {
          formElement.classList.add('bg-green-50', 'border-green-200');
          setTimeout(() => {
            formElement.classList.remove('bg-green-50', 'border-green-200');
          }, 2000);
        }
        router.refresh();
      }
    } catch (error) {
      console.error('Form submission error details:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // If unified mode, we render without tabs as they're handled by the parent
  if (isUnified) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Introduction to Homeschooling"
                        {...field}
                        onChange={handleTitleChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      The name of your course as it will appear to users.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <FormLabel htmlFor="slug">Course Slug</FormLabel>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-generate"
                    checked={autoGenerateSlug}
                    onCheckedChange={handleAutoGenerateChange}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="auto-generate"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Auto-generate from title
                  </label>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="introduction-to-homeschooling"
                        {...field}
                        disabled={autoGenerateSlug || isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      The URL-friendly identifier for your course.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a description of your course..."
                        rows={5}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief overview of what students will learn.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Controls visibility and access to the course.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/thumbnail.jpg"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to the course thumbnail image.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="trailer_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trailer Video URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/trailer.mp4"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to a trailer or promotional video for the course.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormField
                control={form.control}
                name="required_tier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Membership Tier</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a membership tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None - Available to all</SelectItem>
                        {membershipTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The minimum tier required to access this course.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Featured Course</FormLabel>
                      <FormDescription>
                        Highlight this course on the homepage and in featured sections.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  // Original tabbed version for standalone course form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="access">Access & Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Introduction to Homeschooling"
                              {...field}
                              onChange={handleTitleChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            The name of your course as it will appear to users.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel htmlFor="slug">Course Slug</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="auto-generate"
                          checked={autoGenerateSlug}
                          onCheckedChange={handleAutoGenerateChange}
                          disabled={isLoading}
                        />
                        <label
                          htmlFor="auto-generate"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Auto-generate from title
                        </label>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="introduction-to-homeschooling"
                              {...field}
                              disabled={autoGenerateSlug || isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            The URL-friendly identifier for your course.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter a description of your course..."
                              rows={5}
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a brief overview of what students will learn.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Controls visibility and access to the course.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="thumbnail_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/thumbnail.jpg"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            URL to the course thumbnail image.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="trailer_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trailer Video URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/trailer.mp4"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            URL to a trailer or promotional video for the course.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <FormField
                      control={form.control}
                      name="required_tier_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required Membership Tier</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a membership tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None - Available to all</SelectItem>
                              {membershipTiers.map((tier) => (
                                <SelectItem key={tier.id} value={tier.id}>
                                  {tier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The minimum tier required to access this course.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="is_featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Featured Course</FormLabel>
                            <FormDescription>
                              Highlight this course on the homepage and in featured sections.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/courses')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 