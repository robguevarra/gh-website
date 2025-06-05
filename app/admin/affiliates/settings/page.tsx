import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea'; // Added for ToS
import {
  getAffiliateProgramSettings,
  updateAffiliateProgramSettings,
  UpdateAffiliateProgramSettingsArgs
} from '@/lib/actions/affiliate-actions';
import {
  getMembershipLevels,
  updateMembershipLevelCommissionRates,
  type MembershipLevelData,
  type UpdateMembershipLevelCommissionRateArgs
} from '@/lib/actions/membership-level-actions';
import { AffiliateProgramConfigData } from '@/types/admin/affiliate';
import { revalidatePath } from 'next/cache';

export default async function AffiliateSettingsPage() {
  const settings: AffiliateProgramConfigData = await getAffiliateProgramSettings();
  const membershipLevels: MembershipLevelData[] = await getMembershipLevels();

  async function handleSaveSettings(formData: FormData) {
    'use server';

    const newSettings: UpdateAffiliateProgramSettingsArgs = {};

    const formType = formData.get('formType') as string;

    let membershipTierRatesToUpdate: UpdateMembershipLevelCommissionRateArgs[] = [];

    if (formType === 'general' || formType === 'all') {
      if (formData.has('cookieDuration')) {
        newSettings.cookie_duration_days = parseInt(formData.get('cookieDuration') as string, 10);
      }

      // Process membership tier commission rates
      // Re-fetch membership levels within server action to ensure we have the latest list of IDs
      const currentTiers = await getMembershipLevels(); 
      currentTiers.forEach(tier => {
        const fieldName = `commission_rate_${tier.id}`;
        if (formData.has(fieldName)) {
          const rateValue = formData.get(fieldName) as string;
          // Allow empty string to set commission_rate to null, otherwise parse as float
          const commissionRate = rateValue.trim() === '' ? null : parseFloat(rateValue);
          if (rateValue.trim() !== '' && isNaN(commissionRate!)) {
            // Handle error for invalid number if not empty, but allow null
            console.error(`Invalid number format for tier ${tier.name}: ${rateValue}`);
            // Potentially throw an error or add to an errors array
            return; // Skip this tier or handle error appropriately
          }
          membershipTierRatesToUpdate.push({ id: tier.id, commission_rate: commissionRate });
        }
      });
    }

    if (formType === 'payouts' || formType === 'all') {
      if (formData.has('minimumPayoutThreshold')) {
        newSettings.min_payout_threshold = parseFloat(formData.get('minimumPayoutThreshold') as string);
      }
    }
    
    if (formType === 'agreement' || formType === 'all') {
      if (formData.has('termsOfService')) {
        newSettings.terms_of_service_content = formData.get('termsOfService') as string;
      }
    }

    try {
      let overallSuccess = true;
      let messages: string[] = [];

      // Update general affiliate program settings (e.g., cookie duration)
      if (Object.keys(newSettings).length > 0) {
        const generalSettingsResult = await updateAffiliateProgramSettings(newSettings);
        if (generalSettingsResult.success) {
          messages.push('General affiliate settings updated successfully.');
        } else {
          overallSuccess = false;
          messages.push(`Failed to update general settings: ${generalSettingsResult.error}`);
        }
      }

      // Update membership tier commission rates if they were part of the form
      if ((formType === 'general' || formType === 'all') && membershipTierRatesToUpdate.length > 0) {
        const tierRatesResult = await updateMembershipLevelCommissionRates(membershipTierRatesToUpdate);
        if (tierRatesResult.success) {
          messages.push('Membership tier commission rates updated successfully.');
        } else {
          overallSuccess = false;
          messages.push(`Failed to update tier commission rates: ${tierRatesResult.error}`);
        }
      }
      
      if (overallSuccess && messages.length === 0) {
        // This case might happen if only an empty formType was submitted or no actual changes were made
        messages.push('No changes were submitted or settings are already up to date.');
      } else if (overallSuccess) {
        console.log('All settings updated successfully:', messages.join(' '));
      } else {
        console.error('Error updating settings:', messages.join(' '));
      }
      // Revalidate path after all operations
      revalidatePath('/admin/affiliates/settings');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving settings.';
      console.error('Error saving settings:', errorMessage);
      // Display error message to user (consider a toast notification system)
    }
    // Revalidation is handled by updateAffiliateProgramSettings action
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader 
        title="Affiliate Program Settings" 
        description="Configure global settings for the affiliate program."
      />
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="agreement">Agreement</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form action={handleSaveSettings}>
            <input type="hidden" name="formType" value="general" />
            {/* Pass membership level IDs to the server action if needed, though re-fetching is safer for server actions */}
            {/* {membershipLevels.map(tier => <input type="hidden" key={`tier_id_${tier.id}`} name="tier_ids[]" value={tier.id} />)} */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Manage cookie duration and other general program parameters. Commission rates are managed per Membership Tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Affiliate commission rates are configured individually for each Membership Tier. 
                    You can manage these tiers and their respective commission rates on the <Link href="/admin/membership-tiers" className="text-primary hover:underline">Membership Tiers page</Link>.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cookieDuration">Cookie Duration (days)</Label>
                  <Input 
                    id="cookieDuration"
                    name="cookieDuration" 
                    type="number" 
                    defaultValue={settings.cookie_duration_days} 
                    placeholder="e.g., 30 for 30 days"
                    min="0"
                  />
                </div>

                <div className="space-y-1 pt-4">
                  <h4 className="text-md font-medium">Membership Tier Commission Rates (%)</h4>
                  <p className="text-sm text-muted-foreground">
                    Set the commission rate for each membership tier. This is the percentage of a sale affiliates in that tier will earn.
                    Leave blank to set no specific commission rate for a tier (effectively 0% unless other logic applies).
                  </p>
                </div>
                {membershipLevels.map(tier => (
                  <div key={tier.id} className="space-y-1 flex items-center justify-between">
                    <Label htmlFor={`commission_rate_${tier.id}`} className="whitespace-nowrap pr-4">{tier.name} Commission Rate</Label>
                    <Input 
                      id={`commission_rate_${tier.id}`}
                      name={`commission_rate_${tier.id}`}
                      type="number"
                      defaultValue={tier.commission_rate === null ? '' : tier.commission_rate.toString()} // Handle null for defaultValue
                      placeholder="e.g., 10 for 10%"
                      min="0"
                      step="0.01" // Allows for decimal percentages like 7.5%
                      className="max-w-xs"
                    />
                  </div>
                ))}
                {membershipLevels.length === 0 && (
                  <p className="text-sm text-muted-foreground">No membership tiers found. Please create membership tiers first.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit">Save General Settings</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="payouts">
          <form action={handleSaveSettings}>
            <input type="hidden" name="formType" value="payouts" />
            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>
                  Configure minimum payout thresholds and manage payout methods.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="minimumPayoutThreshold">Minimum Payout Threshold ($)</Label>
                  <Input 
                    id="minimumPayoutThreshold" 
                    name="minimumPayoutThreshold"
                    type="number" 
                    defaultValue={settings.min_payout_threshold} 
                    placeholder="e.g., 50 for $50"
                    min="0"
                    step="0.01"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Payout Settings</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="agreement">
          <form action={handleSaveSettings}>
            <input type="hidden" name="formType" value="agreement" />
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Agreement</CardTitle>
                <CardDescription>
                  Customize the terms of service for your affiliate program.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="termsOfService">Terms of Service Content</Label>
                <Textarea 
                  id="termsOfService"
                  name="termsOfService"
                  placeholder="Enter your affiliate program terms of service here..."
                  defaultValue={settings.terms_of_service_content || ''}
                  className="mt-1 min-h-[200px]"
                />
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Agreement</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
