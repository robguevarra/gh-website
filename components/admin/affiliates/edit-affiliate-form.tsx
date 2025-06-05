'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AdminAffiliateListItem, AffiliateStatusType } from '@/types/admin/affiliate';
import { updateAffiliateMembershipLevel, updateAffiliateStatus } from '@/lib/actions/affiliate-actions';
import { getMembershipLevels, MembershipLevelOption } from '@/lib/actions/membership-level-actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface EditAffiliateFormProps {
  affiliate: Pick<AdminAffiliateListItem, 'user_id' | 'name' | 'current_membership_level_id' | 'status'>;
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
}

const affiliateStatusOptions: { value: AffiliateStatusType; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'flagged', label: 'Flagged' },
];

export default function EditAffiliateForm({
  affiliate,
  onFormSubmitSuccess,
  onCancel,
}: EditAffiliateFormProps) {
  const [selectedMembershipLevelId, setSelectedMembershipLevelId] = useState<string | null>(affiliate.current_membership_level_id || null);
  const [selectedStatus, setSelectedStatus] = useState<AffiliateStatusType>(affiliate.status);
  const [membershipLevels, setMembershipLevels] = useState<MembershipLevelOption[]>([]);
  const [isLevelsLoading, setIsLevelsLoading] = useState(false);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedMembershipLevelId(affiliate.current_membership_level_id || null);
    setSelectedStatus(affiliate.status);
  }, [affiliate]);

  useEffect(() => {
    const fetchLevels = async () => {
      setIsLevelsLoading(true);
      setLevelsError(null);
      try {
        const levels = await getMembershipLevels();
        if (levels && levels.length > 0) {
          setMembershipLevels(levels);
        } else {
          setLevelsError('No membership levels found.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch membership levels.';
        setLevelsError(errorMessage);
        toast.error(errorMessage);
      }
      setIsLevelsLoading(false);
    };
    fetchLevels();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    let tierUpdated = false;
    let statusUpdated = false;
    let overallSuccess = true;

    // Update Membership Tier if changed
    if (selectedMembershipLevelId !== (affiliate.current_membership_level_id || null)) {
      try {
        const tierResult = await updateAffiliateMembershipLevel(affiliate.user_id, selectedMembershipLevelId);
        if (tierResult.success) {
          toast.success('Affiliate membership tier updated successfully!');
          tierUpdated = true;
        } else {
          toast.error(tierResult.error || 'Failed to update membership tier.');
          overallSuccess = false;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'An error occurred while updating tier.');
        overallSuccess = false;
      }
    }

    // Update Status if changed
    if (selectedStatus !== affiliate.status && overallSuccess) { // Only proceed if previous steps were successful or no tier change
      try {
        const statusResult = await updateAffiliateStatus(affiliate.user_id, selectedStatus);
        if (statusResult.success) {
          toast.success('Affiliate status updated successfully!');
          statusUpdated = true;
        } else {
          toast.error(statusResult.error || 'Failed to update status.');
          overallSuccess = false;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'An error occurred while updating status.');
        overallSuccess = false;
      }
    }

    setIsSubmitting(false);

    if (overallSuccess && (tierUpdated || statusUpdated)) {
      setTimeout(() => {
        onFormSubmitSuccess();
      }, 1000); // Shorter timeout as individual toasts already shown
    } else if (!tierUpdated && !statusUpdated && selectedMembershipLevelId === (affiliate.current_membership_level_id || null) && selectedStatus === affiliate.status) {
      toast.info('No changes were made.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Edit Affiliate</CardTitle>
        <CardDescription>Update membership tier and status for {affiliate.name}.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="membershipLevel">Membership Tier</Label>
            {isLevelsLoading ? (
              <p>Loading membership levels...</p>
            ) : levelsError ? (
              <p className="text-red-500 text-sm">{levelsError}</p>
            ) : (
              <Select
                value={selectedMembershipLevelId || ''}
                onValueChange={(value) => setSelectedMembershipLevelId(value === '' ? null : value)}
                disabled={isSubmitting || isLevelsLoading}
              >
                <SelectTrigger id="membershipLevel">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {membershipLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Affiliate Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as AffiliateStatusType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {affiliateStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLevelsLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
