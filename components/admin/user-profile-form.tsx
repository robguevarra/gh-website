'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { updateUserProfile } from '@/app/actions/admin-users';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Save } from 'lucide-react';

// Define the form schema with Zod for validation
const profileFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.string(),
  status: z.string(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  acquisition_source: z.string().optional(),
  tags: z.string().optional(),
  admin_notes: z.string().optional(),
  is_verified: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfileFormProps {
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    role: string;
    status?: string;
    avatar_url?: string | null;
    acquisition_source?: string | null;
    tags?: string[] | null;
    admin_metadata?: any | null;
    is_verified?: boolean;
  };
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export function UserProfileForm({ user, roles }: UserProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<ProfileFormValues | null>(null);
  
  // Parse tags from array to comma-separated string and vice versa
  const tagsString = user.tags ? user.tags.join(', ') : '';
  
  // Initialize the form with default values from the user
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status || 'active',
      avatar_url: user.avatar_url || '',
      acquisition_source: user.acquisition_source || '',
      tags: tagsString,
      admin_notes: user.admin_metadata?.notes || '',
      is_verified: user.is_verified || false,
    },
  });

  // Handle form submission
  function onSubmit(data: ProfileFormValues) {
    // Check if role or status has changed
    if (data.role !== user.role || data.status !== user.status) {
      // Store the data and show confirmation dialog
      setPendingData(data);
      setShowConfirmation(true);
    } else {
      // No sensitive changes, proceed with update
      void updateUserData(data);
    }
  }
  
  // Process the actual update
  async function updateUserData(data: ProfileFormValues) {
    setIsSubmitting(true);
    
    try {
      // Convert tags from string to array
      const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      // Prepare admin metadata
      const admin_metadata = {
        ...user.admin_metadata,
        notes: data.admin_notes,
      };
      
      // Call the server action to update the user profile
      const result = await updateUserProfile(user.id, {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        status: data.status,
        avatar_url: data.avatar_url || null,
        acquisition_source: data.acquisition_source || null,
        tags: tagsArray,
        admin_metadata,
        // Role update will be handled separately in a real implementation
        // as it might involve changes to auth tables
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      // Show success message with optimistic UI update
      toast.success('User profile updated successfully');
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
      setPendingData(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
        <CardDescription>
          Update basic user information and role.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email address" {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        Email address cannot be changed. Contact support for assistance.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/avatar.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for the user's profile image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Account Settings Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Account Settings</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        User Role
                        {field.value !== user.role && (
                          <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700">
                            Will be changed
                          </Badge>
                        )}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This determines what permissions the user has.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Account Status
                        {field.value !== user.status && (
                          <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700">
                            Will be changed
                          </Badge>
                        )}
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Controls whether the user can access the platform.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="is_verified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Verified Account
                      </FormLabel>
                      <FormDescription>
                        Mark this account as verified by an administrator.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Marketing & Analytics Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Marketing & Analytics</h3>
              
              <FormField
                control={form.control}
                name="acquisition_source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquisition Source</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="organic">Organic</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="paid">Paid Advertising</SelectItem>
                        <SelectItem value="email">Email Campaign</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How the user discovered the platform
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="premium, early-adopter, beta-tester" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated tags for segmentation and filtering
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Admin Notes Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Admin Notes</h3>
              
              <FormField
                control={form.control}
                name="admin_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add private notes about this user (not visible to the user)" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      These notes are only visible to administrators
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isSubmitting}>
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
