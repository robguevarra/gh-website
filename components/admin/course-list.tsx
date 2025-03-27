'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, PencilIcon, Trash2, PlusCircle, Loader2, Search, MoreHorizontal, ArrowUpDown, FilterX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  featured_image?: string;
  slug: string;
  price?: number;
  created_at: string;
  updated_at: string;
  modules_count: number;
  lessons_count: number;
}

interface CourseListProps {
  initialCourses?: Course[];
}

export function CourseList({ initialCourses = [] }: CourseListProps) {
  const router = useRouter();
  
  // State
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [isLoading, setIsLoading] = useState(initialCourses.length === 0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load courses
  useEffect(() => {
    if (initialCourses.length > 0) {
      setCourses(initialCourses);
      return;
    }
    
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        
        // Construct query parameters
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (statusFilter !== "all") params.append("status", statusFilter);
        params.append("sort", sortBy);
        params.append("order", sortOrder);
        params.append("page", currentPage.toString());
        params.append("pageSize", pageSize.toString());
        
        // Make the API call
        const response = await fetch(`/api/admin/courses?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error("Failed to load courses");
        }
        
        const data = await response.json();
        setCourses(data.courses);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Error loading courses:", error);
        toast.error("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourses();
  }, [initialCourses, searchTerm, statusFilter, sortBy, sortOrder, currentPage, pageSize]);
  
  // Handle delete course
  const deleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/admin/courses/${courseToDelete.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete course");
      }
      
      // Remove the course from the list
      setCourses(prevCourses => prevCourses.filter(course => course.id !== courseToDelete.id));
      
      toast.success("Course deleted successfully");
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    // Reset to page 1 when changing filters
    setCurrentPage(1);
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("updated_at");
    setSortOrder("desc");
    setCurrentPage(1);
  };
  
  // Toggle sort order
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  // Generate pagination items
  const paginationItems = () => {
    const items = [];
    
    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink 
          onClick={() => handlePageChange(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Add ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Add pages before current
    for (let i = Math.max(2, currentPage - 1); i < currentPage; i++) {
      if (i < totalPages) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => handlePageChange(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    // Current page (if not 1 or last)
    if (currentPage !== 1 && currentPage !== totalPages) {
      items.push(
        <PaginationItem key={currentPage}>
          <PaginationLink isActive>
            {currentPage}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Add pages after current
    for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i > 1) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => handlePageChange(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  // Display empty state
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <PencilIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No courses found</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {searchTerm || statusFilter !== "all"
          ? "Try adjusting your filters or search terms"
          : "Create your first course to get started"}
      </p>
      <div className="flex justify-center gap-2">
        {(searchTerm || statusFilter !== "all") && (
          <Button variant="outline" onClick={resetFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        )}
        <Button onClick={() => router.push("/admin/courses/new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses, modules, and lessons
          </p>
        </div>
        
        <Button onClick={() => router.push("/admin/courses/new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Course
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="grid gap-2 w-full md:w-auto">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
              id="search"
            placeholder="Search courses..."
              className="pl-8 w-full md:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid gap-2 w-full md:w-auto">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger id="status-filter" className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2 w-full md:w-auto">
          <Label htmlFor="sort-by">Sort By</Label>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger id="sort-by" className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="updated_at">Updated Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2 w-full md:w-auto">
          <Label htmlFor="sort-order">Order</Label>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
          >
            <SelectTrigger id="sort-order" className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleApplyFilters} className="w-full md:w-auto">
          Apply Filters
        </Button>
        
        {(searchTerm || statusFilter !== "all" || sortBy !== "updated_at" || sortOrder !== "desc") && (
          <Button variant="ghost" onClick={resetFilters} className="w-full md:w-auto">
            <FilterX className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
          </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </CardFooter>
        </Card>
            ))}
          </div>
        </div>
      ) : courses.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("title")} className="cursor-pointer">
                    <div className="flex items-center space-x-1">
                      <span>Title</span>
                      {sortBy === "title" && (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                  </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Modules</TableHead>
                  <TableHead onClick={() => toggleSort("created_at")} className="cursor-pointer hidden md:table-cell">
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortBy === "created_at" && (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                  </div>
                  </TableHead>
                  <TableHead onClick={() => toggleSort("updated_at")} className="cursor-pointer">
                    <div className="flex items-center space-x-1">
                      <span>Updated</span>
                      {sortBy === "updated_at" && (
                        <ArrowUpDown className="h-4 w-4" />
                )}
              </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {course.featured_image && (
                          <img
                            src={course.featured_image}
                            alt={course.title}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                  <div>
                          <div 
                            onClick={() => router.push(`/admin/courses/${course.id}/unified`)}
                            className="cursor-pointer hover:text-primary hover:underline"
                          >
                            {course.title}
                          </div>
                          <div className="text-xs text-muted-foreground hidden md:block">
                            {course.slug}
                          </div>
                        </div>
                  </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {course.modules_count} {course.modules_count === 1 ? "module" : "modules"}
                      {course.lessons_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({course.lessons_count} {course.lessons_count === 1 ? "lesson" : "lessons"})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(course.created_at)}
                    </TableCell>
                    <TableCell>
                      {formatDate(course.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/admin/courses/${course.id}/unified`)}>
                            <PencilIcon className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/courses/${course.slug}`)}>
                            <CalendarIcon className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setCourseToDelete(course);
                              setDeleteDialogOpen(true);
                        }}
                      >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                </div>
          
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {paginationItems()}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
                  </div>
          )}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This will also delete all modules and lessons within it.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {courseToDelete && (
            <Alert variant="destructive">
              <AlertDescription>
                You are about to delete <strong>{courseToDelete.title}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteCourse}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 