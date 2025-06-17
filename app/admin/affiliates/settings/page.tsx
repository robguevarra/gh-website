import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getAffiliateProgramSettings,
  updateAffiliateProgramSettings,
  UpdateAffiliateProgramSettingsArgs
} from '@/lib/actions/admin/settings-actions';
import {
  getMembershipLevels,
  updateMembershipLevelCommissionRates,
  type MembershipLevelData,
  type UpdateMembershipLevelCommissionRateArgs
} from '@/lib/actions/membership-level-actions';
import { AffiliateProgramConfigData, PayoutScheduleType } from '@/types/admin/affiliate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsFormWrapper, type SettingsFormState } from '@/components/admin/affiliates/settings-form-wrapper';

export default async function AffiliateSettingsPage() {
  const settings: AffiliateProgramConfigData = await getAffiliateProgramSettings();
  const membershipLevels: MembershipLevelData[] = await getMembershipLevels();
  const payoutScheduleOptions: PayoutScheduleType[] = ['monthly', 'quarterly', 'bi_annually', 'annually'];

  async function handleSaveSettings(prevState: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
    'use server';

    const currentSettings: AffiliateProgramConfigData = await getAffiliateProgramSettings();

    const newSettings: UpdateAffiliateProgramSettingsArgs = {
      cookie_duration_days: currentSettings.cookie_duration_days,
      min_payout_threshold: currentSettings.min_payout_threshold,
      terms_of_service_content: currentSettings.terms_of_service_content,
      payout_schedule: currentSettings.payout_schedule,
      payout_currency: currentSettings.payout_currency, 
    };

    const formType = formData.get('formType') as string;
    let successMessage = 'Settings saved successfully!';

    try {
      if (formType === 'general') {
        const cookieDuration = formData.get('cookieDuration') as string;
        if (cookieDuration) {
          newSettings.cookie_duration_days = parseInt(cookieDuration, 10);
        }

        const commissionRateUpdates: UpdateMembershipLevelCommissionRateArgs[] = [];
        membershipLevels.forEach(tier => {
          const rateValue = formData.get(`commission_rate_${tier.id}`) as string;
          if (rateValue !== null && rateValue !== undefined) {
            const newRate = rateValue.trim() === '' ? null : parseFloat(rateValue);
            if (newRate !== tier.commission_rate) {
              commissionRateUpdates.push({ id: tier.id, commission_rate: newRate });
            }
          }
        });

        if (commissionRateUpdates.length > 0) {
          await updateMembershipLevelCommissionRates(commissionRateUpdates);
        }
        await updateAffiliateProgramSettings(newSettings);
        successMessage = 'General settings and commission rates saved successfully!';

      } else if (formType === 'payouts') {
        const minPayoutThreshold = formData.get('minimumPayoutThreshold') as string;
        const payoutSchedule = formData.get('payoutSchedule') as PayoutScheduleType;
        
        // Handle payment method checkboxes
        const enabledMethods: string[] = [];
        if (formData.get('enableGcash') === 'on') enabledMethods.push('gcash');
        if (formData.get('enableBankTransfer') === 'on') enabledMethods.push('bank_transfer');
        
        const requireBankVerification = formData.get('requireBankVerification') === 'on';
        const requireGcashVerification = formData.get('requireGcashVerification') === 'on';

        if (minPayoutThreshold) {
          newSettings.min_payout_threshold = parseFloat(minPayoutThreshold);
        }
        if (payoutSchedule) {
          newSettings.payout_schedule = payoutSchedule;
        }
        newSettings.payout_currency = 'PHP';
        newSettings.enabled_payout_methods = enabledMethods;
        newSettings.require_verification_for_bank_transfer = requireBankVerification;
        newSettings.require_verification_for_gcash = requireGcashVerification;

        await updateAffiliateProgramSettings(newSettings);
        successMessage = 'Payout settings saved successfully!';

      } else if (formType === 'agreement') {
        const termsOfService = formData.get('termsOfService') as string;
        newSettings.terms_of_service_content = termsOfService;
        await updateAffiliateProgramSettings(newSettings);
        successMessage = 'Affiliate agreement saved successfully!';
      }
      // Revalidation is handled by the individual update actions (updateAffiliateProgramSettings, updateMembershipLevelCommissionRates)
      return { status: 'success', message: successMessage, timestamp: Date.now() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while saving settings.';
      return { status: 'error', message: errorMessage, timestamp: Date.now() };
    }
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
          <SettingsFormWrapper action={handleSaveSettings} formType="general">
            <input type="hidden" name="formType" value="general" />
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Manage cookie duration. Commission rates are managed per Membership Tier.
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
                      defaultValue={tier.commission_rate === null ? '' : tier.commission_rate.toString()}
                      placeholder="e.g., 10 for 10%"
                      min="0"
                      step="0.01"
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
          </SettingsFormWrapper>
        </TabsContent>

        <TabsContent value="payouts">
          <SettingsFormWrapper action={handleSaveSettings} formType="payouts">
            <input type="hidden" name="formType" value="payouts" />
            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>
                  Configure minimum payout thresholds, payout schedules, and payment methods. Currency is fixed to PHP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  <Label htmlFor="minimumPayoutThreshold">Minimum Payout Threshold</Label>
                  <Input
                    id="minimumPayoutThreshold"
                    name="minimumPayoutThreshold"
                    type="number"
                    defaultValue={settings.min_payout_threshold}
                    placeholder="e.g., 50 for PHP 50"
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payoutSchedule">Payout Schedule</Label>
                  <Select name="payoutSchedule" defaultValue={settings.payout_schedule || 'monthly'}>
                    <SelectTrigger id="payoutSchedule">
                      <SelectValue placeholder="Select a schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutScheduleOptions.map(schedule => (
                        <SelectItem key={schedule} value={schedule}>
                          {schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Payment Methods Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="text-md font-medium mb-2">Enabled Payment Methods</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select which payment methods affiliates can use for payouts.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableGcash"
                        name="enableGcash"
                        defaultChecked={settings.enabled_payout_methods?.includes('gcash') ?? true}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="enableGcash" className="text-sm font-medium">
                        GCash (Recommended for Philippines)
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableBankTransfer"
                        name="enableBankTransfer"
                        defaultChecked={settings.enabled_payout_methods?.includes('bank_transfer') ?? false}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="enableBankTransfer" className="text-sm font-medium">
                        Bank Transfer
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Verification Requirements Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="text-md font-medium mb-2">Verification Requirements</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure which payment methods require identity verification before payouts.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requireGcashVerification"
                        name="requireGcashVerification"
                        defaultChecked={settings.require_verification_for_gcash ?? false}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="requireGcashVerification" className="text-sm font-medium">
                        Require verification for GCash payouts
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requireBankVerification"
                        name="requireBankVerification"
                        defaultChecked={settings.require_verification_for_bank_transfer ?? true}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="requireBankVerification" className="text-sm font-medium">
                        Require verification for bank transfers
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Payout Settings</Button>
              </CardFooter>
            </Card>
          </SettingsFormWrapper>
        </TabsContent>

        <TabsContent value="agreement">
          <SettingsFormWrapper action={handleSaveSettings} formType="agreement">
            <input type="hidden" name="formType" value="agreement" />
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Agreement</CardTitle>
                <CardDescription>
                  Define the terms of service for your affiliate program.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="termsOfService">Terms of Service Content</Label>
                  <Textarea
                    id="termsOfService"
                    name="termsOfService"
                    defaultValue={settings.terms_of_service_content || ''}
                    placeholder="Enter your affiliate program terms of service here..."
                    rows={10}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Agreement</Button>
              </CardFooter>
            </Card>
          </SettingsFormWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
}
