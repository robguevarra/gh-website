'use client';

import { useState } from 'react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Calendar, Mail, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Assuming CampaignSegmentFromStore is defined elsewhere or passed with correct type
// For now, defining a compatible structure if it's not imported
interface CampaignSegmentFromStore {
    id: string; 
    segment_id: string; 
    segment: {
        id: string; 
        name: string;
        description?: string | null;
    };
}

export interface ReviewSendTabContentProps {
  currentCampaign: EmailCampaign | null;
  campaignSegments: CampaignSegmentFromStore[] | null;
  estimatedAudienceSize: number | null;
  isSendingGlobal: boolean;
  canSendOrSchedule: boolean;
  onConfirmSend: () => void;
  onScheduleClick: () => void;
  setIsTestSendModalOpen: (isOpen: boolean) => void;
  handleOpenLivePreview: () => void;
  formatDate: (dateString: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export function ReviewSendTabContent({
  currentCampaign,
  campaignSegments,
  estimatedAudienceSize,
  isSendingGlobal,
  canSendOrSchedule,
  onConfirmSend,
  onScheduleClick,
  setIsTestSendModalOpen,
  handleOpenLivePreview,
  formatDate,
  getStatusBadge,
}: ReviewSendTabContentProps) {
  const { toast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!currentCampaign) {
    return <p className="text-muted-foreground p-4">Loading campaign details for review...</p>;
  }

  const validateCampaignLocal = () => {
    const errors: string[] = [];
    if (!currentCampaign?.subject?.trim()) {
      errors.push('Campaign subject is required');
    }
    if (!currentCampaign?.campaign_html_body?.trim()) {
      errors.push('Campaign content is required (check Content & Design tab)');
    }
    if (!campaignSegments?.length) {
      errors.push('At least one audience segment is required');
    } else if (estimatedAudienceSize === 0) {
      errors.push('Selected segments have no recipients');
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const internalHandleConfirmSend = () => {
    if (validateCampaignLocal()) {
      onConfirmSend();
    } else {
      toast({
        title: "Validation Failed",
        description: "Please fix the errors listed below before sending.",
        variant: "destructive"
      });
    }
  };

  const internalHandleScheduleClick = () => {
    if (validateCampaignLocal()) {
      onScheduleClick();
    } else {
      toast({
        title: "Validation Failed",
        description: "Please fix the errors listed below before scheduling.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Send Campaign</CardTitle>
        <CardDescription>
          Review your campaign details and take final actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Campaign Details</h4>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-muted-foreground inline">Name: </dt><dd className="inline">{currentCampaign.name}</dd></div>
              <div><dt className="text-muted-foreground inline">Subject: </dt><dd className="inline">{currentCampaign.subject || 'Not set'}</dd></div>
              <div><dt className="text-muted-foreground inline">Status: </dt><dd className="inline">{getStatusBadge(currentCampaign.status)}</dd></div>
            </dl>

            <h4 className="font-medium mt-4">Audience</h4>
            <dl className="space-y-1 text-sm">
              <div><dt className="text-muted-foreground inline">Segments: </dt><dd className="inline">{campaignSegments?.map(s => s.segment?.name).join(', ') || 'None'}</dd></div>
              <div><dt className="text-muted-foreground inline">Estimated Recipients: </dt><dd className="inline">{estimatedAudienceSize?.toLocaleString() || 'N/A'}</dd></div>
            </dl>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium">Content Preview (Simplified)</h4>
            <div className="border rounded-md p-4 bg-muted/30 max-h-60 overflow-y-auto text-sm">
              {currentCampaign.campaign_html_body ? (
                <p>HTML content available. Full preview via "Live Preview" button.</p>
              ) : (
                <p>No HTML content available.</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {validationErrors.length > 0 && (
          <div className="my-4 p-4 border border-destructive/50 rounded-md bg-destructive/10">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-destructive mr-3 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive mb-1">Validation Errors:</h4>
                <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium">Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button onClick={internalHandleConfirmSend} disabled={isSendingGlobal || !canSendOrSchedule || currentCampaign.status === 'scheduled'}>
              <Send className="mr-2 h-4 w-4" /> Send Now
            </Button>
            {currentCampaign.status !== 'sending' && currentCampaign.status !== 'completed' && (
              <Button onClick={internalHandleScheduleClick} variant="outline">
                <Calendar className="mr-2 h-4 w-4" /> Schedule Send
              </Button>
            )}
            <Button onClick={() => setIsTestSendModalOpen(true)} variant="outline">
              <Send className="mr-2 h-4 w-4" /> Send Test Email
            </Button>
            <Button onClick={handleOpenLivePreview} variant="outline">
              <Mail className="mr-2 h-4 w-4" /> View Live Preview
            </Button>
          </div>
          {currentCampaign.status === 'scheduled' && currentCampaign.scheduled_at && (
            <p className="text-sm text-muted-foreground">
              This campaign is currently scheduled for: {formatDate(currentCampaign.scheduled_at)}.
              Sending now will override the schedule.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 