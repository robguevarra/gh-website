import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { getAdminAffiliatePayoutById } from "@/lib/actions/admin/payout-actions";
// Import the PayoutStatusBadge component directly from the file path where it exists
import { PayoutStatusBadge } from "../../../../../components/admin/affiliates/payout-status-badge";
import { PayoutStatusType } from "@/types/admin/affiliate";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, ClipboardCheck, DollarSign, FileText, Receipt, User } from "lucide-react";
import Link from "next/link";

interface PayoutDetailPageProps {
  params: {
    payoutId: string;
  };
}

export default async function PayoutDetailPage({ params }: PayoutDetailPageProps) {
  // Await params before use to avoid Next.js dynamic parameter error
  const resolvedParams = await Promise.resolve(params);
  const payoutId = resolvedParams.payoutId;
  
  // Check if payoutId is a valid UUID format to avoid database errors
  // This handles cases where static routes like 'preview' are accidentally caught by this dynamic route
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(payoutId)) {
    console.error(`Invalid UUID format for payoutId: ${payoutId}`);
    return notFound();
  }
  
  // Fetch the payout data
  const { data: payout, error } = await getAdminAffiliatePayoutById(payoutId);
  
  // Handle not found or errors
  if (error || !payout) {
    console.error("Error fetching payout:", error);
    return notFound();
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/admin/affiliates/payouts" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payouts
          </Link>
        </div>
        <PayoutStatusBadge status={payout.status} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payout Details</CardTitle>
            <CardDescription>Basic information about this payout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payout ID</p>
                <p className="font-mono text-sm">{payout.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference</p>
                <p>{payout.reference || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-xl font-semibold">{formatPrice(payout.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                <p className="text-xl font-semibold">{payout.net_amount ? formatPrice(payout.net_amount) : "Not calculated"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing Fee</p>
                <p>{payout.fee_amount ? formatPrice(payout.fee_amount) : "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payout Method</p>
                <p>{payout.payout_method}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(new Date(payout.created_at), "PPP")}
                </p>
              </div>
              {payout.scheduled_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Scheduled For</p>
                  <p className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(new Date(payout.scheduled_at), "PPP")}
                  </p>
                </div>
              )}
              {payout.processed_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processed On</p>
                  <p className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(new Date(payout.processed_at), "PPP")}
                  </p>
                </div>
              )}
            </div>
            
            {payout.processing_notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Processing Notes</p>
                <p className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">{payout.processing_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Affiliate Information</CardTitle>
            <CardDescription>Details about the affiliate receiving this payout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{payout.affiliate_name}</p>
                <p className="text-sm text-muted-foreground">{payout.affiliate_email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affiliate ID</p>
                <p className="font-mono text-sm">{payout.affiliate_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affiliate Slug</p>
                <p className="font-mono text-sm">{payout.affiliate_slug}</p>
              </div>
            </div>
            
            <div className="mt-2">
              <Link 
                href={`/admin/affiliates/${payout.affiliate_id}`}
                className="text-sm text-primary hover:text-primary/80"
              >
                View Full Affiliate Profile
              </Link>
            </div>
          </CardContent>
          
          {payout.xendit_disbursement_id && (
            <CardFooter className="flex flex-col items-start border-t px-6 py-4">
              <p className="text-sm font-medium text-muted-foreground">Xendit Disbursement ID</p>
              <p className="font-mono text-sm">{payout.xendit_disbursement_id}</p>
            </CardFooter>
          )}
        </Card>
      </div>
      
      <Tabs defaultValue="payout-items" className="w-full">
        <TabsList>
          <TabsTrigger value="payout-items" className="flex items-center">
            <Receipt className="mr-2 h-4 w-4" />
            Payout Items ({payout.item_count})
          </TabsTrigger>
          <TabsTrigger value="verifications" className="flex items-center">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Verifications ({payout.verifications?.length || 0})
          </TabsTrigger>
          {payout.status === "completed" && (
            <TabsTrigger value="receipt" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Receipt
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="payout-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout Items</CardTitle>
              <CardDescription>
                Conversions included in this payout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payout.payout_items && payout.payout_items.length > 0 ? (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Conversion ID</th>
                        <th className="px-4 py-3 text-left font-medium">Order ID</th>
                        <th className="px-4 py-3 text-right font-medium">GMV</th>
                        <th className="px-4 py-3 text-right font-medium">Commission</th>
                        <th className="px-4 py-3 text-left font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payout.payout_items?.map((item) => (
                        <tr key={item.item_id} className="border-b">
                          <td className="px-4 py-3 font-mono text-xs">{item.conversion_id}</td>
                          <td className="px-4 py-3 font-mono text-xs">{item.order_id || "N/A"}</td>
                          <td className="px-4 py-3 text-right">
                            {item.gmv ? formatPrice(item.gmv) : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatPrice(item.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.created_at ? format(new Date(item.created_at), "PP") : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-muted-foreground">No items found in this payout</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verification History</CardTitle>
              <CardDescription>
                Administrative verifications performed on this payout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!payout.verifications || payout.verifications.length === 0) ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-muted-foreground">No verifications recorded for this payout</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Admin</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payout.verifications?.map((verification) => (
                        <tr key={verification.verification_id} className="border-b">
                          <td className="px-4 py-3">{verification.admin_name}</td>
                          <td className="px-4 py-3">{verification.type}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs ${verification.is_verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {verification.is_verified ? "Verified" : "Rejected"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {verification.verified_at 
                              ? format(new Date(verification.verified_at), "PP") 
                              : format(new Date(verification.created_at), "PP")}
                          </td>
                          <td className="px-4 py-3">
                            {verification.notes || "No notes"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {payout.status === "completed" && (
          <TabsContent value="receipt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payout Receipt</CardTitle>
                <CardDescription>
                  Official receipt for this completed payout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-md border bg-white p-6">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">Payout Receipt</h3>
                        <p className="text-muted-foreground">
                          {format(new Date(payout.processed_at || payout.created_at), "PPP")}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-sm text-muted-foreground">Paid To</p>
                        <p className="font-medium">{payout.affiliate_name}</p>
                        <p className="text-sm text-muted-foreground">{payout.affiliate_email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{payout.payout_method}</p>
                        {payout.reference && (
                          <p className="text-sm text-muted-foreground">Ref: {payout.reference}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-8 border-t pt-4">
                      <div className="flex justify-between">
                        <p className="text-muted-foreground">Subtotal</p>
                        <p>{formatPrice(payout.amount)}</p>
                      </div>
                      {payout.fee_amount && (
                        <div className="flex justify-between">
                          <p className="text-muted-foreground">Processing Fee</p>
                          <p>{formatPrice(payout.fee_amount)}</p>
                        </div>
                      )}
                      <div className="mt-4 flex justify-between border-t pt-2">
                        <p className="font-medium">Total Paid</p>
                        <p className="font-bold">{formatPrice(payout.net_amount || payout.amount)}</p>
                      </div>
                    </div>
                    
                    {payout.xendit_disbursement_id && (
                      <div className="mt-8 rounded border p-3 text-sm">
                        <p className="font-medium">Payment Processor Info</p>
                        <p className="mt-1 font-mono text-xs">Disbursement ID: {payout.xendit_disbursement_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
