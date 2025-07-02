'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  CreditCard, 
  Search, 
  X, 
  Download, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw
} from 'lucide-react';
import { UserPurchaseHistoryItem } from '@/types/admin-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';


interface UserPurchaseHistoryProps {
  userId: string;
  purchaseHistory: UserPurchaseHistoryItem[];
}

type SortField = 'purchase_date' | 'amount' | 'status' | 'product_type' | '';
type SortDirection = 'asc' | 'desc' | '';

export function UserPurchaseHistory({ userId, purchaseHistory }: UserPurchaseHistoryProps) {
  // State for search, filtering, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('purchase_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const pageSize = 5;
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };
  
  // Toggle expanded item
  const toggleExpanded = (id: string) => {
    if (expandedItems.includes(id)) {
      setExpandedItems(expandedItems.filter(item => item !== id));
    } else {
      setExpandedItems([...expandedItems, id]);
    }
  };
  
  // Filter and sort purchases
  const filteredPurchases = purchaseHistory
    .filter(purchase => {
      // Apply search filter
      const searchFields = [
        purchase.reference || '',
        purchase.product_type || '',
        purchase.payment_method || '',
        String(purchase.amount),
        purchase.currency
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || searchFields.includes(searchTerm.toLowerCase());
      
      // Apply status filter
      const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
      
      // Apply type filter
      const matchesType = typeFilter === 'all' || purchase.record_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortField === '') return 0;
      
      let valueA: any;
      let valueB: any;
      
      switch (sortField) {
        case 'purchase_date':
          valueA = new Date(a.purchase_date).getTime();
          valueB = new Date(b.purchase_date).getTime();
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'product_type':
          valueA = a.product_type;
          valueB = b.product_type;
          break;
        default:
          return 0;
      }
      
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  
  // Paginate purchases
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredPurchases.length / pageSize);
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    // Define custom variant type that includes 'success'
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
    
    const statusMap: Record<string, { variant: BadgeVariant, icon: React.ReactNode }> = {
      'completed': { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      'pending': { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      'refunded': { variant: 'destructive', icon: <RefreshCw className="h-3 w-3 mr-1" /> },
      'cancelled': { variant: 'outline', icon: <Ban className="h-3 w-3 mr-1" /> },
      'failed': { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> }
    };
    
    const { variant, icon } = statusMap[status.toLowerCase()] || { variant: 'default', icon: null };
    
    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Get record type icon
  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <CreditCard className="h-4 w-4 mr-2" />;
      case 'shopify_order':
        return <ShoppingCart className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Purchase History
        </CardTitle>
        <CardDescription>
          View and manage user's purchase history and transactions.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="shopify_order">Shopify Order</SelectItem>
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export purchase history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Purchase history table */}
        {paginatedPurchases.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('purchase_date')}
                  >
                    <div className="flex items-center">
                      Date
                      {getSortIcon('purchase_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('product_type')}
                  >
                    <div className="flex items-center">
                      Product
                      {getSortIcon('product_type')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPurchases.map((purchase) => {
                  const isExpanded = expandedItems.includes(`${purchase.record_type}-${purchase.record_id}`);
                  
                  return (
                    <React.Fragment key={`${purchase.record_type}-${purchase.record_id}`}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpanded(`${purchase.record_type}-${purchase.record_id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center">
                            {getRecordTypeIcon(purchase.record_type)}
                            <div>
                              <div className="font-medium">{formatDate(purchase.purchase_date)}</div>
                              <div className="text-xs text-muted-foreground">
                                {purchase.reference ? `Ref: ${purchase.reference}` : 'No reference'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{purchase.product_type}</div>
                          <div className="text-xs text-muted-foreground">
                            {purchase.payment_method || 'Unknown method'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(purchase.amount, purchase.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            {isExpanded ? 'Less' : 'More'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Purchase Details</h4>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  <dt className="text-muted-foreground">ID:</dt>
                                  <dd>{purchase.record_id}</dd>
                                  <dt className="text-muted-foreground">Type:</dt>
                                  <dd>{purchase.record_type}</dd>
                                  <dt className="text-muted-foreground">Date:</dt>
                                  <dd>{format(new Date(purchase.purchase_date), 'PPP')}</dd>
                                  <dt className="text-muted-foreground">Status:</dt>
                                  <dd>{purchase.status}</dd>
                                  <dt className="text-muted-foreground">Amount:</dt>
                                  <dd>{formatCurrency(purchase.amount, purchase.currency)}</dd>
                                </dl>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Product Information</h4>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  <dt className="text-muted-foreground">Product:</dt>
                                  <dd>{purchase.product_type}</dd>
                                  <dt className="text-muted-foreground">Payment Method:</dt>
                                  <dd>{purchase.payment_method || 'Unknown'}</dd>
                                  <dt className="text-muted-foreground">Reference:</dt>
                                  <dd>{purchase.reference || 'N/A'}</dd>
                                </dl>
                                {purchase.product_details && (
                                  <div className="mt-2">
                                    <h5 className="text-xs font-semibold mb-1">Product Details</h5>
                                    <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
                                      {JSON.stringify(purchase.product_details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" size="sm">View Details</Button>
                              {['completed', 'pending'].includes(purchase.status.toLowerCase()) && (
                                <Button variant="outline" size="sm">Issue Refund</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No purchase history</h3>
            <p className="text-muted-foreground mt-2">
              This user has no purchase history or no records match your filters!
            </p>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                >
                  <PaginationPrevious />
                </Button>
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                >
                  <PaginationNext />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedPurchases.length} of {filteredPurchases.length} transactions
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </CardFooter>
    </Card>
  );
}
