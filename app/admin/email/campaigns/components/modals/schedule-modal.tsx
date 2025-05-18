'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  estimatedAudienceSize: number | null;
  onConfirmSchedule: (scheduleDetails: {
    scheduledAt: string;
    timezone: string;
    isRecurring: boolean;
    recurrence?: { frequency: 'daily' | 'weekly' | 'monthly'; days: number[] };
  }) => Promise<{ success: boolean }>;
  initialScheduledAt?: string | null;
  initialTimezone?: string | null;
  initialIsRecurring?: boolean | null;
  initialRecurrence?: { frequency: 'daily' | 'weekly' | 'monthly'; days: number[] } | null;
}

export function ScheduleModal({
  isOpen,
  onClose,
  campaignId,
  estimatedAudienceSize,
  onConfirmSchedule,
  initialScheduledAt,
  initialTimezone,
  initialIsRecurring,
  initialRecurrence,
}: ScheduleModalProps) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState<string>(initialScheduledAt || '');
  const [timezone, setTimezone] = useState<string>(initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isRecurring, setIsRecurring] = useState<boolean>(initialIsRecurring || false);
  const [recurrence, setRecurrence] = useState<NonNullable<ScheduleModalProps['initialRecurrence']>>(
    initialRecurrence || { frequency: 'weekly', days: [] }
  );
  const [isSchedulingApiCall, setIsSchedulingApiCall] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScheduledAt(initialScheduledAt || '');
      setTimezone(initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setIsRecurring(initialIsRecurring || false);
      setRecurrence(initialRecurrence || { frequency: 'weekly', days: [] });
    }
  }, [isOpen, initialScheduledAt, initialTimezone, initialIsRecurring, initialRecurrence]);

  const handleScheduleConfirm = async () => {
    if (!scheduledAt) {
      toast({
        title: 'Please select a date and time',
        variant: 'destructive',
      });
      return;
    }

    if (isRecurring && recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0)) {
      toast({
        title: 'Please select at least one day for weekly recurrence',
        variant: 'destructive',
      });
      return;
    }

    setIsSchedulingApiCall(true);
    try {
      const result = await onConfirmSchedule({
        scheduledAt,
        timezone,
        isRecurring,
        ...(isRecurring && { recurrence }),
      });

      if (result.success) {
        toast({
          title: 'Campaign Schedule Updated',
          description: `Campaign is scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error in schedule confirmation:', error);
      toast({
        title: 'Scheduling Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during scheduling.',
        variant: 'destructive',
      });
    } finally {
      setIsSchedulingApiCall(false);
    }
  };
  
  const handleModalClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Campaign</DialogTitle>
          <DialogDescription>
            Choose when to send this campaign to {estimatedAudienceSize?.toLocaleString() || '0'} recipients.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date">Date & Time</Label>
                <Input
                  id="schedule-date"
                  type="datetime-local"
                  value={scheduledAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Time Zone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Intl.supportedValuesOf('timeZone').map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')} (GMT{new Date().toLocaleTimeString('en-us', {timeZone: tz, timeZoneName: 'short'}).split(' ')[2]})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="recurring" 
                  checked={isRecurring} 
                  onCheckedChange={(checkedState) => setIsRecurring(checkedState === true)}
                />
                <label
                  htmlFor="recurring"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Recurring schedule
                </label>
              </div>
            </div>
            
            {isRecurring && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-md">
                <h4 className="font-medium">Recurrence Settings</h4>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <div className="flex gap-2">
                    {['daily', 'weekly', 'monthly'].map((freq) => (
                      <Button
                        key={freq}
                        type="button"
                        variant={recurrence.frequency === freq ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRecurrence({...recurrence, frequency: freq as 'daily' | 'weekly' | 'monthly'})}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {recurrence.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Days of the week</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <Button
                          key={day}
                          type="button"
                          variant={recurrence.days?.includes(index) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setRecurrence(prev => ({
                              ...prev,
                              days: prev.days?.includes(index)
                                ? prev.days.filter(d => d !== index)
                                : [...(prev.days || []), index].sort((a,b) => a-b)
                            }));
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {day[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-muted/50 p-4 rounded-md">
            <h4 className="font-medium mb-2">Schedule Summary</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Next Send:</span> {scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Not set'}</p>
              <p><span className="text-muted-foreground">Time Zone:</span> {timezone}</p>
              {isRecurring && (
                <p>
                  <span className="text-muted-foreground">Recurrence:</span> {recurrence.frequency}
                  {recurrence.frequency === 'weekly' && recurrence.days?.length > 0 && (
                    <span> on {recurrence.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleModalClose}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button"
            onClick={handleScheduleConfirm} 
            disabled={isSchedulingApiCall}
          >
            {isSchedulingApiCall ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Schedule Campaign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 