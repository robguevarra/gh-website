'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCampaignStore } from '@/lib/hooks/use-campaign-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, ArrowLeft } from 'lucide-react';
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
import { cn } from '@/lib/utils';

// Form validation schema
const schedulerFormSchema = z.object({
  scheduledDate: z.date({
    required_error: 'Please select a date',
  }),
  scheduledTime: z.string({
    required_error: 'Please enter a time',
  }).regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in 24-hour format (HH:MM)'),
});

type SchedulerFormValues = z.infer<typeof schedulerFormSchema>;

interface CampaignSchedulerProps {
  campaignId: string;
}

export function CampaignScheduler({ campaignId }: CampaignSchedulerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentCampaign, fetchCampaign, scheduleCampaign } = useCampaignStore();
  
  // Initialize form with default values
  const defaultValues: Partial<SchedulerFormValues> = {
    scheduledDate: new Date(),
    scheduledTime: '12:00',
  };
  
  const form = useForm<SchedulerFormValues>({
    resolver: zodResolver(schedulerFormSchema),
    defaultValues,
  });
  
  // Load campaign data if not already loaded
  useState(() => {
    if (!currentCampaign || currentCampaign.id !== campaignId) {
      fetchCampaign(campaignId);
    }
  });
  
  const onSubmit = async (values: SchedulerFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Combine date and time into a single ISO string
      const { scheduledDate, scheduledTime } = values;
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      
      // Schedule the campaign
      await scheduleCampaign(campaignId, scheduledDateTime.toISOString());
      
      toast({
        title: 'Campaign scheduled',
        description: `Campaign scheduled for ${format(scheduledDateTime, 'PPP')} at ${format(scheduledDateTime, 'p')}`,
      });
      
      // Redirect back to campaign detail
      router.push(`/admin/email/campaigns/${campaignId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => router.push(`/admin/email/campaigns/${campaignId}`)}
        className="flex items-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaign
      </Button>
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Schedule Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                      Select the date when the campaign should be sent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (24-hour format)</FormLabel>
                    <FormControl>
                      <Input placeholder="14:30" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the time in 24-hour format (e.g., 14:30 for 2:30 PM)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <CardFooter className="flex justify-end px-0 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Campaign'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
