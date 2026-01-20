'use client';

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  template_id: z.string().uuid('Please select a valid template'),
  sender_email: z.string().email('Please enter a valid email address'),
  sender_name: z.string().min(2, 'Sender name must be at least 2 characters'),
  is_ab_test: z.boolean().default(false),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  templates: Array<{ id: string; name: string }>;
  onSuccess?: (campaignId: string) => void;
  initialValues?: Partial<CampaignFormValues>;
}

export function CampaignForm({ 
  templates, 
  onSuccess, 
  initialValues 
}: CampaignFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createCampaign } = useCampaignStore();
  const { toast } = useToast();

  // Initialize form with default values
  const defaultValues: Partial<CampaignFormValues> = {
    name: '',
    description: '',
    template_id: '',
    sender_email: 'noreply@gracefulhomeschooling.com',
    sender_name: 'Graceful Homeschooling',
    is_ab_test: false,
    ...initialValues,
  };

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues,
  });

  const onSubmit = async (values: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const campaign = await createCampaign(values);
      toast({
        title: 'Campaign created',
        description: 'Your campaign has been created successfully.',
      });
      if (onSuccess) {
        onSuccess(campaign.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create New Campaign</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Newsletter 2025" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your campaign
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Campaign details and purpose..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional details about this campaign
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Template</FormLabel>
                  <FormControl>
                    <select
                      className="w-full p-2 border rounded-md"
                      {...field}
                    >
                      <option value="">Select a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Select the email template to use for this campaign
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sender_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Graceful Homeschooling" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sender_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sender Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="noreply@gracefulhomeschooling.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_ab_test"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">A/B Testing</FormLabel>
                    <FormDescription>
                      Enable A/B testing for this campaign
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

            <CardFooter className="flex justify-end px-0 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
