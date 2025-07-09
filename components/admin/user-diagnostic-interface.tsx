'use client';

import { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  Mail, 
  User, 
  AlertTriangle, 
  ShoppingCart, 
  GraduationCap, 
  Link2, 
  Info,
  UserPlus,
  Plus,
  CheckCircle,
  Package
} from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


// Types for the diagnostic data
interface DiagnosticUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  last_login_at?: string;
  admin_metadata?: {
    secondary_emails?: string[];
  };
}

interface DiagnosticTransaction {
  id: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  transaction_type: string;
  metadata?: any;
}

interface DiagnosticShopifyCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unified_profile_id?: string;
  total_spent: number;
  orders_count: number;
}

interface DiagnosticEnrollment {
  id: string;
  course_title: string;
  enrolled_at: string;
  status: string;
}

interface DiagnosticData {
  user?: DiagnosticUser;
  ebookContact?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
  };
  transactions: DiagnosticTransaction[];
  shopifyCustomers: DiagnosticShopifyCustomer[];
  shopifyOrders: any[];
  enrollments: DiagnosticEnrollment[];
  attributionGaps: {
    unlinkedShopifyCustomers: DiagnosticShopifyCustomer[];
  };
  p2pEnrollmentAnalysis?: {
    isEnrolledInP2P: boolean;
    shouldBeEnrolledInP2P: boolean;
    hasEnrollmentGap: boolean;
    qualifyingTransactions: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      transaction_type: string;
      created_at: string;
      metadata: any;
    }>;
    hasSystemeioP2PRecord: boolean;
    canManuallyEnroll: boolean;
  };
}

interface EmailManagementState {
  isOpen: boolean;
  action: 'update-primary' | 'add-secondary' | 'link-shopify' | 'resend-welcome' | 'update-ebook-contact' | null;
  targetShopifyCustomer?: DiagnosticShopifyCustomer;
}

