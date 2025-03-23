'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreVertical, PlusCircle, Search, Trash2, UserPlus, CheckCircle2, XCircle, Clock, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  expires_at: string | null;
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
  profiles: User;
}

interface CourseInfo {
  id: string;
  title: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
}

interface CourseEnrollmentManagementProps {
  courseId: string;
}

export function CourseEnrollmentManagement({ courseId }: CourseEnrollmentManagementProps) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState<string>('');
  const [updateReason, setUpdateReason] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Fetch enrollments data
  const fetchEnrollments = async (page = 0, status = '', search = '') => {
    setLoading(true);
    try {
      let url = `/api/admin/courses/${courseId}/enrollments?page=${page}&limit=${pagination.limit}`;
      
      if (status) {
        url += `&status=${status}`;
      }
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollments');
      }
      
      const data = await response.json();
      setEnrollments(data.enrollments || []);
      setCourse(data.course || null);
      setPagination(data.pagination || { total: 0, page, limit: 10 });
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchEnrollments(0, statusFilter, searchQuery);
  }, [courseId, statusFilter, searchQuery]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Suspended</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchEnrollments(newPage, statusFilter, searchQuery);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    fetchEnrollments(0, value, searchQuery); // Reset to first page when filter changes
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Use debounce to avoid excessive API calls
    const debounceTimer = setTimeout(() => {
      fetchEnrollments(0, statusFilter, query);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  };

  // Search users for enrollment
  const searchUsers = async (email: string) => {
    if (!email.trim()) {
      setUserSearchResults([]);
      return;
    }
    
    setUserSearchLoading(true);
    try {
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      setUserSearchResults(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Handle user search input change
  const handleUserSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setUserEmail(email);
    
    // Debounce search to avoid excessive API calls
    const debounceSearch = setTimeout(() => {
      searchUsers(email);
    }, 500);
    
    return () => clearTimeout(debounceSearch);
  };

  // Handle user selection for enrollment
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserEmail(user.email);
    setUserSearchResults([]);
  };

  // Add enrollment
  const handleAddEnrollment = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          expires_at: expiryDate ? expiryDate.toISOString() : null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll user');
      }
      
      toast.success('User enrolled successfully');
      setIsAddDialogOpen(false);
      setSelectedUser(null);
      setUserEmail('');
      setExpiryDate(null);
      fetchEnrollments(pagination.page, statusFilter, searchQuery);
    } catch (error) {
      console.error('Error adding enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to enroll user');
    }
  };

  // Update enrollment status
  const handleUpdateStatus = async () => {
    if (!selectedEnrollment || !updatedStatus) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments/${selectedEnrollment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updatedStatus,
          reason: updateReason,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update enrollment');
      }
      
      toast.success('Enrollment updated successfully');
      setIsUpdateDialogOpen(false);
      setSelectedEnrollment(null);
      setUpdatedStatus('');
      setUpdateReason('');
      fetchEnrollments(pagination.page, statusFilter, searchQuery);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update enrollment');
    }
  };

  // Delete enrollment
  const handleDeleteEnrollment = async () => {
    if (!selectedEnrollment) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/enrollments/${selectedEnrollment.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete enrollment');
      }
      
      toast.success('Enrollment deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedEnrollment(null);
      fetchEnrollments(pagination.page, statusFilter, searchQuery);
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete enrollment');
    }
  };

  // Compute total pages for pagination
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Course Enrollments</CardTitle>
          <CardDescription>
            Manage student enrollments for {course?.title || 'this course'}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll New Student</DialogTitle>
                <DialogDescription>
                  Search for a user by email to enroll them in this course.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="userEmail" className="text-sm font-medium">
                    Student Email
                  </label>
                  <div className="relative">
                    <Input
                      id="userEmail"
                      placeholder="Enter email address..."
                      value={userEmail}
                      onChange={handleUserSearchChange}
                    />
                    {userSearchLoading && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {userSearchResults.length > 0 && (
                    <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-input bg-background p-1 text-sm shadow-sm">
                      {userSearchResults.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
                        >
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {selectedUser && (
                    <div className="mt-2 rounded-md border border-border p-2">
                      <div className="text-sm font-medium">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="expiryDate" className="text-sm font-medium">
                    Enrollment Expiry Date (Optional)
                  </label>
                  <DatePicker
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    placeholder="No expiry date"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEnrollment} disabled={!selectedUser}>
                  Enroll Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2 items-center">
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {pagination.total} {pagination.total === 1 ? 'student' : 'students'} enrolled
            </div>
          </div>
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : enrollments.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled On</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      <div>
                        {enrollment.profiles.first_name} {enrollment.profiles.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {enrollment.profiles.email}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                    <TableCell>{formatDate(enrollment.enrolled_at)}</TableCell>
                    <TableCell>
                      {enrollment.expires_at ? (
                        <div className="flex items-center">
                          <CalendarIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                          {formatDate(enrollment.expires_at)}
                        </div>
                      ) : (
                        'No expiry'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setUpdatedStatus('active');
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setUpdatedStatus('suspended');
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Suspend
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setUpdatedStatus('cancelled');
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-block rounded-full bg-muted p-3">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No students enrolled</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No students are currently enrolled in this course.
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-4"
              size="sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
          </div>
        )}
        
        {enrollments.length > 0 && totalPages > 1 && (
          <Pagination className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {pagination.page + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages - 1}
            >
              Next
            </Button>
          </Pagination>
        )}
      </CardContent>
      
      {/* Status Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {updatedStatus === 'active' && 'Activate Enrollment'}
              {updatedStatus === 'suspended' && 'Suspend Enrollment'}
              {updatedStatus === 'cancelled' && 'Cancel Enrollment'}
            </DialogTitle>
            <DialogDescription>
              {updatedStatus === 'active' && 'Activate this student\'s enrollment in the course.'}
              {updatedStatus === 'suspended' && 'Temporarily suspend this student\'s access to the course.'}
              {updatedStatus === 'cancelled' && 'Cancel this student\'s enrollment in the course.'}
            </DialogDescription>
          </DialogHeader>
          
          {(updatedStatus === 'suspended' || updatedStatus === 'cancelled') && (
            <div className="space-y-2 py-4">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason (Optional)
              </label>
              <Input
                id="reason"
                placeholder="Enter reason..."
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>
              {updatedStatus === 'active' && 'Activate'}
              {updatedStatus === 'suspended' && 'Suspend'}
              {updatedStatus === 'cancelled' && 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enrollment? This will permanently remove the student's 
              enrollment and all associated progress data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEnrollment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 