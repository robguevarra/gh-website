'use client';

/**
 * Email Template Tester Component
 * 
 * This component provides an interface for sending test emails
 * to verify that email templates are working correctly.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import the TemplateVariableInfo type
import { TemplateVariableInfo } from '@/lib/services/email/template-utils';

interface TemplateTesterProps {
  templateId: string;
  templateName: string;
  variables: Record<string, string>;
  variableInfo?: Record<string, TemplateVariableInfo>; // Optional metadata about variables
  onCancel: () => void;
  onSuccess: () => void;
}

export default function TemplateTester({
  templateId,
  templateName,
  variables: initialVariables,
  variableInfo = {},
  onCancel,
  onSuccess,
}: TemplateTesterProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use state to track editable variables
  const [variables, setVariables] = useState<Record<string, string>>(initialVariables || {});
  
  // Log all variables received to help debug
  useEffect(() => {
    console.log('Template Tester received variables:', initialVariables);
    console.log('Variable Keys:', Object.keys(initialVariables));
    console.log('Variable Info:', variableInfo);
  }, [initialVariables, variableInfo]);

  // Organize variables by category
  const variablesByCategory = Object.entries(variables).reduce<Record<string, string[]>>(
    (acc, [key]) => {
      const category = variableInfo[key]?.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(key);
      return acc;
    },
    {}
  );
  
  // Order categories for display
  const categoryOrder = ['user', 'content', 'action', 'event', 'course', 'system', 'other'];
  const sortedCategories = Object.keys(variablesByCategory).sort(
    (a, b) => {
      // Ensure we have all categories even if they're not in the predefined order
      if (!categoryOrder.includes(a)) return 1;
      if (!categoryOrder.includes(b)) return -1;
      return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
    }
  );
  
  // Send test email
  const sendTestEmail = async () => {
    console.log('Sending test email with the following data:', {
      templateId,
      recipientEmail,
      variablesCount: Object.keys(variables || {}).length
    });
    
    if (!recipientEmail) {
      setError('Please enter a recipient email address');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      
      // Call our API endpoint to send a test email
      console.log('Making POST request to /api/admin/email-templates/test-send');
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
      
      console.log('API response status:', response.status);
      
      let responseData;
      // Note: We need to get the response data first before checking status
      // to avoid trying to parse the body twice
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        responseData = {}; // Empty object as fallback
      }
      
      // After getting the response data, check if the request was successful
      if (!response.ok) {
        // Handle common error scenarios with better error messages
        if (response.status === 401) {
          throw new Error('Authentication required. Please make sure you are logged in with admin privileges.');
        } else if (response.status === 404) {
          throw new Error(`Template not found: ${templateId}. Please check if this template still exists.`);
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again or contact support if the issue persists.');
        } else {
          throw new Error(responseData.error || `Failed to send test email (${response.status})`);
        }
      }
      
      // If we made it here, the request was successful
      console.log('Success response from API:', responseData);
      setSuccess(true);
      
      // Wait briefly to show the success animation before triggering onSuccess
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {success ? (
        <Alert className="bg-green-100 border-green-500 animate-fade-in-out">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <AlertDescription className="font-medium text-green-700">
              Test email sent successfully to {recipientEmail}! Redirecting to editor...
            </AlertDescription>
          </div>
        </Alert>
      ) : (
        <Alert className="bg-muted/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will send a real email using the Postmark service. The email will contain test data.
          </AlertDescription>
        </Alert>
      )}
      
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
            Edit these values to test different variations of the email template.
          </p>
          
          {sortedCategories.length > 0 ? (
            <div className="space-y-6">
              {sortedCategories.map(category => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium capitalize border-b pb-1">
                    {category === 'other' ? 'Miscellaneous Variables' : `${category} Variables`}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {variablesByCategory[category].map(key => (
                      <div key={key} className="space-y-1 hover:bg-slate-50 p-2 rounded-md transition-colors">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`var-${key}`} className="text-sm font-medium">
                            {key}
                          </Label>
                          {variableInfo[key]?.description && (
                            <span className="text-xs text-muted-foreground">
                              {variableInfo[key]?.description}
                            </span>
                          )}
                        </div>
                        <Input
                          id={`var-${key}`}
                          value={variables[key] || ''}
                          onChange={(e) => {
                            setVariables(prev => ({
                              ...prev,
                              [key]: e.target.value
                            }));
                          }}
                          placeholder={`Value for ${key}`}
                          className="font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Edit this value to customize how it appears in the test email
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              This template has no variables defined.
            </div>
          )}
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
