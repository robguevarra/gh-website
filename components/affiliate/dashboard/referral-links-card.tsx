'use client';

import { Copy, Link as LinkIcon, Edit, Save, X, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useState } from 'react';

import { useAffiliateProfileData } from '@/lib/hooks/use-affiliate-dashboard';
import { Award } from 'lucide-react';

export function ReferralLinksCard() {
  const { affiliateProfile, isLoadingProfile, updateAffiliateProfile } = useAffiliateProfileData();
  
  // Edit state management
  const [isEditing, setIsEditing] = useState(false);
  const [editedSlug, setEditedSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const affiliateLink = affiliateProfile?.slug ? `${baseUrl}/p2p-order-form?a=${affiliateProfile.slug}` : null;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        toast({
          title: "Link Copied",
          description: "Affiliate link copied to clipboard",
        });
      })
      .catch((error) => {
        console.error("Failed to copy:", error);
        toast({
          title: "Copy Failed",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      });
  };

  // Start editing mode
  const handleStartEdit = () => {
    setEditedSlug(affiliateProfile?.slug || '');
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedSlug('');
    setIsEditing(false);
  };

  // Save slug changes
  const handleSaveSlug = async () => {
    if (!editedSlug.trim()) {
      toast({
        title: "Invalid Slug",
        description: "Slug cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (editedSlug.length < 3) {
      toast({
        title: "Invalid Slug", 
        description: "Slug must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(editedSlug)) {
      toast({
        title: "Invalid Slug",
        description: "Slug can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (editedSlug === affiliateProfile?.slug) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      await updateAffiliateProfile({ slug: editedSlug });
      
      toast({
        title: "Slug Updated",
        description: "Your affiliate link has been updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update slug:", error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('already in use') || errorMessage.includes('409')) {
        toast({
          title: "Slug Already Taken",
          description: "This slug is already in use. Please choose a different one.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "There was an error updating your slug. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveSlug();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Your Affiliate Link</CardTitle>
          <CardDescription>Share this link to earn commissions on Papers to Profits</CardDescription>
        </div>
        {!isEditing && affiliateProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoadingProfile ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {isEditing ? (
              // Edit mode
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug-edit">Affiliate Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug-edit"
                      value={editedSlug}
                      onChange={(e) => setEditedSlug(e.target.value.toLowerCase())}
                      onKeyDown={handleKeyPress}
                      placeholder="your-affiliate-slug"
                      className="flex-grow"
                      disabled={isSaving}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveSlug}
                      disabled={isSaving}
                      className="flex items-center gap-1"
                    >
                      {isSaving ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your unique referral link identifier. Must be at least 3 characters, lowercase letters, numbers, and hyphens only.
                  </p>
                </div>
                
                {editedSlug && (
                  <div className="space-y-2">
                    <Label>Preview Link</Label>
                    <div className="p-3 bg-muted rounded-md text-sm font-mono break-all">
                      {baseUrl}/p2p-order-form?a={editedSlug}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Display mode
              <>
                {affiliateLink ? (
                  <div className="flex items-center space-x-2 p-4 bg-muted rounded-md">
                    <LinkIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-mono break-all flex-grow">
                      {affiliateLink}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleCopyLink(affiliateLink)} className="flex-shrink-0">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No affiliate link available.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please contact support if you believe this is an error.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {affiliateProfile?.membershipLevel ? (
              <>
                <Award className="h-3 w-3 text-blue-500" />
                <span>
                  {affiliateProfile.membershipLevel.name}: {(affiliateProfile.membershipLevel.commissionRate * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <span>Commission rate: {affiliateProfile?.commissionRate ? `${(affiliateProfile.commissionRate * 100).toFixed(0)}%` : '—'}</span>
            )}
          </div>
          <div>
            <span>Affiliate since: {affiliateProfile?.createdAt ? new Date(affiliateProfile.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
