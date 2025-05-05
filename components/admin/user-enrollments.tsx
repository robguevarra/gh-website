'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  GraduationCap, 
  Search, 
  X, 
  Download, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Play,
  Pause,
  MoreHorizontal
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

// Define enrollment interface
interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  progress: number;
  enrolled_at: string;
  last_accessed_at: string | null;
  expiry_date: string | null;
  completed_at: string | null;
  certificate_id: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
  };
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  published: boolean;
  thumbnail_url: string | null;
}

interface UserEnrollmentsProps {
  userId: string;
  userCourses: Enrollment[];
  availableCourses: Course[];
}

type SortField = 'enrolled_at' | 'title' | 'status' | 'progress' | 'last_accessed_at' | '';
type SortDirection = 'asc' | 'desc' | '';

export function UserEnrollments({ userId, userCourses, availableCourses }: UserEnrollmentsProps) {
  // State for search, filtering, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('enrolled_at');
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
  
  // Filter and sort enrollments
  const filteredEnrollments = userCourses
    .filter(enrollment => {
      // Apply search filter
      const searchFields = [
        enrollment.course?.title || '',
        enrollment.status || '',
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || searchFields.includes(searchTerm.toLowerCase());
      
      // Apply status filter
      const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortField === '') return 0;
      
      let valueA: any;
      let valueB: any;
      
      switch (sortField) {
        case 'enrolled_at':
          valueA = new Date(a.enrolled_at).getTime();
          valueB = new Date(b.enrolled_at).getTime();
          break;
        case 'title':
          valueA = a.course?.title?.toLowerCase() || '';
          valueB = b.course?.title?.toLowerCase() || '';
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'progress':
          valueA = a.progress;
          valueB = b.progress;
          break;
        case 'last_accessed_at':
          valueA = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
          valueB = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  
  // Paginate enrollments
  const paginatedEnrollments = filteredEnrollments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredEnrollments.length / pageSize);
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    // Define custom variant type that matches Badge component
    type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
    
    const statusMap: Record<string, { variant: BadgeVariant, icon: React.ReactNode }> = {
      'active': { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      'completed': { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      'in-progress': { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      'paused': { variant: 'outline', icon: <Pause className="h-3 w-3 mr-1" /> },
      'expired': { variant: 'destructive', icon: <Ban className="h-3 w-3 mr-1" /> }
    };
    
    const { variant, icon } = statusMap[status.toLowerCase()] || { variant: 'default', icon: null };
    
    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Format date with time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };
  
  // Get time remaining until expiry
  const getTimeRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return 'No expiration';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    
    if (expiry < now) {
      return 'Expired';
    }
    
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining === 1) {
      return '1 day remaining';
    }
    
    return `${daysRemaining} days remaining`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <GraduationCap className="mr-2 h-5 w-5" />
          Course Enrollments
        </CardTitle>
        <CardDescription>
          View and manage user's course enrollments and progress.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Enroll
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Available Courses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableCourses
                  .filter(course => !userCourses.some(enrollment => enrollment.course_id === course.id))
                  .map(course => (
                    <DropdownMenuItem key={course.id}>
                      <span>{course.title}</span>
                    </DropdownMenuItem>
                  ))}
                {availableCourses.length === 0 || 
                 availableCourses.every(course => userCourses.some(enrollment => enrollment.course_id === course.id)) ? (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">No available courses</span>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export enrollments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Enrollments table */}
        {paginatedEnrollments.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Course
                      {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('enrolled_at')}
                  >
                    <div className="flex items-center">
                      Enrolled
                      {getSortIcon('enrolled_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center">
                      Progress
                      {getSortIcon('progress')}
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
                {paginatedEnrollments.map((enrollment) => (
                  <Collapsible
                    key={enrollment.id}
                    open={expandedItems.includes(enrollment.id)}
                    onOpenChange={() => toggleExpanded(enrollment.id)}
                    asChild
                  >
                    <>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-md overflow-hidden mr-3 bg-muted flex items-center justify-center">
                              {enrollment.course?.thumbnail_url ? (
                                <img 
                                  src={enrollment.course.thumbnail_url} 
                                  alt={enrollment.course.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{enrollment.course?.title || 'Unknown Course'}</div>
                              <div className="text-xs text-muted-foreground">
                                {enrollment.course?.slug || 'No slug available'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatDate(enrollment.enrolled_at)}</div>
                          <div className="text-xs text-muted-foreground">
                            {enrollment.expiry_date ? 
                              getTimeRemaining(enrollment.expiry_date) : 
                              'No expiration'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full flex items-center gap-2">
                            <Progress value={enrollment.progress} className="h-2" />
                            <span className="text-xs font-medium">{enrollment.progress}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last accessed: {formatDate(enrollment.last_accessed_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(enrollment.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {expandedItems.includes(enrollment.id) ? 'Less' : 'More'}
                              </Button>
                            </CollapsibleTrigger>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>View Course</DropdownMenuItem>
                                {enrollment.status === 'active' && (
                                  <DropdownMenuItem>Pause Enrollment</DropdownMenuItem>
                                )}
                                {enrollment.status === 'paused' && (
                                  <DropdownMenuItem>Resume Enrollment</DropdownMenuItem>
                                )}
                                <DropdownMenuItem>Extend Access</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  Unenroll
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Enrollment Details</h4>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  <dt className="text-muted-foreground">Enrollment ID:</dt>
                                  <dd>{enrollment.id}</dd>
                                  <dt className="text-muted-foreground">Course ID:</dt>
                                  <dd>{enrollment.course_id}</dd>
                                  <dt className="text-muted-foreground">Enrolled On:</dt>
                                  <dd>{formatDateTime(enrollment.enrolled_at)}</dd>
                                  <dt className="text-muted-foreground">Last Accessed:</dt>
                                  <dd>{formatDateTime(enrollment.last_accessed_at)}</dd>
                                  <dt className="text-muted-foreground">Expiry Date:</dt>
                                  <dd>{enrollment.expiry_date ? formatDate(enrollment.expiry_date) : 'No expiration'}</dd>
                                  <dt className="text-muted-foreground">Completion Date:</dt>
                                  <dd>{enrollment.completed_at ? formatDate(enrollment.completed_at) : 'Not completed'}</dd>
                                </dl>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Progress & Certification</h4>
                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  <dt className="text-muted-foreground">Status:</dt>
                                  <dd>{enrollment.status}</dd>
                                  <dt className="text-muted-foreground">Progress:</dt>
                                  <dd>{enrollment.progress}% complete</dd>
                                  <dt className="text-muted-foreground">Certificate:</dt>
                                  <dd>{enrollment.certificate_id ? 
                                    <a href="#" className="text-primary hover:underline">View Certificate</a> : 
                                    'Not issued'}</dd>
                                </dl>
                                <div className="mt-4">
                                  <h5 className="text-xs font-semibold mb-2">Progress Breakdown</h5>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs">Modules Completed</span>
                                      <span className="text-xs font-medium">3/5</span>
                                    </div>
                                    <Progress value={60} className="h-1" />
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs">Quizzes Passed</span>
                                      <span className="text-xs font-medium">2/4</span>
                                    </div>
                                    <Progress value={50} className="h-1" />
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs">Assignments Completed</span>
                                      <span className="text-xs font-medium">1/2</span>
                                    </div>
                                    <Progress value={50} className="h-1" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" size="sm">
                                <Play className="mr-2 h-3 w-3" />
                                View Course
                              </Button>
                              {enrollment.status === 'active' && (
                                <Button variant="outline" size="sm">
                                  <Pause className="mr-2 h-3 w-3" />
                                  Pause Enrollment
                                </Button>
                              )}
                              {enrollment.status === 'paused' && (
                                <Button variant="outline" size="sm">
                                  <Play className="mr-2 h-3 w-3" />
                                  Resume Enrollment
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                Extend Access
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No course enrollments</h3>
            <p className="text-muted-foreground mt-2">
              This user is not enrolled in any courses or no records match your filters.
            </p>
            <Button className="mt-4" variant="outline">
              <GraduationCap className="mr-2 h-4 w-4" />
              Enroll in a Course
            </Button>
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
          Showing {paginatedEnrollments.length} of {filteredEnrollments.length} enrollments
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </CardFooter>
    </Card>
  );
}
