'use client';

/**
 * Email Template Tester Component
 * 
 * This component provides an interface for sending test emails
 * to verify that email templates are working correctly.
 */

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateTesterProps {
  templateId: string;
  templateName: string;
  variables: Record<string, string>;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function TemplateTester({
  templateId,
  templateName,
  variables,
  onCancel,
  onSuccess,
}: TemplateTesterProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Send test email
  const sendTestEmail = async () => {
    if (!recipientEmail) {
      setError('Please enter a recipient email address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Call our API endpoint to send a test email
      const response = await fetch('/api/admin/email-templates/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          recipientEmail,
          variables,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send test email');
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Alert className="bg-muted/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This will send a real email using the Postmark service. The email will contain test data.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="template-name">Template</Label>
          <Input
            id="template-name"
            value={templateName}
            disabled
            className="bg-muted"
          />
        </div>
        
        <div>
          <Label htmlFor="recipient-email" className="text-md font-medium">
            Recipient Email Address
          </Label>
          <Input
            id="recipient-email"
            type="email"
            placeholder="Enter email address"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-md font-medium mb-2">Template Variables</h3>
          <p className="text-sm text-muted-foreground mb-4">
            These values will be used to populate the email template.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(variables).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Label className="w-1/3 text-right text-muted-foreground">{key}:</Label>
                <div className="w-2/3 truncate font-mono text-sm bg-muted p-2 rounded-md">
                  {value || '<empty>'}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={sendTestEmail} disabled={isLoading || !recipientEmail}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
