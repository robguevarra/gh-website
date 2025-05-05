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
  User2,
  UserCog,
  Ban,
  Unlock,
  Send,
  Clock,
  RotateCcw,
  FileText
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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { 
  resetUserPassword, 
  updateUserStatus, 
  updateUserPermissions, 
  sendAdminNotification 
} from '@/app/actions/admin-tools';

// Schema for account status form
const accountStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'banned']),
  reason: z.string().min(5, { message: "Please provide a reason for this change" }),
  sendNotification: z.boolean().default(true),
});

// Schema for permissions form
const permissionsSchema = z.object({
  canAccessPremiumContent: z.boolean().default(false),
  canAccessBetaFeatures: z.boolean().default(false),
  canPostComments: z.boolean().default(true),
  canSubmitContent: z.boolean().default(false),
  maxConcurrentLogins: z.number().int().min(1).max(10).default(3),
  customPermissions: z.string().optional(),
});

// Schema for notification form
const notificationSchema = z.object({
  subject: z.string().min(3, { message: "Subject is required" }),
  message: z.string().min(10, { message: "Message is too short" }),
  notificationType: z.enum(['email', 'in_app', 'both']),
  priority: z.enum(['low', 'normal', 'high']),
});

// Define types from schemas
type AccountStatusFormValues = z.infer<typeof accountStatusSchema>;
type PermissionsFormValues = z.infer<typeof permissionsSchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

interface UserAdminToolsProps {
  userId: string;
  userEmail: string;
  userName: string;
  currentStatus: string;
  currentPermissions: {
    canAccessPremiumContent: boolean;
    canAccessBetaFeatures: boolean;
    canPostComments: boolean;
    canSubmitContent: boolean;
    maxConcurrentLogins: number;
    customPermissions?: string;
  };
}