export function UserDiagnosticInterface() {
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [emailManagement, setEmailManagement] = useState<EmailManagementState>({
    isOpen: false,
    action: null,
  });

  // Email management form states
  const [newPrimaryEmail, setNewPrimaryEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [linkingNotes, setLinkingNotes] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isAddingSecondary, setIsAddingSecondary] = useState(false);
  const [isLinkingShopify, setIsLinkingShopify] = useState(false);
  const [isUpdatingEbookContact, setIsUpdatingEbookContact] = useState(false);
  const [emailLoadingStates, setEmailLoadingStates] = useState<Record<string, boolean>>({});
  
  // Ebook contact form states
  const [ebookContactForm, setEbookContactForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  // P2P enrollment states
  const [isEnrollingP2P, setIsEnrollingP2P] = useState(false);
  const [showManualEnrollmentDialog, setShowManualEnrollmentDialog] = useState(false);
  const [manualEnrollmentData, setManualEnrollmentData] = useState({
    firstName: '',
    lastName: ''
  });

  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast.error('Please enter an email address to search');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/admin/user-diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: searchEmail.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user diagnostic data');
      }

      const data = await response.json();
      setDiagnosticData(data);
      
      if (!data.user && data.transactions.length === 0 && data.shopifyCustomers.length === 0) {
        toast.info('No user data found for this email address');
      } else {
        toast.success('User diagnostic data loaded successfully');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search user data');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdatePrimaryEmail = async () => {
    if (!diagnosticData?.user || !newPrimaryEmail.trim()) {
      toast.error('Missing required data for email update');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const response = await fetch('/api/admin/email-management/update-primary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: diagnosticData.user.id,
          newEmail: newPrimaryEmail.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update primary email');
      }

      toast.success(`Primary email updated successfully from ${searchEmail} to ${newPrimaryEmail.trim()}`);
      
      // Update search email to the new email for continuity
      const updatedEmail = newPrimaryEmail.trim();
      setSearchEmail(updatedEmail);
      
      // Close modal and reset form
      setEmailManagement({ isOpen: false, action: null });
      setNewPrimaryEmail('');
      
      // Refresh diagnostic data with the new email
      setIsSearching(true);
      try {
        const refreshResponse = await fetch('/api/admin/user-diagnostic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: updatedEmail }),
        });

        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setDiagnosticData(refreshedData);
          toast.success('User data refreshed with updated email');
        }
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        toast.warning('Email updated but failed to refresh user data. Please search again.');
      } finally {
        setIsSearching(false);
      }
      
    } catch (error) {
      console.error('Error updating primary email:', error);
      toast.error('Failed to update primary email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleAddSecondaryEmail = async () => {
    if (!diagnosticData?.user || !secondaryEmail.trim()) {
      toast.error('Missing required data for secondary email');
      return;
    }

    setIsAddingSecondary(true);
    try {
      const response = await fetch('/api/admin/email-management/add-secondary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: diagnosticData.user.id,
          secondaryEmail: secondaryEmail.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add secondary email');
      }

      toast.success(`Secondary email "${secondaryEmail.trim()}" added successfully`);
      setEmailManagement({ isOpen: false, action: null });
      setSecondaryEmail('');
      
      // Refresh diagnostic data with current search email
      handleSearch();
    } catch (error) {
      console.error('Error adding secondary email:', error);
      toast.error('Failed to add secondary email');
    } finally {
      setIsAddingSecondary(false);
    }
  };

  const handleLinkShopifyCustomer = async () => {
    if (!diagnosticData?.user || !emailManagement.targetShopifyCustomer) {
      toast.error('Missing required data for Shopify linking');
      return;
    }

    setIsLinkingShopify(true);
    try {
      const response = await fetch('/api/admin/email-management/link-shopify-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unifiedProfileId: diagnosticData.user.id,
          shopifyCustomerId: emailManagement.targetShopifyCustomer.id,
          notes: linkingNotes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link Shopify customer');
      }

      toast.success(`Shopify customer "${emailManagement.targetShopifyCustomer.email}" linked successfully`);
      setEmailManagement({ isOpen: false, action: null, targetShopifyCustomer: undefined });
      setLinkingNotes('');
      
      // Refresh diagnostic data with current search email
      handleSearch();
    } catch (error) {
      console.error('Error linking Shopify customer:', error);
      toast.error('Failed to link Shopify customer');
    } finally {
      setIsLinkingShopify(false);
    }
  };

  const handleUpdateEbookContact = async () => {
    if (!diagnosticData?.ebookContact || !ebookContactForm.email.trim()) {
      toast.error('Email is required for ebook contact update');
      return;
    }

    setIsUpdatingEbookContact(true);
    try {
      const currentEmail = diagnosticData.ebookContact.email;
      const updates: Record<string, any> = {};
      
      if (ebookContactForm.email !== currentEmail) {
        updates.email = ebookContactForm.email.trim();
      }
      if (ebookContactForm.first_name !== (diagnosticData.ebookContact.first_name || '')) {
        updates.first_name = ebookContactForm.first_name.trim() || null;
      }
      if (ebookContactForm.last_name !== (diagnosticData.ebookContact.last_name || '')) {
        updates.last_name = ebookContactForm.last_name.trim() || null;
      }
      if (ebookContactForm.phone !== (diagnosticData.ebookContact.phone || '')) {
        updates.phone = ebookContactForm.phone.trim() || null;
      }

      if (Object.keys(updates).length === 0) {
        toast.warning('No changes detected');
        setEmailManagement({ isOpen: false, action: null });
        return;
      }

      const response = await fetch('/api/admin/email-management/update-ebook-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentEmail,
          updates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update ebook contact');
      }

      toast.success('Ebook contact updated successfully');
      
      // Update search email if email was changed
      if (updates.email) {
        setSearchEmail(updates.email);
        toast.info(`Search updated to new email: ${updates.email}`);
      }
      
      // Close modal and reset form
      setEmailManagement({ isOpen: false, action: null });
      setEbookContactForm({ email: '', first_name: '', last_name: '', phone: '' });
      
      // Refresh diagnostic data
      handleSearch();
      
    } catch (error) {
      console.error('Error updating ebook contact:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ebook contact';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingEbookContact(false);
    }
  };

  const handleResendWelcomeEmail = async (transactionType: string) => {
    // Determine which email to use - prefer user email, fallback to ebook contact
    const targetEmail = diagnosticData?.user?.email || diagnosticData?.ebookContact?.email;
    
    if (!targetEmail) {
      toast.error('No email found for welcome email resend');
      return;
    }

    try {
      setEmailLoadingStates(prev => ({ ...prev, [transactionType]: true }));
      toast.info(`Resending ${transactionType} welcome email to ${targetEmail}`);
      
      // Call the resend welcome email API
      const response = await fetch('/api/admin/email-management/resend-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          context: transactionType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast.success(`${transactionType} welcome email sent successfully!`);
      console.log(`[Email Resend] ${result.message} (Template: ${result.templateUsed}, Message ID: ${result.messageId})`);
    } catch (error) {
      console.error('Error resending welcome email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend welcome email';
      toast.error(errorMessage);
    } finally {
      setEmailLoadingStates(prev => ({ ...prev, [transactionType]: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // P2P enrollment functions
  const handleP2PEnrollment = async (source: 'transaction' | 'systemeio' | 'manual', transactionId?: string) => {
    if (!searchEmail.trim()) {
      toast.error('No email address available for enrollment');
      return;
    }

    console.log('🚀 Starting P2P enrollment:', { source, transactionId, email: searchEmail });
    setIsEnrollingP2P(true);
    try {
      const requestBody: any = {
        email: searchEmail.trim(),
        source
      };

      if (source === 'transaction' && transactionId) {
        requestBody.transaction_id = transactionId;
      } else if (source === 'manual') {
        if (!manualEnrollmentData.firstName.trim()) {
          toast.error('First name is required for manual enrollment');
          setIsEnrollingP2P(false);
          return;
        }
        requestBody.manual_data = {
          firstName: manualEnrollmentData.firstName.trim(),
          lastName: manualEnrollmentData.lastName.trim()
        };
      }

      console.log('📤 Sending request body:', requestBody);

      const response = await fetch('/api/admin/user-diagnostic/enroll-p2p', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📬 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error response:', error);
        throw new Error(error.error || 'Failed to enroll user in P2P course');
      }

      const result = await response.json();
      console.log('✅ Success response:', result);
      toast.success(`Successfully enrolled ${searchEmail} in P2P course`);
      
      // Close manual enrollment dialog if it was open
      setShowManualEnrollmentDialog(false);
      setManualEnrollmentData({ firstName: '', lastName: '' });
      
      // Refresh diagnostic data
      handleSearch();
    } catch (error) {
      console.error('💥 Error enrolling in P2P:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enroll in P2P course');
    } finally {
      setIsEnrollingP2P(false);
      console.log('🏁 P2P enrollment finished');
    }
  };

  const [isLinkingUsers, setIsLinkingUsers] = useState(false);

  const handleLinkUsers = async (userIds: string[]) => {
    if (userIds.length < 2) {
      toast.error('Please select two users to link.');
      return;
    }

    setIsLinkingUsers(true);
    try {
      const response = await fetch('/api/admin/email-management/link-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryUserId: userIds[0],
          secondaryUserId: userIds[1],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link users');
      }

      toast.success('Users linked successfully!');
      handleSearch(); // Refresh data to show updated attribution
    } catch (error) {
      console.error('Error linking users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link users');
    } finally {
      setIsLinkingUsers(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            User Search
          </CardTitle>
          <CardDescription>
            Search by any email address to view comprehensive user data and identify attribution gaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter email address to search..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching} className="w-full sm:w-auto">
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      {diagnosticData && (
        <div className="space-y-6">
          {/* User Profile Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnosticData.user ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">
                        {diagnosticData.user.first_name || diagnosticData.user.last_name
                          ? `${diagnosticData.user.first_name || ''} ${diagnosticData.user.last_name || ''}`.trim()
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Primary Email</Label>
                      <p className="text-sm break-all">{diagnosticData.user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge variant={diagnosticData.user.status === 'active' ? 'default' : 'secondary'}>
                        {diagnosticData.user.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm">{formatDate(diagnosticData.user.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Login</Label>
                      <p className="text-sm">
                        {diagnosticData.user.last_login_at 
                          ? formatDate(diagnosticData.user.last_login_at)
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Secondary Emails</Label>
                      <p className="text-sm">
                        {diagnosticData.user.admin_metadata?.secondary_emails?.length 
                          ? diagnosticData.user.admin_metadata.secondary_emails.join(', ')
                          : 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Email Management Actions */}
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    <Dialog 
                      open={emailManagement.isOpen && emailManagement.action === 'update-primary'} 
                      onOpenChange={(open) => !open && setEmailManagement({ isOpen: false, action: null })}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => setEmailManagement({ isOpen: true, action: 'update-primary' })}
                        >
                          <Mail className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Update Primary Email</span>
                          <span className="sm:hidden">Update Email</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Primary Email</DialogTitle>
                          <DialogDescription>
                            This will update the primary email across all tables and send verification emails.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="newPrimaryEmail">New Primary Email</Label>
                            <Input
                              id="newPrimaryEmail"
                              value={newPrimaryEmail}
                              onChange={(e) => setNewPrimaryEmail(e.target.value)}
                              placeholder="Enter new primary email"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                          onClick={handleUpdatePrimaryEmail}
                          disabled={isUpdatingEmail}
                        >
                          {isUpdatingEmail ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update Email'
                          )}
                        </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEmailManagement({ isOpen: false, action: null })}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog 
                      open={emailManagement.isOpen && emailManagement.action === 'add-secondary'} 
                      onOpenChange={(open) => !open && setEmailManagement({ isOpen: false, action: null })}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => setEmailManagement({ isOpen: true, action: 'add-secondary' })}
                        >
                          <Mail className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Add Secondary Email</span>
                          <span className="sm:hidden">Add Email</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Secondary Email</DialogTitle>
                          <DialogDescription>
                            Add an additional email address for this user account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="secondaryEmail">Secondary Email</Label>
                            <Input
                              id="secondaryEmail"
                              value={secondaryEmail}
                              onChange={(e) => setSecondaryEmail(e.target.value)}
                              placeholder="Enter secondary email"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                          onClick={handleAddSecondaryEmail}
                          disabled={isAddingSecondary}
                        >
                          {isAddingSecondary ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Email'
                          )}
                        </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEmailManagement({ isOpen: false, action: null })}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                                         {/* Welcome Email Actions */}
                     {diagnosticData.transactions?.length > 0 && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => handleResendWelcomeEmail('P2P')}
                          disabled={emailLoadingStates['P2P']}
                        >
                          {emailLoadingStates['P2P'] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                              <span className="hidden sm:inline">Sending...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Resend P2P Welcome</span>
                              <span className="sm:hidden">P2P Welcome</span>
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => handleResendWelcomeEmail('Canva')}
                          disabled={emailLoadingStates['Canva']}
                        >
                          {emailLoadingStates['Canva'] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                              <span className="hidden sm:inline">Sending...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Resend Canva Welcome</span>
                              <span className="sm:hidden">Canva Welcome</span>
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={() => handleResendWelcomeEmail('Shopify')}
                          disabled={emailLoadingStates['Shopify']}
                        >
                          {emailLoadingStates['Shopify'] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                              <span className="hidden sm:inline">Sending...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Resend Shopify Welcome</span>
                              <span className="sm:hidden">Shopify Welcome</span>
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No unified profile found for this email. User may exist only in legacy systems.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* P2P Enrollment Analysis */}
          {diagnosticData.p2pEnrollmentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  P2P Course Enrollment Analysis
                </CardTitle>
                <CardDescription>
                  Automatic detection of P2P enrollment status and missing enrollments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enrollment Status Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border-2 bg-muted/50 gap-3">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={diagnosticData.p2pEnrollmentAnalysis.isEnrolledInP2P ? 'default' : 'destructive'}
                      className="text-sm"
                    >
                      {diagnosticData.p2pEnrollmentAnalysis.isEnrolledInP2P ? '✅ Enrolled in P2P' : '❌ Not Enrolled in P2P'}
                    </Badge>
                    {diagnosticData.p2pEnrollmentAnalysis.hasEnrollmentGap && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        ⚠️ Missing Enrollment
                      </Badge>
                    )}
                  </div>
                  {diagnosticData.p2pEnrollmentAnalysis.hasEnrollmentGap && (
                    <div className="text-sm text-orange-600 font-medium">
                      User should be enrolled based on qualifying records
                    </div>
                  )}
                </div>

                {/* Qualifying Transactions Section */}
                {diagnosticData.p2pEnrollmentAnalysis.qualifyingTransactions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold">Qualifying P2P Transactions</Label>
                      <Badge variant="secondary" className="text-xs">
                        {diagnosticData.p2pEnrollmentAnalysis.qualifyingTransactions.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {diagnosticData.p2pEnrollmentAnalysis.qualifyingTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-background gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <Badge variant="outline" className="text-xs self-start">{transaction.status}</Badge>
                            <div className="text-sm space-y-1 sm:space-y-0 min-w-0">
                              <div className="font-medium">{formatCurrency(transaction.amount)} {transaction.currency}</div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-muted-foreground text-xs">
                                <span className="break-all">{transaction.transaction_type}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="break-all">{formatDate(transaction.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          {diagnosticData.p2pEnrollmentAnalysis!.hasEnrollmentGap && (
                            <Button 
                              size="sm" 
                              onClick={() => handleP2PEnrollment('transaction', transaction.id)}
                              disabled={isEnrollingP2P}
                              className="shrink-0 w-full sm:w-auto"
                            >
                              {isEnrollingP2P ? (
                                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <UserPlus className="h-4 w-4 mr-1" />
                              )}
                              Enroll Now
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Systemeio Section */}
                {diagnosticData.p2pEnrollmentAnalysis.hasSystemeioP2PRecord && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Systemeio P2P Record</Label>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-background gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className="text-xs self-start">Systemeio</Badge>
                        <div className="text-sm space-y-1 sm:space-y-0 min-w-0">
                          <div className="font-medium">P2P Record Found</div>
                          <div className="text-muted-foreground text-xs">Tagged as 'imported' or 'PaidP2P'</div>
                        </div>
                      </div>
                      {diagnosticData.p2pEnrollmentAnalysis.hasEnrollmentGap && (
                        <Button 
                          size="sm" 
                          onClick={() => handleP2PEnrollment('systemeio')}
                          disabled={isEnrollingP2P}
                          className="shrink-0 w-full sm:w-auto"
                        >
                          {isEnrollingP2P ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-1" />
                          )}
                          Enroll from Systemeio
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Enrollment Section */}
                {diagnosticData.p2pEnrollmentAnalysis.canManuallyEnroll && !diagnosticData.p2pEnrollmentAnalysis.isEnrolledInP2P && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Manual Enrollment</Label>
                    <div className="p-3 border rounded-lg bg-background">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Manually enroll this user in the P2P course
                        </div>
                        <Dialog open={showManualEnrollmentDialog} onOpenChange={setShowManualEnrollmentDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Manual P2P Enrollment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manual P2P Enrollment</DialogTitle>
                              <DialogDescription>
                                Manually enroll {searchEmail} in the P2P course. This will create necessary records.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="manualFirstName">First Name *</Label>
                                <Input
                                  id="manualFirstName"
                                  value={manualEnrollmentData.firstName}
                                  onChange={(e) => setManualEnrollmentData(prev => ({ ...prev, firstName: e.target.value }))}
                                  placeholder="Enter first name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="manualLastName">Last Name</Label>
                                <Input
                                  id="manualLastName"
                                  value={manualEnrollmentData.lastName}
                                  onChange={(e) => setManualEnrollmentData(prev => ({ ...prev, lastName: e.target.value }))}
                                  placeholder="Enter last name (optional)"
                                />
                              </div>
                              <div className="flex justify-end gap-3">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowManualEnrollmentDialog(false)}
                                  disabled={isEnrollingP2P}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => handleP2PEnrollment('manual')}
                                  disabled={isEnrollingP2P || !manualEnrollmentData.firstName.trim()}
                                >
                                  {isEnrollingP2P ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Enrolling...
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      Enroll in P2P
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {!diagnosticData.p2pEnrollmentAnalysis.hasEnrollmentGap && diagnosticData.p2pEnrollmentAnalysis.isEnrolledInP2P && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ User is properly enrolled in P2P course. No action needed.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ebook Contact Information - Only show if user not found but ebook contact exists */}
          {!diagnosticData.user && diagnosticData.ebookContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Ebook Customer (No Auth Account)
                </CardTitle>
                <CardDescription>
                  This email purchased a Canva ebook but doesn't have a full user account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">
                        {diagnosticData.ebookContact.first_name || diagnosticData.ebookContact.last_name
                          ? `${diagnosticData.ebookContact.first_name || ''} ${diagnosticData.ebookContact.last_name || ''}`.trim()
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm break-all">{diagnosticData.ebookContact.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm">{diagnosticData.ebookContact.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">First Purchase</Label>
                      <p className="text-sm">{formatDate(diagnosticData.ebookContact.created_at!)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Updated</Label>
                      <p className="text-sm">
                        {diagnosticData.ebookContact.updated_at 
                          ? formatDate(diagnosticData.ebookContact.updated_at)
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Email Management Actions for Ebook Customers */}
                  <Separator />
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleResendWelcomeEmail('Canva')}
                      disabled={emailLoadingStates['Canva']}
                    >
                      {emailLoadingStates['Canva'] ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Canva Ebook
                        </>
                      )}
                    </Button>
                    
                    <Dialog 
                      open={emailManagement.isOpen && emailManagement.action === 'update-ebook-contact'} 
                      onOpenChange={(open) => {
                        if (!open) {
                          setEmailManagement({ isOpen: false, action: null });
                          setEbookContactForm({ email: '', first_name: '', last_name: '', phone: '' });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEmailManagement({ isOpen: true, action: 'update-ebook-contact' });
                            setEbookContactForm({
                              email: diagnosticData.ebookContact?.email || '',
                              first_name: diagnosticData.ebookContact?.first_name || '',
                              last_name: diagnosticData.ebookContact?.last_name || '',
                              phone: diagnosticData.ebookContact?.phone || ''
                            });
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Update Contact Info
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Ebook Contact Information</DialogTitle>
                          <DialogDescription>
                            Update the contact information for this ebook customer. Email changes will update all references.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="ebookEmail">Email Address</Label>
                            <Input
                              id="ebookEmail"
                              value={ebookContactForm.email}
                              onChange={(e) => setEbookContactForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Enter email address"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="ebookFirstName">First Name</Label>
                              <Input
                                id="ebookFirstName"
                                value={ebookContactForm.first_name}
                                onChange={(e) => setEbookContactForm(prev => ({ ...prev, first_name: e.target.value }))}
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="ebookLastName">Last Name</Label>
                              <Input
                                id="ebookLastName"
                                value={ebookContactForm.last_name}
                                onChange={(e) => setEbookContactForm(prev => ({ ...prev, last_name: e.target.value }))}
                                placeholder="Last name"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="ebookPhone">Phone Number</Label>
                            <Input
                              id="ebookPhone"
                              value={ebookContactForm.phone}
                              onChange={(e) => setEbookContactForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone number"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleUpdateEbookContact}
                              disabled={isUpdatingEbookContact}
                            >
                              {isUpdatingEbookContact ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update Contact'
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setEmailManagement({ isOpen: false, action: null });
                                setEbookContactForm({ email: '', first_name: '', last_name: '', phone: '' });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Tabs */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground min-w-full w-max gap-1">
                  <TabsTrigger 
                    value="transactions" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/50 min-w-fit"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-medium">Transactions</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium shrink-0">
                      {diagnosticData.transactions?.length || 0}
                    </span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="shopify" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/50 min-w-fit"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-medium">Shopify</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium shrink-0">
                      {diagnosticData.shopifyCustomers?.length || 0}
                    </span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="enrollments" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/50 min-w-fit"
                  >
                    <GraduationCap className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-medium">Enrollments</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium shrink-0">
                      {diagnosticData.enrollments?.length || 0}
                    </span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="attribution" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/50 min-w-fit"
                  >
                    <Link2 className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-medium">Attribution Gaps</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium shrink-0">
                      {diagnosticData.attributionGaps?.unlinkedShopifyCustomers?.length || 0}
                    </span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="orders" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-background/50 min-w-fit"
                  >
                    <Package className="h-4 w-4 mr-2 shrink-0" />
                    <span className="font-medium">Orders</span>
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium shrink-0">
                      {diagnosticData.shopifyOrders?.length || 0}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Scroll indicator gradients */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-60" />
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-60" />
            </div>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Direct Transactions</CardTitle>
                  <CardDescription>P2P payments and other direct transactions</CardDescription>
                </CardHeader>
                                 <CardContent>
                   {diagnosticData.transactions?.length > 0 ? (
                     <div className="space-y-3">
                       {diagnosticData.transactions.map((transaction) => (
                        <div key={transaction.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">
                             {transaction.metadata?.item_name || 
                              transaction.metadata?.product_name || 
                              transaction.transaction_type || 
                              'Unknown Transaction'}
                           </h4>
                                                              <p className="text-sm text-muted-foreground">
                                  {transaction.payment_method || 'Unknown Method'} • {formatDate(transaction.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No direct transactions found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shopify" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shopify Customers</CardTitle>
                  <CardDescription>Customer records from Shopify</CardDescription>
                </CardHeader>
                                 <CardContent>
                   {diagnosticData.shopifyCustomers?.length > 0 ? (
                     <div className="space-y-3">
                       {diagnosticData.shopifyCustomers.map((customer) => (
                        <div key={customer.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">
                                {customer.first_name || customer.last_name
                                  ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                  : customer.email}
                              </h4>
                              <p className="text-sm text-muted-foreground break-all">{customer.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer.orders_count} orders • {formatCurrency(customer.total_spent)} total
                              </p>
                            </div>
                            <div className="text-right">
                              {customer.unified_profile_id ? (
                                <Badge variant="default">Linked</Badge>
                              ) : (
                                <Badge variant="destructive">Unlinked</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No Shopify customers found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrollments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Enrollments</CardTitle>
                  <CardDescription>Current course enrollments and progress</CardDescription>
                </CardHeader>
                                 <CardContent>
                   {diagnosticData.enrollments?.length > 0 ? (
                     <div className="space-y-3">
                       {diagnosticData.enrollments.map((enrollment) => (
                        <div key={enrollment.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{enrollment.course_title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Enrolled: {formatDate(enrollment.enrolled_at)}
                              </p>
                            </div>
                            <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                              {enrollment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No course enrollments found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attribution" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attribution Gaps</CardTitle>
                  <CardDescription>Unlinked Shopify customers that can be attributed to this user</CardDescription>
                </CardHeader>
                                 <CardContent>
                   {diagnosticData.attributionGaps?.unlinkedShopifyCustomers?.length > 0 ? (
                     <div className="space-y-3">
                       {diagnosticData.attributionGaps.unlinkedShopifyCustomers.map((customer) => (
                        <div key={customer.id} className="border rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium">
                                {customer.first_name || customer.last_name
                                  ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                  : customer.email}
                              </h4>
                              <p className="text-sm text-muted-foreground break-all">{customer.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer.orders_count} orders • {formatCurrency(customer.total_spent)} total
                              </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Dialog 
                                open={emailManagement.isOpen && emailManagement.action === 'link-shopify' && emailManagement.targetShopifyCustomer?.id === customer.id} 
                                onOpenChange={(open) => !open && setEmailManagement({ isOpen: false, action: null, targetShopifyCustomer: undefined })}
                              >
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => setEmailManagement({ 
                                      isOpen: true, 
                                      action: 'link-shopify', 
                                      targetShopifyCustomer: customer 
                                    })}
                                  >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Link to User</span>
                                    <span className="sm:hidden">Link</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Link Shopify Customer</DialogTitle>
                                    <DialogDescription>
                                      Link this Shopify customer to the current user profile. This will attribute their purchase history.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Alert>
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>
                                        Customer: {customer.email} ({customer.orders_count} orders, {formatCurrency(customer.total_spent)} total)
                                      </AlertDescription>
                                    </Alert>
                                    <div>
                                      <Label htmlFor="linkingNotes">Verification Notes</Label>
                                      <Textarea
                                        id="linkingNotes"
                                        value={linkingNotes}
                                        onChange={(e) => setLinkingNotes(e.target.value)}
                                        placeholder="Add notes about verification process..."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                          onClick={handleLinkShopifyCustomer}
                          disabled={isLinkingShopify}
                        >
                          {isLinkingShopify ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Linking...
                            </>
                          ) : (
                            'Link Customer'
                          )}
                        </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setEmailManagement({ isOpen: false, action: null, targetShopifyCustomer: undefined })}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No unlinked Shopify customers found. All purchases are properly attributed.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shopify Orders</CardTitle>
                  <CardDescription>Order history from Shopify</CardDescription>
                </CardHeader>
                                 <CardContent>
                   {diagnosticData.shopifyOrders?.length > 0 ? (
                     <div className="space-y-3">
                       {diagnosticData.shopifyOrders.map((order, index) => (
                        <div key={order.id || index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">Order #{order.order_number || order.id}</h4>
                              <p className="text-sm text-muted-foreground break-all">
                                {order.email} • {formatDate(order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(order.total_price || 0)}</p>
                              <Badge variant={order.financial_status === 'paid' ? 'default' : 'secondary'}>
                                {order.financial_status || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No Shopify orders found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 