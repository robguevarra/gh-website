'use client';

import { useEffect, useState } from 'react';
import { EmailCampaign } from '@/lib/supabase/data-access/campaign-management';
import { useToast } from '@/components/ui/use-toast';
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
import { Loader2, Send } from 'lucide-react';
import { extractVariablesFromContent, getStandardVariableDefaults } from '@/lib/services/email/template-utils';

export interface TestSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: EmailCampaign | null;
  getCampaignContent: () => Promise<{ html: string; design: any } | null>;
}

export function TestSendModal({
  isOpen,
  onClose,
  campaign,
  getCampaignContent
}: TestSendModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendError, setTestSendError] = useState<string | null>(null);
  const { toast } = useToast();
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && campaign) {
      const fetchAndUpdateVariables = async () => {
        try {
          let htmlContent = campaign.campaign_html_body; // Default to stored HTML
          try {
            const contentFromEditor = await getCampaignContent(); // Attempt to get latest from editor
            if (contentFromEditor && contentFromEditor.html) {
              htmlContent = contentFromEditor.html;
            }
          } catch (editorError) {
            console.warn('Could not fetch live content from editor for test send, using stored HTML:', editorError);
            // Fallback to campaign.campaign_html_body is already set
          }

          if (htmlContent) {
            // Though extractVariablesFromContent is available, for test sends with standardized defaults,
            // we primarily need the defaults themselves. Extracted variables might be useful for UI listing if desired later.
            const defaults = getStandardVariableDefaults(); // Use standardized defaults
            setVariableValues(defaults);
          } else {
            setVariableValues({}); // No HTML content, so no variables
          }
        } catch (error) {
          console.error("Error processing campaign variables:", error);
          setTestSendError('Could not load email variables.');
          setVariableValues({});
        }
      };
      fetchAndUpdateVariables();
    }
  }, [isOpen, campaign, getCampaignContent, campaign?.campaign_html_body]);

  const handleSendTest = async () => {
    if (!campaign) {
      setTestSendError('Campaign data is not available.');
      return;
    }
    if (!recipientEmail) {
      setTestSendError('Please enter a recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestSendError(null);

    try {
      const content = await getCampaignContent();
      if (!content) {
        throw new Error('Could not retrieve campaign content from editor.');
      }

      const campaignSubject = campaign.subject || campaign.name || 'Test Email';

      const response = await fetch(`/api/admin/campaigns/${campaign.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject: campaignSubject,
          html_content: content.html,
          placeholder_data: variableValues, // Send the current variable values from getStandardVariableDefaults
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to send test email (${response.status})`);
      }

      toast({
        title: 'Test Email Sent',
        description: `Successfully sent test email to ${recipientEmail}.`,
      });
      onClose(); // Close modal on success
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setTestSendError(error.message || 'An unknown error occurred.');
      toast({
        title: 'Error Sending Test Email',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a test version of this campaign. Variables will be populated with sample data based on standard names.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient-email" className="text-right">
              Recipient Email
            </Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientEmail(e.target.value)}
              placeholder="test@example.com"
              className="col-span-3"
            />
          </div>
          {/* Variable Inputs Section - simplified to show what defaults are being used */}
          {Object.keys(variableValues).length > 0 && (
            <div className="my-4 pt-4 border-t">
              <h4 className="mb-2 text-sm font-medium text-center">Sample Data for Standard Variables</h4>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-2 text-xs">
                <p className="text-muted-foreground text-center mb-2">
                  The following standard variables (if present in your template as `{{variable_name}}`) will be populated with these sample values:
                </p>
                {Object.entries(variableValues).map(([name, value]) => (
                  <div key={name} className="grid grid-cols-3 items-center gap-x-2 gap-y-1">
                    <Label htmlFor={`var-${name}`} className="text-right truncate col-span-1 font-mono bg-muted px-1.5 py-0.5 rounded" title={name}>
                      {name}
                    </Label>
                     <p className="col-span-2 text-muted-foreground truncate" title={value}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {testSendError && (
            <p className="text-sm text-destructive col-span-4 text-center mt-2">{testSendError}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSendTest} disabled={isSendingTest}>
            {isSendingTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 