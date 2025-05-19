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
import { CalendarIcon, Clock, Loader2, RotateCcw, Calendar, CalendarDays, CircleAlert, CheckCircle2, Info } from 'lucide-react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { 
  buttonStyles, 
  typography, 
  transitions, 
  cardStyles,
  spacing
} from '../ui-utils';
import { Badge } from '@/components/ui/badge';

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
  
  // Date and time state
  const [date, setDate] = useState<Date | undefined>(
    initialScheduledAt ? new Date(initialScheduledAt) : undefined
  );
  const [time, setTime] = useState<string>(
    initialScheduledAt 
      ? new Date(initialScheduledAt).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})
      : ''
  );
  
  // Combined scheduled date/time
  const [scheduledAt, setScheduledAt] = useState<string>(initialScheduledAt || '');
  
  // Other state
  const [timezone, setTimezone] = useState<string>(initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isRecurring, setIsRecurring] = useState<boolean>(initialIsRecurring || false);
  const [recurrence, setRecurrence] = useState<NonNullable<ScheduleModalProps['initialRecurrence']>>(
    initialRecurrence || { frequency: 'weekly', days: [] }
  );
  const [isSchedulingApiCall, setIsSchedulingApiCall] = useState(false);
  const [invalidDateSelected, setInvalidDateSelected] = useState(false);

  // Update combined scheduledAt when date or time changes
  useEffect(() => {
    if (date && time) {
      try {
        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        
        // Check if date is in the past
        if (newDate < new Date()) {
          setInvalidDateSelected(true);
        } else {
          setInvalidDateSelected(false);
          setScheduledAt(newDate.toISOString());
        }
      } catch (error) {
        console.error('Error setting date/time:', error);
      }
    } else {
      setScheduledAt('');
    }
  }, [date, time]);

  // Reset form when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      if (initialScheduledAt) {
        const initialDate = new Date(initialScheduledAt);
        setDate(initialDate);
        setTime(initialDate.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false}));
        setScheduledAt(initialScheduledAt);
      } else {
        setDate(undefined);
        setTime('');
        setScheduledAt('');
      }
      
      setTimezone(initialTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setIsRecurring(initialIsRecurring || false);
      setRecurrence(initialRecurrence || { frequency: 'weekly', days: [] });
      setInvalidDateSelected(false);
    }
  }, [isOpen, initialScheduledAt, initialTimezone, initialIsRecurring, initialRecurrence]);

  const handleScheduleConfirm = async () => {
    if (!scheduledAt) {
      toast({
        title: 'Missing Date/Time',
        description: 'Please select both date and time for your campaign.',
        variant: 'destructive',
      });
      return;
    }

    if (invalidDateSelected) {
      toast({
        title: 'Invalid Date/Time',
        description: 'Please select a future date and time for your campaign.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecurring && recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0)) {
      toast({
        title: 'Missing Recurrence Days',
        description: 'Please select at least one day for weekly recurrence.',
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
          title: 'Campaign Scheduled',
          description: `Campaign will send ${isRecurring ? 'regularly starting' : ''} on ${new Date(scheduledAt).toLocaleString()}`,
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

  // Day of week name formatter
  const getDayName = (index: number, short = false): string => {
    const days = short 
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[index];
  };

  const timezoneFormatted = (tz: string): string => {
    // Replace underscores with spaces and add GMT offset
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(part => part.type === 'timeZoneName')?.value || '';
    
    return `${tz.replace(/_/g, ' ')} (${tzPart})`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pb-2 space-y-1">
          <DialogTitle className="flex items-center gap-1.5">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Campaign
          </DialogTitle>
          <DialogDescription>
            Choose when to send this campaign to{' '}
            <span className="font-medium">{estimatedAudienceSize?.toLocaleString() || '0'}</span> recipients.
          </DialogDescription>
        </DialogHeader>
        
        <div className={cn("space-y-6 py-4", transitions.fadeIn)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date & Time Selection */}
            <div className="space-y-4">
              <h3 className={cn(typography.h4, "mb-2 flex items-center gap-1.5")}>
                <CalendarDays className="h-4 w-4 text-primary" />
                Date & Time
              </h3>
              
              <div className="space-y-4">
                {/* Calendar Picker */}
                <div className="space-y-2">
                  <Label htmlFor="date-picker">Send Date</Label>
                  <div className="grid gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-picker"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Time Picker */}
                <div className="space-y-2">
                  <Label htmlFor="time-picker">Send Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time-picker"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {invalidDateSelected && (
                  <div className={cn(
                    "flex items-start gap-2 p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20",
                    transitions.fadeIn
                  )}>
                    <CircleAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Invalid date/time selected</p>
                      <p>Please select a future date and time for scheduling.</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Timezone Selector */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Time Zone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {Intl.supportedValuesOf('timeZone').map((tz) => (
                    <option key={tz} value={tz}>
                      {timezoneFormatted(tz)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Recurring Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="recurring" 
                  checked={isRecurring} 
                  onCheckedChange={(checkedState) => setIsRecurring(checkedState === true)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <label
                  htmlFor="recurring"
                  className="text-sm font-medium leading-none cursor-pointer select-none"
                >
                  Make this a recurring campaign
                </label>
              </div>
            </div>
            
            {/* Recurrence Settings or Summary */}
            <div>
              {isRecurring ? (
                <div className={cn("space-y-4 p-4 rounded-md", cardStyles.dashboard)}>
                  <h3 className={cn(typography.h4, "flex items-center gap-1.5")}>
                    <RotateCcw className="h-4 w-4 text-primary" />
                    Recurrence Pattern
                  </h3>
                  
                  <div className="space-y-3">
                    <Label>Frequency</Label>
                    <div className="flex gap-2">
                      {['daily', 'weekly', 'monthly'].map((freq) => (
                        <Button
                          key={freq}
                          type="button"
                          variant={recurrence.frequency === freq ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            recurrence.frequency === freq ? buttonStyles.primary : buttonStyles.outline,
                            "transition-all duration-200"
                          )}
                          onClick={() => setRecurrence({...recurrence, frequency: freq as 'daily' | 'weekly' | 'monthly'})}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {recurrence.frequency === 'weekly' && (
                    <div className={cn("space-y-3 pt-2", transitions.fadeIn)}>
                      <Label className="flex items-center justify-between">
                        <span>Days of the week</span>
                        <Badge variant="outline" className="font-normal bg-muted/50">
                          {recurrence.days?.length || 0} selected
                        </Badge>
                      </Label>
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <button
                            key={day}
                            type="button"
                            className={cn(
                              "flex flex-col items-center justify-center h-12 rounded-md text-sm transition-all duration-200",
                              "border border-border hover:border-primary/40",
                              recurrence.days?.includes(index)
                                ? "bg-primary/10 border-primary text-primary font-medium"
                                : "bg-background hover:bg-muted/30"
                            )}
                            onClick={() => {
                              setRecurrence(prev => ({
                                ...prev,
                                days: prev.days?.includes(index)
                                  ? prev.days.filter(d => d !== index)
                                  : [...(prev.days || []), index].sort((a,b) => a-b)
                              }));
                            }}
                          >
                            <span className="text-xs opacity-80">{index === date?.getDay() ? "Today" : ""}</span>
                            <span>{day}</span>
                          </button>
                        ))}
                      </div>
                      
                      {recurrence.days?.length === 0 && (
                        <div className="text-sm p-2 rounded-md bg-muted/30 text-muted-foreground italic">
                          Select at least one day of the week for the recurring schedule.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {recurrence.frequency === 'monthly' && (
                    <div className={cn("pt-2", transitions.fadeIn)}>
                      <div className="p-3 rounded-md bg-secondary/10 border border-secondary/20">
                        <p className="flex items-center gap-1.5 text-sm">
                          <Info className="h-4 w-4 text-secondary" />
                          <span>Campaign will send monthly on day {date ? date.getDate() : 'X'} of each month.</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("flex flex-col h-full", scheduledAt ? "" : "justify-center")}>
                  {!scheduledAt && (
                    <div className="flex flex-col items-center justify-center text-center p-6 h-full">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className={typography.h4}>One-Time Send</h3>
                      <p className={cn(typography.subtle, "max-w-xs mt-2")}>
                        Select a date and time to schedule your campaign for a single delivery.
                      </p>
                    </div>
                  )}
                  
                  {scheduledAt && !invalidDateSelected && (
                    <div className={cn("p-4 rounded-md space-y-4", cardStyles.elevated)}>
                      <h3 className={cn(typography.h4, "flex items-center gap-1.5")}>
                        <Calendar className="h-4 w-4 text-primary" />
                        Schedule Summary
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={typography.subtle}>Campaign Type:</span>
                          <Badge variant="outline" className="bg-primary/5 text-primary">
                            One-time Send
                          </Badge>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <div>
                            <span className={typography.subtle}>Date:</span>
                            <p className="font-medium">{date ? format(date, "PPPP") : 'Not set'}</p>
                          </div>
                          
                          <div>
                            <span className={typography.subtle}>Time:</span>
                            <p className="font-medium">{time || 'Not set'}</p>
                          </div>
                          
                          <div>
                            <span className={typography.subtle}>Time Zone:</span>
                            <p className="font-medium">{timezone.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-md border border-primary/20 bg-primary/5 flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <p className={typography.subtle}>
                            Your campaign will be sent automatically at the scheduled time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Recurring Schedule Summary */}
          {isRecurring && scheduledAt && !invalidDateSelected && (
            <div className={cn(
              "p-4 rounded-md border bg-primary/5 border-primary/20",
              transitions.fadeIn
            )}>
              <h4 className={cn(typography.h4, "mb-3 flex items-center gap-1.5")}>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Recurring Schedule Summary
              </h4>
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <span className={typography.subtle}>First Send:</span>
                    <p className="font-medium">{scheduledAt ? new Date(scheduledAt).toLocaleString(undefined, {
                      dateStyle: 'full',
                      timeStyle: 'short'
                    }) : 'Not set'}</p>
                  </div>
                  
                  <div>
                    <span className={typography.subtle}>Time Zone:</span>
                    <p className="font-medium">{timezone.replace(/_/g, ' ')}</p>
                  </div>
                  
                  <div>
                    <span className={typography.subtle}>Frequency:</span>
                    <p className="font-medium capitalize">{recurrence.frequency}</p>
                  </div>
                </div>
                
                {recurrence.frequency === 'weekly' && recurrence.days?.length > 0 && (
                  <div className="pt-1">
                    <span className={typography.subtle}>Repeats on:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recurrence.days.map(d => (
                        <Badge key={d} variant="outline" className="bg-secondary/10">
                          {getDayName(d)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 text-sm">
                  <Info className="inline-block h-3.5 w-3.5 text-primary mr-1" />
                  You can cancel the recurring schedule at any time.
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              type="button"
              variant="outline" 
              className={buttonStyles.outline}
              onClick={handleModalClose}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button"
            onClick={handleScheduleConfirm} 
            disabled={isSchedulingApiCall || !scheduledAt || invalidDateSelected || (isRecurring && recurrence.frequency === 'weekly' && (!recurrence.days || recurrence.days.length === 0))}
            className={buttonStyles.primary}
          >
            {isSchedulingApiCall ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {isRecurring ? 'Schedule Recurring' : 'Schedule Campaign'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 