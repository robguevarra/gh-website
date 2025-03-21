'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Form schema validation
const formSchema = z.object({
  membership_tier_id: z.string(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface MembershipTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  features?: string[];
}

interface UserMembership {
  id: string;
  user_id: string;
  membership_tier_id: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UserMembershipFormProps {
  userId: string;
  userMembership: UserMembership | null;
  membershipTiers: MembershipTier[];
}

export default function UserMembershipForm({ 
  userId, 
  userMembership, 
  membershipTiers 
}: UserMembershipFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with user membership data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      membership_tier_id: userMembership?.membership_tier_id || '',
      is_active: userMembership?.is_active || false,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const supabase = createBrowserSupabaseClient();
      const now = new Date().toISOString();
      
      if (userMembership) {
        // Update existing membership
        const { error } = await supabase
          .from('user_memberships')
          .update({
            membership_tier_id: values.membership_tier_id,
            is_active: values.is_active,
            updated_at: now,
          })
          .eq('id', userMembership.id);
          
        if (error) throw error;
      } else {
        // Create new membership
        const { error } = await supabase
          .from('user_memberships')
          .insert({
            user_id: userId,
            membership_tier_id: values.membership_tier_id,
            is_active: values.is_active,
            start_date: now,
            created_at: now,
            updated_at: now,
          });
          
        if (error) throw error;
      }
      
      // Show success message
      toast({
        title: 'Membership updated',
        description: 'The user membership has been updated successfully.',
      });
      
      // Refresh page data
      router.refresh();
    } catch (error) {
      console.error('Error updating membership:', error);
      toast({
        title: 'Error',
        description: 'There was an error updating the membership. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Find the current membership tier details
  const currentTier = membershipTiers.find(
    tier => tier.id === userMembership?.membership_tier_id
  );
  
  return (
    <div className="space-y-6">
      {userMembership && (
        <Card>
          <CardHeader>
            <CardTitle>Current Membership Details</CardTitle>
            <CardDescription>
              Information about the user's current membership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Membership Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(userMembership.start_date), 'PPP')}
                </p>
              </div>
              
              {userMembership.end_date && (
                <div>
                  <p className="text-sm font-medium">Membership End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(userMembership.end_date), 'PPP')}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    userMembership.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userMembership.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              
              {currentTier && (
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {currentTier.name} (${currentTier.price})
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="membership_tier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership Tier</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select membership tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {membershipTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name} - ${tier.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the membership tier for this user.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Membership Status
                  </FormLabel>
                  <FormDescription>
                    Enable or disable this user's membership.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </div>
  );
} 