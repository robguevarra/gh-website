'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Edit, 
  Eye, 
  FileText, 
  MoreHorizontal, 
  Plus, 
  Star, 
  Trash2,
  Pencil,
  Layers
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Define types
interface MembershipTier {
  id: string;
  name: string;
  description?: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  is_featured: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  required_tier_id: string | null;
  tierName: string;
  moduleCount: number;
  lessonCount: number;
}

interface CourseListProps {
  courses: Course[];
  membershipTiers: MembershipTier[];
}

export default function CourseList({ courses, membershipTiers }: CourseListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle search and filtering
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (course.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesTier = tierFilter === 'all' || 
                      (tierFilter === 'none' && !course.required_tier_id) ||
                      course.required_tier_id === tierFilter;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

  // Handle course deletion
  const handleDelete = async () => {
    if (!courseToDelete) return;
    
    setIsLoading(true);
    try {
      console.log('Sending delete request for course:', {
        id: courseToDelete.id,
        title: courseToDelete.title,
        endpoint: '/api/admin/courses/delete'
      });
      
      // Use the new DELETE endpoint
      const response = await fetch(`/api/admin/courses/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: courseToDelete.id }),
      });

      console.log(`Delete response:`, { 
        courseId: courseToDelete.id, 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete response error details:', errorData);
        throw new Error(errorData.error || 'Failed to delete course');
      }

      toast.success('Course deleted successfully');
      setIsDeleteDialogOpen(false);
      setCourseToDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Delete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Published</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-[300px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="none">No Tier Required</SelectItem>
              {membershipTiers.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Link>
        </Button>
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium text-center mb-2">No courses found</p>
            <p className="text-muted-foreground text-center mb-4">
              {courses.length === 0
                ? "You haven't created any courses yet."
                : "No courses match your current filters."}
            </p>
            {courses.length === 0 && (
              <Button asChild>
                <Link href="/admin/courses/new">
                  <Plus className="mr-2 h-4 w-4" /> Create your first course
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <div className="relative h-40 w-full">
                {course.thumbnail_url ? (
                  <Image
                    src={course.thumbnail_url}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {course.is_featured && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                      <Star className="mr-1 h-3 w-3" /> Featured
                    </Badge>
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {course.tierName !== 'None' && `${course.tierName} • `}
                      Updated {formatDate(course.updated_at)}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/courses/${course.id}/unified`}>
                          <Pencil className="mr-2 h-4 w-4" /> Course Editor
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link 
                          href={`/courses/${course.slug}`} 
                          target="_blank"
                          title={`View public course page`}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View Course
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          console.log('Deleting course:', { 
                            id: course.id, 
                            title: course.title,
                            slug: course.slug
                          });
                          setCourseToDelete(course);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {course.description || 'No description provided.'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-3 pb-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <FileText className="mr-1 h-3 w-3" />
                    {course.moduleCount} {course.moduleCount === 1 ? 'Module' : 'Modules'}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <BookOpen className="mr-1 h-3 w-3" />
                    {course.lessonCount} {course.lessonCount === 1 ? 'Lesson' : 'Lessons'}
                  </div>
                </div>
                {getStatusBadge(course.status)}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course &quot;{courseToDelete?.title}&quot;
              and all its modules and lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete Course'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 