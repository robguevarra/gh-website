"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Eye, FileText, MoreHorizontal, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

import { PayoutStatusBadge } from "../payout-status-badge";
import { AdminPayoutBatch, PayoutBatchStats } from "@/types/admin/affiliate";
import { toast } from "sonner";
import { 
  deletePayoutBatch,
  processPayoutBatch 
} from "@/lib/actions/admin/payout-actions";

interface BatchesListProps {
  batches: AdminPayoutBatch[];
  stats?: PayoutBatchStats;
}

export function BatchesList({ batches, stats }: BatchesListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  
  // Filtering logic
  const filteredBatches = batches.filter((batch) => {
    // Search query filter
    if (searchQuery && 
      !batch.batch_name?.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !batch.id?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== "all" && batch.created_at) {
      const batchDate = new Date(batch.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === "today") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (batchDate < today || batchDate >= tomorrow) return false;
      } else if (dateFilter === "this-week") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        if (batchDate < startOfWeek || batchDate >= endOfWeek) return false;
      } else if (dateFilter === "this-month") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        if (batchDate < startOfMonth || batchDate > endOfMonth) return false;
      }
    }
    
    // Status filter (tab)
    if (activeTab !== "all") {
      return batch.status === activeTab;
    }
    
    return true;
  });
  
  // Process batch handler
  async function handleProcessBatch(batchId: string) {
    try {
      setProcessingBatchId(batchId);
      const result = await processPayoutBatch(batchId);
      
      if (result.success) {
        toast.success("Batch processing started successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to process batch");
      }
    } catch (error) {
      console.error("Error processing batch:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setProcessingBatchId(null);
    }
  }
  
  // Delete batch handler
  async function handleDeleteBatch() {
    if (!batchToDelete) return;
    
    try {
      const result = await deletePayoutBatch(batchToDelete);
      
      if (result.success) {
        toast.success("Batch deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete batch");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setBatchToDelete(null);
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Batch Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBatches || batches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingBatches || batches.filter(b => b.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processingBatches || batches.filter(b => b.status === "processing").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedBatches || batches.filter(b => b.status === "completed").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="Search by batch name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by date">
                <div className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter === "all" && "All dates"}
                  {dateFilter === "today" && "Today"}
                  {dateFilter === "this-week" && "This Week"}
                  {dateFilter === "this-month" && "This Month"}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Batches ({batches.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({batches.filter(b => b.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({batches.filter(b => b.status === "processing").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({batches.filter(b => b.status === "completed").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Payouts</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No batches found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => {
                    const navigateToDetail = () => router.push(`/admin/affiliates/payouts/batches/${batch.id}`);
                    
                    return (
                    <TableRow 
                      key={batch.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={navigateToDetail}
                      title="Click to view batch details"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="font-medium">
                          {batch.batch_name || `Batch #${batch.id.substring(0, 8)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {batch.id.substring(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        {batch.payout_count || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(batch.total_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {batch.status === "pending" && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {batch.status === "processing" && (
                          <Badge variant="secondary">Processing</Badge>
                        )}
                        {batch.status === "completed" && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200" variant="outline">
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.created_at ? 
                          format(new Date(batch.created_at), "MMM d, yyyy") :
                          "N/A"}
                      </TableCell>
                      <TableCell>
                        {batch.processed_at ? 
                          format(new Date(batch.processed_at), "MMM d, yyyy") :
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
                            <DropdownMenuItem onClick={navigateToDetail}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {batch.status === "pending" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleProcessBatch(batch.id);
                                }}
                                disabled={processingBatchId === batch.id}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                {processingBatchId === batch.id ? "Processing..." : "Process Batch"}
                              </DropdownMenuItem>
                            )}
                            {batch.status === "pending" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setBatchToDelete(batch.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Batch
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBatch}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
