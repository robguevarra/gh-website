'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const membershipFormSchema = z.object({
  membership_tier_id: z.string(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']),
  auto_renew: z.boolean().default(true),
  expires_at: z.date().optional(),
  admin_notes: z.string().optional(),
  override_expiration: z.boolean().default(false),
});

type MembershipFormValues = z.infer<typeof membershipFormSchema>;

interface MembershipTier {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  description: string | null;
}

interface UserMembershipFormProps {
  userId: string;
  membership: {
    id: string;
    tier_id: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    payment_reference: string | null;
    auto_renew: boolean;
    admin_notes?: string | null;
  } | null;
  membershipTiers: MembershipTier[];
}

export function UserMembershipForm({
  userId,
  membership,
  membershipTiers,
}: UserMembershipFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set default values for the form
  const defaultValues: Partial<MembershipFormValues> = {
    membership_tier_id: membership?.tier_id || '',
    status: membership?.status as any || 'pending',
    auto_renew: membership?.auto_renew ?? true,
    expires_at: membership?.expires_at ? new Date(membership.expires_at) : undefined,
    admin_notes: membership?.admin_notes || '',
    override_expiration: false,
  };

  const form = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues,
  });

  // Watch for changes to fields that affect the UI
  const watchOverrideExpiration = form.watch('override_expiration');
  const watchStatus = form.watch('status');

  async function onSubmit(data: MembershipFormValues) {
    setIsSubmitting(true);
    
    try {
      // Determine if we're creating a new membership or updating existing one
      const method = membership ? 'PATCH' : 'POST';
      const endpoint = membership
        ? `/api/admin/users/${userId}/membership/${membership.id}`
        : `/api/admin/users/${userId}/membership`;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membership_tier_id: data.membership_tier_id,
          status: data.status,
          auto_renew: data.auto_renew,
          expires_at: data.override_expiration && data.expires_at 
            ? data.expires_at.toISOString() 
            : undefined,
          admin_notes: data.admin_notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update membership');
      }
      
      toast.success(`Membership ${membership ? 'updated' : 'created'} successfully`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Membership update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get the selected tier details
  const selectedTierId = form.watch('membership_tier_id');
  const selectedTier = membershipTiers.find(tier => tier.id === selectedTierId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Information</CardTitle>
        <CardDescription>
          Manage this user's membership status and details.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Current membership status */}
            {membership && (
              <div className="rounded-md bg-muted p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Current Membership</p>
                    <div className="flex items-center mt-1">
                      <Badge 
                        variant={
                          membership.status === 'active' ? 'default' :
                          membership.status === 'cancelled' ? 'destructive' :
                          membership.status === 'expired' ? 'outline' : 'secondary'
                        }
                      >
                        {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">
                        Since {new Date(membership.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Expiration</p>
                    <p className="text-sm">
                      {membership.expires_at 
                        ? new Date(membership.expires_at).toLocaleDateString() 
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Membership Tier Selection */}
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
                          {tier.name} (${tier.price_monthly}/mo or ${tier.price_yearly}/yr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedTier?.description || 'Choose a membership tier for this user.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Status</FormLabel>
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Controls user access to premium content.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-renew Switch */}
            <FormField
              control={form.control}
              name="auto_renew"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Auto-Renewal
                    </FormLabel>
                    <FormDescription>
                      Automatically renew this membership when it expires
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={watchStatus !== 'active'}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            {/* Override Expiration Date */}
            <FormField
              control={form.control}
              name="override_expiration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <FormLabel className="text-base">
                        Override Expiration Date
                      </FormLabel>
                      <AlertTriangle className="h-4 w-4 text-amber-500 ml-2" />
                    </div>
                    <FormDescription>
                      Manually set when this membership expires
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

            {/* Expiration Date */}
            {watchOverrideExpiration && (
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiration Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={
                              !field.value ? "text-muted-foreground" : ""
                            }
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date when this membership will expire.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Admin Notes */}
            <FormField
              control={form.control}
              name="admin_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Notes</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add any administrative notes about this membership"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes are only visible to administrators.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            {membership && membership.status !== 'cancelled' && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  form.setValue('status', 'cancelled');
                  form.setValue('auto_renew', false);
                }}
              >
                Cancel Membership
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 