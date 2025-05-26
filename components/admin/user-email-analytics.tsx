// components/admin/user-email-analytics.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { EmailEvent, EmailEventType } from '@/lib/supabase/data-access/email-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { EmailAnalyticsFilters as EmailAnalyticsFiltersComponent, type EmailAnalyticsFilters as EmailAnalyticsFiltersType } from './email-analytics-filters';
import { BarChart2, MailOpen, MousePointerClick, AlertTriangle, ShieldOff, Mail, ShieldCheck, RefreshCw, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Define the new interface for a processed email entry
interface ProcessedEmail {
  id: string; // Unique identifier for the email dispatch (e.g., message_id)
  subject?: string;
  campaignId?: string | null;
  campaignName?: string;
  sentAt?: string; // Timestamp of initial send/delivery
  isDelivered: boolean;
  isOpened: boolean;
  isClicked: boolean;
  isBounced: boolean;
  isSpamComplaint: boolean;
  isUnsubscribed: boolean; // Unsubscribed as a result of interaction with this email
  rawEvents: EmailEvent[]; // Store the original events related to this dispatch
}

interface UserEmailAnalyticsProps {
  userId: string;
}

interface EmailAnalyticsSummary {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  deliverability_status: 'Good' | 'Issue' | 'Unknown';
  is_currently_bounced: boolean;
}

interface UserEmailSubscriptionState {
  isMarketingSubscribed: boolean | null;
  notes: string;
  initialStatusLoaded: boolean;
  isUpdating: boolean;
  error: string | null;
}

export function UserEmailAnalytics({ userId }: UserEmailAnalyticsProps) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [summary, setSummary] = useState<EmailAnalyticsSummary | null>(null);
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([]); // New state for transformed email history
  const [loading, setLoading] = useState(true);
  const [clearingBounce, setClearingBounce] = useState(false);
  const [filters, setFilters] = useState<EmailAnalyticsFiltersType>({ 
    eventType: '', 
    dateFrom: '', 
    dateTo: '' 
  });
  const [subscriptionState, setSubscriptionState] = useState<UserEmailSubscriptionState>({
    isMarketingSubscribed: null,
    notes: '',
    initialStatusLoaded: false,
    isUpdating: false,
    error: null,
  });

  const fetchAllUserData = useCallback(() => {
    setLoading(true);
    setSubscriptionState(prev => ({ ...prev, initialStatusLoaded: false, error: null }));

    const analyticsParams = new URLSearchParams();
    if (filters.eventType) analyticsParams.set('eventType', filters.eventType);
    if (filters.dateFrom) analyticsParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) analyticsParams.set('dateTo', filters.dateTo);

    const fetchAnalytics = fetch(`/api/admin/users/${userId}/email-events?${analyticsParams.toString()}`)
      .then(res => res.json());
    
    const fetchSubscriptionStatus = fetch(`/api/admin/users/${userId}/subscription-status`)
      .then(res => res.json());

    Promise.all([fetchAnalytics, fetchSubscriptionStatus])
      .then(([analyticsData, subscriptionData]) => {
        const rawEventsData = analyticsData.events || [];
        setEvents(rawEventsData);
        const isCurrentlyBounced = analyticsData.profile?.email_bounced ?? false;

        const newSummary: EmailAnalyticsSummary = {
          delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0,
          open_rate: 0, click_rate: 0,
          deliverability_status: 'Unknown',
          is_currently_bounced: isCurrentlyBounced 
        };
        for (const ev of rawEventsData) {
          const eventTypeForSummary = ev.event_type.toLowerCase();
          switch (eventTypeForSummary) {
            case 'delivery': newSummary.delivered++; break;
            case 'open': newSummary.opened++; break;
            case 'click': newSummary.clicked++; break;
            case 'bounce': newSummary.bounced++; break;
            case 'spamcomplaint': newSummary.spam++; break;
            case 'subscriptionchange': newSummary.unsubscribed++; break;
          }
        }
        if (newSummary.delivered > 0) {
          newSummary.open_rate = (newSummary.opened / newSummary.delivered) * 100;
          newSummary.click_rate = (newSummary.clicked / newSummary.delivered) * 100;
        }
        if (newSummary.bounced > 0) {
          newSummary.deliverability_status = 'Issue'; 
        } else if (newSummary.delivered > 0) {
          newSummary.deliverability_status = 'Good';
        }
        setSummary(newSummary);

        const emailGroups: Record<string, ProcessedEmail> = {};
        const sortedEvents = [...rawEventsData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Helper function to extract subject from event data
        const extractSubject = (event: EmailEvent): string => {
          // Try various possible locations for the subject
          if (event.campaign_subject) return event.campaign_subject;
          if (event.metadata?.subject) return event.metadata.subject as string;
          
          // Check in Postmark metadata format
          if (typeof event.metadata === 'object' && event.metadata) {
            // Some email providers store subject in different metadata fields
            const metadata = event.metadata as Record<string, any>;
            if (metadata.Subject) return metadata.Subject;
            if (metadata.MessageSubject) return metadata.MessageSubject;
            if (metadata.EmailSubject) return metadata.EmailSubject;
            
            // Check deeper in metadata properties
            if (metadata.Metadata && typeof metadata.Metadata === 'object') {
              const metadataObj = metadata.Metadata;
              if (metadataObj.subject) return metadataObj.subject;
            }
          }
          
          // If all else fails, use recipient email as a fallback identifier
          return event.recipient ? `Email to ${event.recipient}` : 'No Subject';
        };
        
        for (const event of sortedEvents) {
          // Use provider_message_id as the primary grouping key, fall back to message_id or event id
          const groupId = event.provider_message_id || event.message_id || `event-${event.id}`;
          
          if (!emailGroups[groupId]) {
            emailGroups[groupId] = {
              id: groupId,
              subject: extractSubject(event),
              campaignId: event.campaign_id,
              campaignName: event.campaign_name,
              sentAt: event.timestamp, 
              isDelivered: false, isOpened: false, isClicked: false, isBounced: false, isSpamComplaint: false, isUnsubscribed: false,
              rawEvents: [],
            };
          }
          emailGroups[groupId].rawEvents.push(event);
          const eventTypeForSwitch = event.event_type.toLowerCase();
          switch (eventTypeForSwitch) {
            case 'delivery': emailGroups[groupId].isDelivered = true; emailGroups[groupId].sentAt = event.timestamp; break;
            case 'open': emailGroups[groupId].isOpened = true; break;
            case 'click': emailGroups[groupId].isClicked = true; break;
            case 'bounce': emailGroups[groupId].isBounced = true; break;
            case 'spamcomplaint': emailGroups[groupId].isSpamComplaint = true; break;
            case 'subscriptionchange': emailGroups[groupId].isUnsubscribed = true; break;
          }
        }
        const processedEmailList = Object.values(emailGroups).sort((a,b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
        setProcessedEmails(processedEmailList);
        setLoading(false);

        if (subscriptionData && typeof subscriptionData.email_marketing_subscribed === 'boolean') {
          setSubscriptionState(prev => ({
            ...prev,
            isMarketingSubscribed: subscriptionData.email_marketing_subscribed,
            initialStatusLoaded: true,
          }));
        } else {
          throw new Error(subscriptionData.error || 'Failed to load subscription status format');
        }
      })
      .catch(error => {
        console.error("Failed to fetch user data (analytics or subscription):", error);
        setLoading(false);
        setSummary({ delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, open_rate: 0, click_rate: 0, deliverability_status: 'Unknown', is_currently_bounced: false });
        setSubscriptionState(prev => ({
            ...prev,
            initialStatusLoaded: true,
            error: error.message || 'An unknown error occurred fetching data.'
        }));
      });
  }, [userId, filters]);

  useEffect(() => {
    if (userId) {
      fetchAllUserData();
    }
  }, [userId, fetchAllUserData]);

  const handleClearBounceStatus = async () => {
    setClearingBounce(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-bounce-status`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear bounce status');
      }
      fetchAllUserData(); 
    } catch (error) {
      console.error('Error clearing bounce status:', error);
      toast.error('Failed to clear bounce status');
    } finally {
      setClearingBounce(false);
    }
  };

  const handleSubscriptionChange = (newStatus: boolean) => {
    setSubscriptionState(prev => ({ ...prev, isMarketingSubscribed: newStatus, error: null }));
  };

  const handleSubscriptionNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubscriptionState(prev => ({ ...prev, notes: event.target.value, error: null }));
  };

  const handleUpdateSubscription = async () => {
    if (subscriptionState.isMarketingSubscribed === null) return;

    setSubscriptionState(prev => ({ ...prev, isUpdating: true, error: null }));
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: subscriptionState.isMarketingSubscribed,
          notes: subscriptionState.notes || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription status');
      }
      setSubscriptionState(prev => ({
        ...prev,
        isMarketingSubscribed: data.email_marketing_subscribed,
        notes: '',
        isUpdating: false,
      }));
      toast.success('Subscription status updated successfully!');
    } catch (error: any) {
      console.error('Error updating subscription status:', error);
      setSubscriptionState(prev => ({ ...prev, isUpdating: false, error: error.message }));
      toast.error(`Update failed: ${error.message}`);
    } 
  };
  
  const isSubscriptionSaveDisabled = !subscriptionState.initialStatusLoaded || subscriptionState.isUpdating;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" /> Email Analytics
        </h2>
        <EmailAnalyticsFiltersComponent
          filters={filters}
          onChange={setFilters}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : summary && (
            <>
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><Mail className="h-4 w-4 mr-2" />Delivered</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.delivered}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><MailOpen className="h-4 w-4 mr-2" />Opened</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.opened}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><MousePointerClick className="h-4 w-4 mr-2" />Clicked</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.clicked}</div></CardContent></Card>
              
              <Card className={summary.bounced > 0 ? "border-destructive" : ""}>
                <CardHeader><CardTitle className={`text-sm font-medium flex items-center ${summary.bounced > 0 ? "text-destructive" : ""}`}><AlertTriangle className="h-4 w-4 mr-2" />Bounced</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary.bounced}</div></CardContent>
              </Card>
              
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center"><ShieldOff className="h-4 w-4 mr-2" />Spam</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.spam}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm font-medium flex items-center">Unsubscribed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.unsubscribed}</div></CardContent></Card>
              
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-2" />Open Rate</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary.open_rate.toFixed(1)}%</div></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium flex items-center"><BarChart2 className="h-4 w-4 mr-2" />Click Rate</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{summary.click_rate.toFixed(1)}%</div></CardContent>
              </Card>

              <Card className={
                summary.is_currently_bounced ? "border-destructive bg-destructive/10" : 
                summary.deliverability_status === 'Good' ? "border-green-500 bg-green-500/10" : "bg-muted/30"
              }>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium flex items-center">
                      {summary.is_currently_bounced && <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />}
                      {!summary.is_currently_bounced && summary.deliverability_status === 'Good' && <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />}
                      {!summary.is_currently_bounced && summary.deliverability_status === 'Issue' && <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />}
                      Deliverability
                    </CardTitle>
                    {summary.is_currently_bounced && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleClearBounceStatus}
                        disabled={clearingBounce}
                      >
                        {clearingBounce ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                        Clear Bounce
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${summary.is_currently_bounced ? "text-destructive" : !summary.is_currently_bounced && summary.deliverability_status === 'Good' ? "text-green-700" : ""}`}>
                    {summary.is_currently_bounced ? 'Hard Bounced' : 
                     !summary.is_currently_bounced && summary.deliverability_status === 'Issue' ? 'Good (Previously Bounced)' : summary.deliverability_status}
                  </div>
                  {summary.is_currently_bounced && <p className="text-xs text-muted-foreground">User will not receive emails.</p>}
                </CardContent>
              </Card>
            </>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Edit3 className="h-5 w-5 mr-2 text-primary" /> Marketing Email Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            { !subscriptionState.initialStatusLoaded ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-1/3" />
              </div>
            ) : subscriptionState.error ? (
                <p className="text-red-500">Error: {subscriptionState.error}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    User is currently:{" "}
                    <span className={`font-semibold ${subscriptionState.isMarketingSubscribed ? 'text-green-600' : 'text-red-600'}`}>
                      {subscriptionState.isMarketingSubscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </p>
                  <Switch
                    checked={subscriptionState.isMarketingSubscribed ?? false}
                    onCheckedChange={handleSubscriptionChange}
                    disabled={subscriptionState.isUpdating}
                    aria-label="Toggle marketing email subscription"
                  />
                </div>
                <div>
                  <label htmlFor="subscriptionNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional - for audit log)
                  </label>
                  <Textarea
                    id="subscriptionNotes"
                    value={subscriptionState.notes}
                    onChange={handleSubscriptionNotesChange}
                    placeholder="Reason for change, e.g., User request via support ticket #12345"
                    rows={3}
                    disabled={subscriptionState.isUpdating}
                  />
                </div>
                <Button 
                  onClick={handleUpdateSubscription}
                  disabled={isSubscriptionSaveDisabled}
                >
                  {subscriptionState.isUpdating ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
                  ) : (
                    'Save Subscription Changes'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <div>
          <h3 className="font-semibold mt-6 mb-2">Email History Log</h3>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedEmails.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No email history found.</td></tr>
                  ) : (
                    processedEmails.map(email => {
                      // Determine email status for display
                      let status = 'Delivered';
                      let statusColor = 'text-green-600';
                      let StatusIcon = Mail;
                      
                      if (email.isBounced) {
                        status = 'Bounced';
                        statusColor = 'text-red-500';
                        StatusIcon = AlertTriangle;
                      } else if (email.isSpamComplaint) {
                        status = 'Marked as spam';
                        statusColor = 'text-orange-500';
                        StatusIcon = ShieldOff;
                      } else if (email.isUnsubscribed) {
                        status = 'Unsubscribed';
                        statusColor = 'text-gray-700';
                        StatusIcon = ShieldOff;
                      } else if (email.isClicked) {
                        status = 'Clicked';
                        statusColor = 'text-purple-500';
                        StatusIcon = MousePointerClick;
                      } else if (email.isOpened) {
                        status = 'Opened';
                        statusColor = 'text-blue-500';
                        StatusIcon = MailOpen;
                      }
                      
                      return (
                        <tr key={email.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {email.sentAt ? format(new Date(email.sentAt), 'yyyy-MM-dd HH:mm') : 'N/A'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {email.subject || 'No Subject'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {email.campaignName || email.campaignId || 'Transactional'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Email journey progress tracker */}
                              <div className="flex items-center">
                                <div className={`flex items-center justify-center h-5 w-5 rounded-full ${email.isDelivered ? 'bg-green-100' : 'bg-gray-100'}`}>
                                  <Mail className={`h-3 w-3 ${email.isDelivered ? 'text-green-600' : 'text-gray-400'}`} />
                                </div>
                                <div className={`w-3 h-0.5 ${email.isDelivered && email.isOpened ? 'bg-blue-300' : 'bg-gray-200'}`}></div>
                                <div className={`flex items-center justify-center h-5 w-5 rounded-full ${email.isOpened ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                  <MailOpen className={`h-3 w-3 ${email.isOpened ? 'text-blue-600' : 'text-gray-400'}`} />
                                </div>
                                <div className={`w-3 h-0.5 ${email.isOpened && email.isClicked ? 'bg-purple-300' : 'bg-gray-200'}`}></div>
                                <div className={`flex items-center justify-center h-5 w-5 rounded-full ${email.isClicked ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                  <MousePointerClick className={`h-3 w-3 ${email.isClicked ? 'text-purple-600' : 'text-gray-400'}`} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} bg-opacity-10`}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status}
                            </div>
                            {(email.isBounced || email.isSpamComplaint) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="ml-2 text-xs text-gray-500 underline">
                                    Details
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="w-72">
                                  <div className="space-y-1">
                                    <p className="font-medium">Event Details</p>
                                    <p className="text-xs">
                                      {email.rawEvents
                                        .filter(e => e.event_type.toLowerCase() === 'bounce' || e.event_type.toLowerCase() === 'spamcomplaint')
                                        .map(e => e.metadata?.Details || 'No details available')
                                        .join('\n')}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default UserEmailAnalytics;


