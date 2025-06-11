"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Eye, FileText, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AdminAffiliatePayoutItem } from "@/types/admin/affiliate";
import { PayoutStatusBadge } from "../payout-status-badge";

interface PayoutsListProps {
  payouts: AdminAffiliatePayoutItem[];
  pendingPayoutsTotal?: number;
  processingPayoutsTotal?: number;
  completedPayoutsTotal?: number;
}

export function PayoutsList({
  payouts,
  pendingPayoutsTotal = 0,
  processingPayoutsTotal = 0,
  completedPayoutsTotal = 0,
}: PayoutsListProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  // Filter payouts by tab
  const filteredPayouts = payouts.filter((payout) => {
    // Apply tab filter
    if (activeTab === "pending" && payout.status !== "pending") return false;
    if (activeTab === "processing" && payout.status !== "processing") return false;
    if (activeTab === "sent" && payout.status !== "sent") return false; // Use 'sent' as it's the actual DB value
    
    // Apply search filter (by affiliate name or ID)
    if (searchQuery && 
      !payout.affiliate_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !payout.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Apply date filter (simplified for now)
    if (dateFilter && dateFilter !== 'all' && !payout.created_at?.includes(dateFilter)) {
      return false;
    }

    // Apply payment method filter
    if (methodFilter && methodFilter !== 'all' && payout.payout_method !== methodFilter) {
      return false;
    }

    return true;
  });

  // Calculate total amount for filtered payouts
  const totalFilteredAmount = filteredPayouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0
  );

  const router = useRouter();

  // Helper function to render status badges with appropriate colors
  const renderStatusBadge = (status: string) => {
    return <PayoutStatusBadge status={status as any} />;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pendingPayoutsTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payouts.filter(p => p.status === "pending").length} pending payout(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${processingPayoutsTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payouts.filter(p => p.status === "processing").length} processing payout(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${completedPayoutsTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payouts.filter(p => p.status === "sent").length} completed payout(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="Search by affiliate name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="xendit">Xendit</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Payouts ({payouts.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({payouts.filter(p => p.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({payouts.filter(p => p.status === "processing").length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Completed ({payouts.filter(p => p.status === "sent").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No payouts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map((payout) => {
                    const navigateToDetail = () => router.push(`/admin/affiliates/payouts/${payout.id}`);
                    
                    return (
                    <TableRow 
                      key={payout.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={navigateToDetail}
                      title="Click to view payout details"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link 
                          href={`/admin/affiliates/payouts/${payout.id}`}
                          className="hover:underline"
                        >
                          {payout.affiliate_name || "Unknown"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          ID: {payout.id.substring(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(payout.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payout.payout_method === "xendit" && "Xendit"}
                        {payout.payout_method === "bank_transfer" && "Bank Transfer"}
                        {payout.payout_method === "manual" && "Manual"}
                      </TableCell>
                      <TableCell>{renderStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        {payout.created_at ? 
                          format(new Date(payout.created_at), "MMM d, yyyy") :
                          "N/A"}
                      </TableCell>
                      <TableCell>
                        {payout.transaction_date ? 
                          format(new Date(payout.transaction_date), "MMM d, yyyy") :
                          "N/A"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/affiliates/payouts/${payout.id}`}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            {payout.status === "pending" && (
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" /> Process Payout
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredPayouts.length} of {payouts.length} payouts
        </div>
        <div className="text-sm font-medium">
          Total: ${totalFilteredAmount.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