export function UserAdminTools({
  userId,
  userEmail,
  userName,
  currentStatus = 'active',
  currentPermissions = {
    canAccessPremiumContent: false,
    canAccessBetaFeatures: false,
    canPostComments: true,
    canSubmitContent: false,
    maxConcurrentLogins: 3,
    customPermissions: '',
  },
}: UserAdminToolsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [confirmPasswordResetOpen, setConfirmPasswordResetOpen] = useState(false);
  const [confirmStatusChangeOpen, setConfirmStatusChangeOpen] = useState(false);
  const [confirmPermissionsChangeOpen, setConfirmPermissionsChangeOpen] = useState(false);
  
  // Form for account status
  const statusForm = useForm<AccountStatusFormValues>({
    resolver: zodResolver(accountStatusSchema),
    defaultValues: {
      status: currentStatus as any || 'active',
      reason: '',
      sendNotification: true,
    },
  });
  
  // Form for permissions
  const permissionsForm = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: currentPermissions,
  });
  
  // Form for notifications
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      subject: '',
      message: '',
      notificationType: 'email',
      priority: 'normal',
    },
  });
  
  // Handle password reset
  async function handlePasswordReset() {
    setIsResettingPassword(true);
    
    try {
      const result = await resetUserPassword({
        userId,
        adminId: '', // Will be filled by the server action
        sendEmail: true,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success('Password reset email sent successfully');
      setConfirmPasswordResetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  }
  
  // Handle account status change
  async function onStatusSubmit(data: AccountStatusFormValues) {
    try {
      const result = await updateUserStatus({
        userId,
        adminId: '', // Will be filled by the server action
        status: data.status,
        reason: data.reason,
        sendNotification: data.sendNotification,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success(`User status updated to ${data.status}`);
      setConfirmStatusChangeOpen(false);
      statusForm.reset({
        status: data.status,
        reason: '',
        sendNotification: true,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    }
  }
  
  // Handle permissions change
  async function onPermissionsSubmit(data: PermissionsFormValues) {
    try {
      const result = await updateUserPermissions({
        userId,
        adminId: '', // Will be filled by the server action
        permissions: data,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success('User permissions updated successfully');
      setConfirmPermissionsChangeOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user permissions');
    }
  }
  
  // Handle sending notification
  async function onNotificationSubmit(data: NotificationFormValues) {
    try {
      const result = await sendAdminNotification({
        userId,
        adminId: '', // Will be filled by the server action
        subject: data.subject,
        message: data.message,
        notificationType: data.notificationType,
        priority: data.priority,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      toast.success('Notification sent successfully');
      notificationForm.reset({
        subject: '',
        message: '',
        notificationType: 'email',
        priority: 'normal',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notification');
    }
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Administrative Tools</CardTitle>
          <CardDescription>
            Manage user account, permissions, and communications
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="account">Account Management</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>
            
            {/* Account Management Tab */}
            <TabsContent value="account" className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center space-x-2">
                  <UserCog className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-medium">Account Management for {userName || userEmail}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Manage user account status and security settings
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Password Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Reset the user's password. They will receive an email with instructions.
                    </p>
                    <Button
                      onClick={() => setConfirmPasswordResetOpen(true)}
                      className="w-full"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...statusForm}>
                      <form onSubmit={statusForm.handleSubmit(() => setConfirmStatusChangeOpen(true))} className="space-y-4">
                        <FormField
                          control={statusForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                  <SelectItem value="banned">Banned</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={statusForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason for Change</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide a reason for this status change"
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={statusForm.control}
                          name="sendNotification"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Notify User</FormLabel>
                                <FormDescription>
                                  Send an email notification about this change
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
                        
                        <Button type="submit" className="w-full">
                          Update Status
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-medium">Feature Access Control</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Manage what features and content this user can access
                </p>
              </div>
              
              <Form {...permissionsForm}>
                <form onSubmit={permissionsForm.handleSubmit(() => setConfirmPermissionsChangeOpen(true))} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={permissionsForm.control}
                      name="canAccessPremiumContent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Premium Content Access</FormLabel>
                            <FormDescription>
                              Allow access to premium content
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
                    
                    <FormField
                      control={permissionsForm.control}
                      name="canAccessBetaFeatures"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Beta Features Access</FormLabel>
                            <FormDescription>
                              Allow access to beta features
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
                    
                    <FormField
                      control={permissionsForm.control}
                      name="canPostComments"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Comment Permissions</FormLabel>
                            <FormDescription>
                              Allow posting comments
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
                    
                    <FormField
                      control={permissionsForm.control}
                      name="canSubmitContent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Content Submission</FormLabel>
                            <FormDescription>
                              Allow submitting content
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
                  </div>
                  
                  <FormField
                    control={permissionsForm.control}
                    name="maxConcurrentLogins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Concurrent Logins</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of devices the user can be logged in simultaneously
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={permissionsForm.control}
                    name="customPermissions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Permissions (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"custom_feature": true, "access_level": 2}'
                            className="font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Additional permissions in JSON format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Update Permissions
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            {/* Communication Tab */}
            <TabsContent value="communication" className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-medium">User Communication</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Send notifications and messages to this user
                </p>
              </div>
              
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                  <FormField
                    control={notificationForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Notification subject" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your message to the user"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={notificationForm.control}
                      name="notificationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email Only</SelectItem>
                              <SelectItem value="in_app">In-App Only</SelectItem>
                              <SelectItem value="both">Email & In-App</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Send Notification
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Password Reset Confirmation Dialog */}
      <AlertDialog open={confirmPasswordResetOpen} onOpenChange={setConfirmPasswordResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a password reset email to {userEmail}. The user's current password will be invalidated.
              <br /><br />
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
              {isResettingPassword ? 'Sending Reset Email...' : 'Reset Password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={confirmStatusChangeOpen} onOpenChange={setConfirmStatusChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change this user's status to <strong>{statusForm.watch('status')}</strong>.
              <br /><br />
              Reason: {statusForm.watch('reason')}
              <br /><br />
              {statusForm.watch('sendNotification') ? 
                'The user will be notified of this change.' : 
                'The user will NOT be notified of this change.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={statusForm.handleSubmit(onStatusSubmit)}
              className={statusForm.watch('status') === 'banned' || statusForm.watch('status') === 'suspended' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-primary'}
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Permissions Change Confirmation Dialog */}
      <AlertDialog open={confirmPermissionsChangeOpen} onOpenChange={setConfirmPermissionsChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permission Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update this user's permissions. This may affect their access to various features and content.
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={permissionsForm.handleSubmit(onPermissionsSubmit)}
            >
              Update Permissions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
