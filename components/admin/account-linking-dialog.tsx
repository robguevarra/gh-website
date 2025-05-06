'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Link2, AlertTriangle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { UserProfile } from '@/types/admin-types';

interface AccountLinkingDialogProps {
  accounts: UserProfile[];
  onClose: () => void;
  onSuccess: () => void;
  linkAccounts: (data: any) => Promise<any>;
  getAccountDetails?: (accountId: string) => Promise<any>;
}

// Define form schema
const linkFormSchema = z.object({
  relationshipType: z.enum(['same_person', 'family_member', 'business_relation', 'other']),
  primaryAccount: z.string({
    required_error: 'Please select a primary account',
  }),
  notes: z.string().optional(),
  notifyUser: z.boolean().default(false),
});

// Define form values type
type AccountLinkFormValues = z.infer<typeof linkFormSchema>;

/**
 * AccountLinkingDialog component provides an interface for creating
 * relationships between user accounts.
 */
export function AccountLinkingDialog({ accounts, onClose, onSuccess, linkAccounts }: AccountLinkingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form with first account as default primary (if it's a unified profile)
  const defaultPrimaryAccount = accounts.find(account => account.system === 'Unified')?.id || accounts[0]?.id || '';
  
  // Initialize form
  const form = useForm<AccountLinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      relationshipType: 'same_person',
      primaryAccount: defaultPrimaryAccount,
      notes: '',
      notifyUser: false,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: AccountLinkFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get the primary account ID
      const primaryAccountId = values.primaryAccount;
      
      // Get the secondary account IDs (all accounts except the primary)
      const secondaryAccountIds = accounts
        .filter(account => account.id !== primaryAccountId)
        .map(account => account.id || '');
      
      // Map relationship type to the expected format
      const linkType = values.relationshipType === 'same_person' ? 'same-person' : 
                      values.relationshipType === 'family_member' ? 'related' : 
                      values.relationshipType === 'business_relation' ? 'related' : 'duplicate';
      
      // Call the linkAccounts function
      await linkAccounts({
        primaryAccountId,
        secondaryAccountIds,
        linkType,
        notes: values.notes
      });
      
      // Call onSuccess callback
      onSuccess();
    } catch (error) {
      console.error('Error linking accounts:', error);
      setError(error instanceof Error ? error.message : 'Failed to link accounts');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Link2 className="mr-2 h-5 w-5" />
          Link Accounts
        </CardTitle>
        <CardDescription>
          Create a relationship between {accounts.length} accounts
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Selected Accounts</h3>
              <div className="rounded-md border p-3">
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li key={account.id} className="text-sm flex justify-between">
                      <span>{account.name || account.email}</span>
                      <span className="text-muted-foreground">{account.id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <Separator />
            
            <FormField
              control={form.control}
              name="relationshipType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Relationship Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="same_person" id="same_person" />
                        <Label htmlFor="same_person">Same Person (Duplicate)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="family_member" id="family_member" />
                        <Label htmlFor="family_member">Family Member</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="business_relation" id="business_relation" />
                        <Label htmlFor="business_relation">Business Relation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="primaryAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id || ''}>
                          {account.name || account.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The primary account will be used for display in reports and analytics.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional information about this relationship"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Display any errors */}
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3 flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-medium">Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}
            
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">Important</p>
                <p className="mt-1">
                  Linking accounts will create a permanent relationship in the database.
                  This action will be logged in the audit system.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Linking...
                </>
              ) : (
                'Link Accounts'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
