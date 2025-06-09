'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createFraudFlag } from '@/lib/actions/affiliate-actions';

const flagSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  details: z.string().optional(),
});

type FlagFormValues = z.infer<typeof flagSchema>;

interface CreateFraudFlagDialogProps {
  affiliateId: string;
  affiliateName: string;
  onFlagCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateFraudFlagDialog({
  affiliateId,
  affiliateName,
  onFlagCreated,
  trigger,
}: CreateFraudFlagDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FlagFormValues>({
    resolver: zodResolver(flagSchema),
    defaultValues: {
      reason: '',
      details: '',
    },
  });

  const onSubmit = async (values: FlagFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createFraudFlag({
        affiliateId,
        reason: values.reason,
        details: values.details ? { notes: values.details } : undefined,
      });

      if (result.success) {
        toast.success('Fraud flag created successfully');
        form.reset();
        setIsOpen(false);
        if (onFlagCreated) onFlagCreated();
      } else {
        toast.error(result.error || 'Failed to create fraud flag');
      }
    } catch (error) {
      console.error('Error creating fraud flag:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <AlertTriangle className="h-4 w-4" />
            Flag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Fraud Flag</DialogTitle>
          <DialogDescription>
            Create a fraud flag for {affiliateName}. This will be visible to all admins.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Suspicious activity" {...field} />
                  </FormControl>
                  <FormDescription>
                    A brief reason for flagging this affiliate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about suspicious behavior or concerns"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Flag'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
