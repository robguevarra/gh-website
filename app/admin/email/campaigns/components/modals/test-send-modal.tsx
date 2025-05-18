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
import { Loader2, Send, Mail, User, Check, Info, AlertTriangle } from 'lucide-react';
import { extractVariablesFromContent, getStandardVariableDefaults } from '@/lib/services/email/template-utils';
import { Typography } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  formStyles, 
  buttonStyles, 
  transitions,
  spacing,
  typography
} from '../ui-utils';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && campaign) {
      setIsLoading(true);
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
        } finally {
          setIsLoading(false);
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle className={typography.h3}>Send Test Email</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Send a test version of this campaign to verify how it will appear in recipients' inboxes.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(spacing.formGroup, "py-4")}>
          <div className="grid grid-cols-6 items-center gap-4">
            <Label 
              htmlFor="recipient-email" 
              className={cn(formStyles.label, "text-right col-span-2 flex items-center gap-1.5")}
            >
              <User className="h-3.5 w-3.5" />
              Recipient Email
            </Label>
            <div className="col-span-4 relative">
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientEmail(e.target.value)}
                placeholder="test@example.com"
                className={cn(formStyles.input, transitions.hover, "pr-9")}
              />
              {recipientEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          
          {/* Variable Information Section */}
          <div className={cn("mt-6 pt-5 border-t border-border")}>
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-accent" />
              <h4 className={typography.h4}>Template Variables</h4>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8 animate-pulse">
                <Loader2 className="h-6 w-6 animate-spin text-primary/60 mr-2" />
                <p className={typography.muted}>Loading template variables...</p>
              </div>
            ) : Object.keys(variableValues).length > 0 ? (
              <div className={cn(transitions.fadeIn)}>
                <p className={cn(typography.muted, "mb-3 text-center")}>
                  These sample values will replace any matching variables in your template:
                </p>
                <div className="max-h-[180px] overflow-y-auto pr-2 space-y-1 rounded-md bg-muted/40 p-3">
                  {Object.entries(variableValues).map(([name, value]) => (
                    <div key={name} className="grid grid-cols-5 items-center gap-2 text-xs py-1 px-1 hover:bg-muted/60 rounded transition-colors">
                      <code className="col-span-2 font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate" title={name}>
                        {`{{${name}}}`}
                      </code>
                      <p className="col-span-3 text-foreground truncate" title={value}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 rounded-md p-4 text-center">
                <p className={typography.muted}>No variables detected in this template.</p>
              </div>
            )}
          </div>

          {testSendError && (
            <div className={cn("mt-4 p-3 border border-destructive/30 bg-destructive/10 rounded-md flex items-start gap-2", transitions.fadeIn)}>
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{testSendError}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className={buttonStyles.outline}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSendTest} 
            disabled={isSendingTest || !recipientEmail}
            className={cn(buttonStyles.primary, transitions.hover)}
          >
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