'use client';

import { useState, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  UserPlus,
  Users,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types for manual enrollment
interface TransactionRecord {
  id: string;
  contact_email: string;
  amount: number;
  currency: string;
  status: string;
  transaction_type: string;
  metadata: any;
  created_at: string;
  enrollment_status: string;
  needs_enrollment: boolean;
}

interface SystemeioRecord {
  Email: string;
  'First Name': string;
  'Last Name': string;
  'Date Registered': string;
  Tag: string;
  user_exists: boolean;
  is_student: boolean;
  enrollment_status: string;
  needs_enrollment: boolean;
}

interface ValidationResult {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
  user_exists: boolean;
  already_enrolled: boolean;
  extracted_data: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function ManualEnrollmentTab() {
  // Search states
  const [transactionSearch, setTransactionSearch] = useState('');
  const [systemeioSearch, setSystemeioSearch] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [systemeioPage, setSystemeioPage] = useState(1);
  
  // Data states
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [systemeioRecords, setSystemeioRecords] = useState<SystemeioRecord[]>([]);
  const [transactionPagination, setTransactionPagination] = useState<PaginationInfo | null>(null);
  const [systemeioPagination, setSystemeioPagination] = useState<PaginationInfo | null>(null);
  
  // Loading states
  const [isSearchingTransactions, setIsSearchingTransactions] = useState(false);
  const [isSearchingSystemeio, setIsSearchingSystemeio] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Form states
  const [manualForm, setManualForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  
  // Dialog states
  const [enrollmentDialog, setEnrollmentDialog] = useState({
    isOpen: false,
    source: '',
    data: null as any,
    validation: null as ValidationResult | null
  });

  // Search transactions
  const searchTransactions = useCallback(async (page = 1, search = '') => {
    setIsSearchingTransactions(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: 'paid',
        ...(search && { search })
      });
      
      const response = await fetch(`/api/admin/manual-enrollment/search-transactions?${params}`);
      if (!response.ok) throw new Error('Failed to search transactions');
      
      const data = await response.json();
      setTransactions(data.data);
      setTransactionPagination(data.pagination);
      setTransactionPage(page);
    } catch (error) {
      console.error('Error searching transactions:', error);
      toast.error('Failed to search transactions');
    } finally {
      setIsSearchingTransactions(false);
    }
  }, []);

  // Search systemeio records
  const searchSystemeio = useCallback(async (page = 1, search = '') => {
    setIsSearchingSystemeio(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search })
      });
      
      const response = await fetch(`/api/admin/manual-enrollment/search-systemeio?${params}`);
      if (!response.ok) throw new Error('Failed to search systemeio records');
      
      const data = await response.json();
      setSystemeioRecords(data.data);
      setSystemeioPagination(data.pagination);
      setSystemeioPage(page);
    } catch (error) {
      console.error('Error searching systemeio:', error);
      toast.error('Failed to search systemeio records');
    } finally {
      setIsSearchingSystemeio(false);
    }
  }, []);

  // Validate enrollment
  const validateEnrollment = async (source: string, data: any) => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/admin/manual-enrollment/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          ...(source === 'transaction' && { transaction_id: data.id }),
          ...(source === 'systemeio' && { systemeio_record: data }),
          ...(source === 'manual' && { manual_data: data })
        })
      });
      
      if (!response.ok) throw new Error('Validation failed');
      
      const validation = await response.json();
      setEnrollmentDialog({
        isOpen: true,
        source,
        data,
        validation
      });
    } catch (error) {
      console.error('Error validating enrollment:', error);
      toast.error('Failed to validate enrollment data');
    } finally {
      setIsValidating(false);
    }
  };

  // Create enrollment
  const createEnrollment = async () => {
    if (!enrollmentDialog.data || !enrollmentDialog.validation?.valid) return;
    
    setIsEnrolling(true);
    try {
      const response = await fetch('/api/admin/manual-enrollment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: enrollmentDialog.source,
          ...(enrollmentDialog.source === 'transaction' && { transaction_id: enrollmentDialog.data.id }),
          ...(enrollmentDialog.source === 'systemeio' && { systemeio_record: enrollmentDialog.data }),
          ...(enrollmentDialog.source === 'manual' && { manual_data: enrollmentDialog.data })
        })
      });
      
      if (!response.ok) throw new Error('Enrollment creation failed');
      
      const result = await response.json();
      toast.success(`Successfully enrolled ${result.data.email} in P2P course`);
      
      // Close dialog and refresh data
      setEnrollmentDialog({ isOpen: false, source: '', data: null, validation: null });
      
      // Refresh the appropriate list
      if (enrollmentDialog.source === 'transaction') {
        searchTransactions(transactionPage, transactionSearch);
      } else if (enrollmentDialog.source === 'systemeio') {
        searchSystemeio(systemeioPage, systemeioSearch);
      }
      
    } catch (error) {
      console.error('Error creating enrollment:', error);
      toast.error('Failed to create enrollment');
    } finally {
      setIsEnrolling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Manual P2P Course Enrollment</h3>
        <p className="text-sm text-muted-foreground">
          Enroll users into the P2P course from three sources: existing transactions, systemeio records, or manual entry.
        </p>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="systemeio" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Systemeio
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>P2P Transaction Records</CardTitle>
              <CardDescription>
                Search for paid P2P transactions that need enrollment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email, name..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchTransactions(1, transactionSearch)}
                />
                <Button 
                  onClick={() => searchTransactions(1, transactionSearch)}
                  disabled={isSearchingTransactions}
                >
                  {isSearchingTransactions ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>

              {transactions.length > 0 && (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{transaction.contact_email}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.metadata?.first_name} {transaction.metadata?.last_name} • 
                          {transaction.currency} {transaction.amount} • 
                          {formatDate(transaction.created_at)}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={transaction.status === 'SUCCEEDED' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                          <Badge variant={transaction.needs_enrollment ? 'destructive' : 'outline'}>
                            {transaction.enrollment_status}
                          </Badge>
                        </div>
                      </div>
                      {transaction.needs_enrollment && (
                        <Button 
                          size="sm" 
                          onClick={() => validateEnrollment('transaction', transaction)}
                          disabled={isValidating}
                        >
                          {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Enroll
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {transactionPagination && transactionPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {transactionPagination.page} of {transactionPagination.totalPages} ({transactionPagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchTransactions(transactionPage - 1, transactionSearch)}
                          disabled={!transactionPagination.hasPreviousPage || isSearchingTransactions}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchTransactions(transactionPage + 1, transactionSearch)}
                          disabled={!transactionPagination.hasNextPage || isSearchingTransactions}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Systemeio Tab */}
        <TabsContent value="systemeio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Systemeio Records</CardTitle>
              <CardDescription>
                Search for systemeio records with P2P-related tags (imported, PaidP2P)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by email, name..."
                  value={systemeioSearch}
                  onChange={(e) => setSystemeioSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchSystemeio(1, systemeioSearch)}
                />
                <Button 
                  onClick={() => searchSystemeio(1, systemeioSearch)}
                  disabled={isSearchingSystemeio}
                >
                  {isSearchingSystemeio ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
              </div>

              {systemeioRecords.length > 0 && (
                <div className="space-y-3">
                  {systemeioRecords.map((record, index) => (
                    <div key={`${record.Email}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{record.Email}</div>
                        <div className="text-sm text-muted-foreground">
                          {record['First Name']} {record['Last Name']} • 
                          {formatDate(record['Date Registered'])}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{record.Tag}</Badge>
                          <Badge variant={record.user_exists ? 'default' : 'secondary'}>
                            {record.user_exists ? 'User Exists' : 'New User'}
                          </Badge>
                          <Badge variant={record.needs_enrollment ? 'destructive' : 'outline'}>
                            {record.enrollment_status}
                          </Badge>
                        </div>
                      </div>
                      {record.needs_enrollment && (
                        <Button 
                          size="sm" 
                          onClick={() => validateEnrollment('systemeio', record)}
                          disabled={isValidating}
                        >
                          {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Enroll
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {systemeioPagination && systemeioPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {systemeioPagination.page} of {systemeioPagination.totalPages} ({systemeioPagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchSystemeio(systemeioPage - 1, systemeioSearch)}
                          disabled={!systemeioPagination.hasPreviousPage || isSearchingSystemeio}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchSystemeio(systemeioPage + 1, systemeioSearch)}
                          disabled={!systemeioPagination.hasNextPage || isSearchingSystemeio}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Enrollment</CardTitle>
              <CardDescription>
                Manually enroll a new user into the P2P course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={manualForm.email}
                    onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={manualForm.firstName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={manualForm.lastName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => validateEnrollment('manual', manualForm)}
                disabled={!manualForm.email || !manualForm.firstName || isValidating}
                className="w-full"
              >
                {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Validate & Enroll User
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enrollment Validation Dialog */}
      <Dialog open={enrollmentDialog.isOpen} onOpenChange={(open) => 
        setEnrollmentDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enrollment Validation</DialogTitle>
            <DialogDescription>
              Review the validation results before proceeding
            </DialogDescription>
          </DialogHeader>
          
          {enrollmentDialog.validation && (
            <div className="space-y-4">
              {enrollmentDialog.validation.extracted_data && (
                <div className="space-y-2">
                  <h4 className="font-medium">User Information:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Email:</strong> {enrollmentDialog.validation.extracted_data.email}</p>
                    <p><strong>Name:</strong> {enrollmentDialog.validation.extracted_data.firstName} {enrollmentDialog.validation.extracted_data.lastName}</p>
                    <p><strong>User exists:</strong> {enrollmentDialog.validation.user_exists ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}

              {enrollmentDialog.validation.conflicts.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Conflicts:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {enrollmentDialog.validation.conflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {enrollmentDialog.validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {enrollmentDialog.validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEnrollmentDialog(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createEnrollment}
                  disabled={!enrollmentDialog.validation.valid || isEnrolling}
                  className="flex-1"
                >
                  {isEnrolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Enroll
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 