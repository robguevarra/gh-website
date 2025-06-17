'use client';

import { DashboardLayout } from '@/components/affiliate/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAffiliateProfileData } from '@/lib/hooks/use-affiliate-dashboard';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Info, AlertCircle, Mail, Save, UserIcon, Smartphone, CreditCard, Upload, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { affiliateProfile, isLoadingProfile, updateAffiliateProfile } = useAffiliateProfileData();
  
  const [profileForm, setProfileForm] = useState({
    slug: '',
    displayName: '',
    bio: '',
    website: '',
    emailNotifications: true,
    marketingMaterials: true
  });

  // Enhanced payment form state
  const [paymentForm, setPaymentForm] = useState({
    payoutMethod: 'gcash', // Default to GCash as per requirements
    // GCash fields
    gcashNumber: '',
    gcashName: '',
    // Bank fields
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
  });

  // Verification status (would come from API)
  const [verificationStatus, setVerificationStatus] = useState({
    gcashVerified: false,
    gcashVerificationStatus: 'unverified', // unverified, pending_documents, pending_review, verified, rejected
    bankAccountVerified: false,
    lastVerificationUpdate: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  
  useEffect(() => {
    if (affiliateProfile) {
      setProfileForm({
        slug: affiliateProfile.slug || '',
        displayName: affiliateProfile.display_name || '',
        bio: affiliateProfile.bio || '',
        website: affiliateProfile.website || '',
        emailNotifications: affiliateProfile.email_notifications !== false,
        marketingMaterials: affiliateProfile.marketing_materials !== false
      });

      // Load payment data from API
      loadPaymentData();
    }
  }, [affiliateProfile]);

  const loadPaymentData = async () => {
    try {
      const response = await fetch('/api/affiliate/payment-method');
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        
        setPaymentForm({
          payoutMethod: data.payout_method || 'gcash',
          gcashNumber: data.gcash_number || '',
          gcashName: data.gcash_name || '',
          bankName: data.bank_name || '',
          accountNumber: data.account_number || '',
          accountHolderName: data.account_holder_name || '',
        });

        setVerificationStatus({
          gcashVerified: data.gcash_verified || false,
          gcashVerificationStatus: data.gcash_verification_status || 'unverified',
          bankAccountVerified: data.bank_account_verified || false,
          lastVerificationUpdate: data.gcash_verification_date || data.bank_verification_date,
        });
      }
    } catch (error) {
      console.error('Failed to load payment data:', error);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setProfileForm(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!updateAffiliateProfile) {
      toast({
        title: "Error",
        description: "Update function is not available",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateAffiliateProfile({
        slug: profileForm.slug,
        display_name: profileForm.displayName,
        bio: profileForm.bio,
        website: profileForm.website,
        email_notifications: profileForm.emailNotifications,
        marketing_materials: profileForm.marketingMaterials
      });
      
      toast({
        title: "Settings updated",
        description: "Your affiliate profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPayment(true);

    try {
      // TODO: Call enhanced payment API
      const response = await fetch('/api/affiliate/payment-method', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update payment method');
      }

      toast({
        title: "Payment method updated",
        description: "Your payment details have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to update payment method:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your payment method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending_review':
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'pending_documents':
        return <Badge variant="secondary" className="text-xs"><Upload className="w-3 h-3 mr-1" />Needs Documents</Badge>;
      default:
        return <Badge variant="outline" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Unverified</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your affiliate account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your affiliate profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slug">
                        Affiliate Slug
                      </Label>
                      <Input
                        id="slug"
                        name="slug"
                        value={profileForm.slug}
                        onChange={handleInputChange}
                        placeholder="your-affiliate-slug"
                      />
                      <p className="text-sm text-muted-foreground">
                        Your unique referral link identifier. This will be used in your referral links.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="displayName">
                        Display Name
                      </Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        value={profileForm.displayName}
                        onChange={handleInputChange}
                        placeholder="Enter your display name"
                      />
                      <p className="text-sm text-muted-foreground">
                        This is how you'll appear to others when applicable
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleInputChange}
                        placeholder="Tell us a little about yourself"
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website">Website or Social Media</Label>
                      <Input
                        id="website"
                        name="website"
                        value={profileForm.website}
                        onChange={handleInputChange}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View your account details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Email</Label>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        <p>{affiliateProfile?.user?.email || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Affiliate Status</Label>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2" />
                        <p className="capitalize">{affiliateProfile?.status || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Joined On</Label>
                      <p>
                        {affiliateProfile?.createdAt
                          ? new Date(affiliateProfile.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Affiliate ID</Label>
                      <p>{affiliateProfile?.id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Enhanced Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method Setup
                </CardTitle>
                <CardDescription>
                  Configure how you want to receive your affiliate earnings. All payouts are processed via GCash for faster, more convenient transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handlePaymentSubmit}>
                  {/* Payment Method Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="payoutMethod">Preferred Payout Method</Label>
                    <Select
                      value={paymentForm.payoutMethod}
                      onValueChange={(value) => handleSelectChange('payoutMethod', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payout method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gcash">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            GCash (Recommended)
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      GCash is our preferred method for faster processing and lower fees.
                    </p>
                  </div>

                  <Separator />

                  {/* GCash Setup */}
                  {paymentForm.payoutMethod === 'gcash' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-medium">GCash Account Details</h3>
                        {getVerificationStatusBadge(verificationStatus.gcashVerificationStatus)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gcashNumber">GCash Mobile Number</Label>
                          <Input
                            id="gcashNumber"
                            name="gcashNumber"
                            value={paymentForm.gcashNumber}
                            onChange={handlePaymentInputChange}
                            placeholder="09XXXXXXXXX"
                            maxLength={11}
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter your 11-digit GCash mobile number
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gcashName">Account Holder Name</Label>
                          <Input
                            id="gcashName"
                            name="gcashName"
                            value={paymentForm.gcashName}
                            onChange={handlePaymentInputChange}
                            placeholder="Full name as registered in GCash"
                          />
                          <p className="text-sm text-muted-foreground">
                            Must match your GCash account name exactly
                          </p>
                        </div>
                      </div>

                      {/* Verification Status */}
                      {verificationStatus.gcashVerificationStatus !== 'verified' && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Verification Required</AlertTitle>
                          <AlertDescription>
                            To receive payouts, you'll need to verify your GCash account. After saving your details, 
                            you'll be guided through the verification process which includes uploading a valid ID and selfie.
                          </AlertDescription>
                        </Alert>
                      )}

                      {verificationStatus.gcashVerificationStatus === 'verified' && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertTitle>Account Verified</AlertTitle>
                          <AlertDescription>
                            Your GCash account is verified and ready to receive payouts.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Setup */}
                  {paymentForm.payoutMethod === 'bank_transfer' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-medium">Bank Account Details</h3>
                        {verificationStatus.bankAccountVerified ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />Unverified
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            name="bankName"
                            value={paymentForm.bankName}
                            onChange={handlePaymentInputChange}
                            placeholder="e.g., BPI, BDO, Metrobank"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            name="accountNumber"
                            value={paymentForm.accountNumber}
                            onChange={handlePaymentInputChange}
                            placeholder="Enter your bank account number"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          name="accountHolderName"
                          value={paymentForm.accountHolderName}
                          onChange={handlePaymentInputChange}
                          placeholder="Full name as registered with the bank"
                        />
                        <p className="text-sm text-muted-foreground">
                          Must match your bank account name exactly
                        </p>
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Bank Transfer Notice</AlertTitle>
                        <AlertDescription>
                          Bank transfers may take 3-5 business days to process and may incur additional fees. 
                          Consider using GCash for faster, fee-free transfers.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <Separator />

                  {/* Payout Information */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Payout Schedule & Requirements
                    </h4>
                                         <ul className="text-sm text-muted-foreground space-y-1">
                       <li>• Cutoff is every 25th of the month</li>
                       <li>• Payouts processed at the end of the month</li>
                       <li>• Minimum payout threshold: ₱500.00</li>
                       <li>• Account verification is required before first payout</li>
                       <li>• GCash payouts are processed within 24 hours</li>
                       <li>• Bank transfers take 3-5 business days</li>
                     </ul>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmittingPayment}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Payment Method
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage your notification and communication preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email notifications about commissions and payouts
                        </p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        checked={profileForm.emailNotifications}
                        onCheckedChange={(checked) => handleSwitchChange('emailNotifications', checked)}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="marketingMaterials" className="text-base">Marketing Materials</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new marketing materials and promotional opportunities
                        </p>
                      </div>
                      <Switch
                        id="marketingMaterials"
                        checked={profileForm.marketingMaterials}
                        onCheckedChange={(checked) => handleSwitchChange('marketingMaterials', checked)}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Notification Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
