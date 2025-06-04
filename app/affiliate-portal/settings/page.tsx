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
import { useState, useEffect } from 'react';
import { useAffiliateProfileData } from '@/lib/hooks/use-affiliate-dashboard';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Info, AlertCircle, Mail, Save, UserIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { affiliateProfile, isLoadingProfile, updateAffiliateProfile } = useAffiliateProfileData();
  
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    website: '',
    payoutMethod: '',
    payoutDetails: '',
    emailNotifications: true,
    marketingMaterials: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (affiliateProfile) {
      setProfileForm({
        displayName: affiliateProfile.display_name || '',
        bio: affiliateProfile.bio || '',
        website: affiliateProfile.website || '',
        payoutMethod: affiliateProfile.payout_method || 'paypal',
        payoutDetails: affiliateProfile.payout_details || '',
        emailNotifications: affiliateProfile.email_notifications !== false,
        marketingMaterials: affiliateProfile.marketing_materials !== false
      });
    }
  }, [affiliateProfile]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setProfileForm(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [name]: value }));
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
        display_name: profileForm.displayName,
        bio: profileForm.bio,
        website: profileForm.website,
        payout_method: profileForm.payoutMethod,
        payout_details: profileForm.payoutDetails,
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
                        {affiliateProfile?.created_at
                          ? new Date(affiliateProfile.created_at).toLocaleDateString()
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
          
          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive your affiliate earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payoutMethod">Payout Method</Label>
                      <Select
                        value={profileForm.payoutMethod}
                        onValueChange={(value) => handleSelectChange('payoutMethod', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payout method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="payoutDetails">Payout Details</Label>
                      <Textarea
                        id="payoutDetails"
                        name="payoutDetails"
                        value={profileForm.payoutDetails}
                        onChange={handleInputChange}
                        placeholder="Enter your payment details (PayPal email, bank details, etc.)"
                        className="min-h-[100px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Your payment details are encrypted and securely stored
                      </p>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Important Note</AlertTitle>
                      <AlertDescription>
                        Payouts are processed on the 1st and 15th of each month for balances over $50.
                      </AlertDescription>
                    </Alert>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Payment Settings
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
