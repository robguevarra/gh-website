'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import { previewPayoutBatch, createPayoutBatch } from "@/lib/actions/admin/payout-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, DollarSign, Calculator, Users, CheckCircle2, AlertCircle } from "lucide-react";

interface EligibleAffiliate {
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  tier_commission_rate?: number;
  conversions: any[];
  total_amount: number;
  conversion_count: number;
}

interface PayoutPreviewTableProps {
  eligibleAffiliates: EligibleAffiliate[];
}

export function PayoutPreviewTable({ eligibleAffiliates }: PayoutPreviewTableProps) {
  const router = useRouter();
  const [selectedAffiliates, setSelectedAffiliates] = useState<Set<string>>(new Set());
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchPreview, setBatchPreview] = useState<any>(null);
  const [batchName, setBatchName] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('gcash');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Calculate selected totals
  const selectedTotals = useMemo(() => {
    const selectedAffiliatesList = eligibleAffiliates.filter(affiliate => 
      selectedAffiliates.has(affiliate.affiliate_id)
    );
    
    return {
      affiliateCount: selectedAffiliatesList.length,
      conversionCount: selectedAffiliatesList.reduce((sum, affiliate) => sum + affiliate.conversion_count, 0),
      totalAmount: selectedAffiliatesList.reduce((sum, affiliate) => sum + affiliate.total_amount, 0),
    };
  }, [selectedAffiliates, eligibleAffiliates]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAffiliates(new Set(eligibleAffiliates.map(a => a.affiliate_id)));
    } else {
      setSelectedAffiliates(new Set());
    }
  };

  const handleSelectAffiliate = (affiliateId: string, checked: boolean) => {
    const newSelected = new Set(selectedAffiliates);
    if (checked) {
      newSelected.add(affiliateId);
    } else {
      newSelected.delete(affiliateId);
    }
    setSelectedAffiliates(newSelected);
  };

  const handlePreviewBatch = async () => {
    if (selectedAffiliates.size === 0) {
      toast.error('Please select at least one affiliate for the payout batch.');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const { preview, error } = await previewPayoutBatch({
        affiliateIds: Array.from(selectedAffiliates),
        payoutMethod
      });

      if (error) {
        toast.error(`Failed to generate preview: ${error}`);
        return;
      }

      setBatchPreview(preview);
      toast.success('Batch preview generated successfully!');
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('An unexpected error occurred while generating the preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchPreview || selectedAffiliates.size === 0) {
      toast.error('Please generate a preview first before creating the batch.');
      return;
    }

    setIsCreatingBatch(true);
    try {
      const { batch, error } = await createPayoutBatch({
        affiliateIds: Array.from(selectedAffiliates),
        payoutMethod,
        batchName: batchName.trim() || undefined
      });

      if (error) {
        toast.error(`Failed to create batch: ${error}`);
        return;
      }

      toast.success(`Payout batch created successfully! Batch ID: ${batch?.id}`);
      
      // Navigate to the batch detail page
      if (batch?.id) {
        router.push(`/admin/affiliates/payouts/batches/${batch.id}`);
      } else {
        router.push('/admin/affiliates/payouts/batches');
      }
    } catch (err) {
      console.error('Create batch error:', err);
      toast.error('An unexpected error occurred while creating the batch.');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const allSelected = selectedAffiliates.size === eligibleAffiliates.length;
  const someSelected = selectedAffiliates.size > 0 && selectedAffiliates.size < eligibleAffiliates.length;

  return (
    <div className="space-y-6">
      {/* Affiliate Selection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Affiliates for Payout
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which affiliates to include in the payout batch
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className={someSelected ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
                    />
                  </TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligibleAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.affiliate_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAffiliates.has(affiliate.affiliate_id)}
                        onCheckedChange={(checked) => 
                          handleSelectAffiliate(affiliate.affiliate_id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.affiliate_name}</div>
                        <div className="text-sm text-muted-foreground">{affiliate.affiliate_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {affiliate.conversion_count} conversions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {affiliate.tier_commission_rate ? 
                        `${(affiliate.tier_commission_rate * 100).toFixed(1)}%` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(affiliate.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Selection Summary */}
          {selectedAffiliates.size > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Selected Affiliates:</span>
                  <span className="ml-2">{selectedTotals.affiliateCount}</span>
                </div>
                <div>
                  <span className="font-medium">Total Conversions:</span>
                  <span className="ml-2">{selectedTotals.conversionCount}</span>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <span className="ml-2 font-semibold">{formatPrice(selectedTotals.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Batch Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name (Optional)</Label>
              <Input
                id="batchName"
                placeholder="Enter batch name..."
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutMethod">Payout Method</Label>
              <select 
                id="payoutMethod"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
              >
                <option value="gcash">GCash (Recommended)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="xendit">Xendit</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verificationNotes">Verification Notes</Label>
            <Textarea
              id="verificationNotes"
              placeholder="Add any verification notes or special instructions..."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handlePreviewBatch}
              disabled={selectedAffiliates.size === 0 || isLoadingPreview}
              variant="outline"
            >
              {isLoadingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Preview */}
      {batchPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Batch Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Review the calculated fees and totals before creating the batch
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{batchPreview.batch_totals.total_affiliates}</div>
                  <p className="text-xs text-muted-foreground">Affiliates</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{batchPreview.batch_totals.total_conversions}</div>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{formatPrice(batchPreview.batch_totals.total_fee_amount)}</div>
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{formatPrice(batchPreview.batch_totals.total_net_amount)}</div>
                  <p className="text-xs text-muted-foreground">Net Payout</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchPreview.affiliates.map((affiliate: any) => (
                    <TableRow key={affiliate.affiliate_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{affiliate.affiliate_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {affiliate.conversion_count} conversions
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(affiliate.total_amount)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatPrice(affiliate.fee_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatPrice(affiliate.net_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Create Batch Actions */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Review all details carefully before creating the batch
              </div>
              <Button 
                onClick={handleCreateBatch}
                disabled={isCreatingBatch}
                className="bg-primary hover:bg-primary/90"
              >
                {isCreatingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Payout Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 