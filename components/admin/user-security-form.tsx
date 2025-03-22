'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { 
  AlertCircle, 
  CheckCircle, 
  Key, 
  Lock, 
  Mail, 
  RefreshCw, 
  Shield, 
  ShieldAlert, 
  User2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const securityFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  confirmPassword: z.string().optional(),
  email_confirmed: z.boolean().default(false),
  is_blocked: z.boolean().default(false),
  admin_role: z.boolean().default(false),
  require_password_change: z.boolean().default(false),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SecurityFormValues = z.infer<typeof securityFormSchema>;

interface UserSecurityFormProps {
  userId: string;
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    created_at: string;
    updated_at: string;
    profile: {
      is_admin: boolean;
      is_blocked: boolean;
      require_password_change: boolean;
    } | null;
  };
}

export function UserSecurityForm({
  userId,
  user,
}: UserSecurityFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  
  // Default values for the form
  const defaultValues: Partial<SecurityFormValues> = {
    email: user.email,
    email_confirmed: !!user.email_confirmed_at,
    is_blocked: user.profile?.is_blocked || false,
    admin_role: user.profile?.is_admin || false,
    require_password_change: user.profile?.require_password_change || false,
  };

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues,
  });

  async function onSubmit(data: SecurityFormValues) {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/security`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password || undefined,
          email_confirmed: data.email_confirmed,
          is_blocked: data.is_blocked,
          admin_role: data.admin_role,
          require_password_change: data.require_password_change,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update security settings');
      }
      
      toast.success('Security settings updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Security update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setIsResettingPassword(true);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
      
      toast.success('Password reset successfully. The user will receive an email with instructions.');
      setConfirmResetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Password reset error:', error);
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleSendVerificationEmail() {
    setIsSendingEmail(true);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/send-verification`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send verification email');
      }
      
      toast.success('Verification email sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Send verification error:', error);
    } finally {
      setIsSendingEmail(false);
    }
  }

  // Format date to be user-friendly
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage user security settings and permissions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Account Info Card */}
          <div className="rounded-md bg-muted p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between">
                <div className="flex items-center">
                  <User2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Account Created</span>
                </div>
                <span className="text-sm">
                  {formatDate(user.created_at)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Email Verified</span>
                </div>
                <span className="text-sm">
                  {user.email_confirmed_at 
                    ? formatDate(user.email_confirmed_at)
                    : 'Not verified'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <div className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium">Last Sign In</span>
                </div>
                <span className="text-sm">
                  {formatDate(user.last_sign_in_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Security Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      The user will use this email to sign in.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Confirmed Switch */}
              <FormField
                control={form.control}
                name="email_confirmed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Verified
                      </FormLabel>
                      <FormDescription>
                        Mark the user's email as verified
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Leave blank to keep current password" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      At least 8 characters. Leave blank to keep current password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Require Password Change Switch */}
              <FormField
                control={form.control}
                name="require_password_change"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Require Password Change
                      </FormLabel>
                      <FormDescription>
                        Force the user to change their password on next login
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmResetOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendVerificationEmail}
                  disabled={isSendingEmail || form.watch('email_confirmed')}
                >
                  {isSendingEmail ? 'Sending...' : 'Send Verification Email'}
                </Button>
              </div>

              <Separator />

              {/* Account Blocked Switch */}
              <FormField
                control={form.control}
                name="is_blocked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-destructive/20 bg-destructive/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <FormLabel className="text-base">
                          Block Account
                        </FormLabel>
                        <ShieldAlert className="h-4 w-4 text-destructive ml-2" />
                      </div>
                      <FormDescription>
                        Prevent this user from signing in
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Admin Role Switch */}
              <FormField
                control={form.control}
                name="admin_role"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-amber-500/20 bg-amber-500/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <FormLabel className="text-base">
                          Admin Privileges
                        </FormLabel>
                        <Shield className="h-4 w-4 text-amber-500 ml-2" />
                      </div>
                      <FormDescription>
                        Grant admin access to manage all parts of the platform
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Warning when changing admin status */}
              {form.watch('admin_role') !== defaultValues.admin_role && (
                <Alert variant={form.watch('admin_role') ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {form.watch('admin_role') 
                      ? "Adding Admin Privileges" 
                      : "Removing Admin Privileges"}
                  </AlertTitle>
                  <AlertDescription>
                    {form.watch('admin_role')
                      ? "This will grant the user full access to all admin functions including user management."
                      : "This will remove the user's ability to access the admin area."}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Security Settings'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password Reset Confirmation Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a password reset email to the user and invalidate their current password.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isResettingPassword ? 'Resetting...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 