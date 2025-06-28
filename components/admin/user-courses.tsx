'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Clock, 
  Flag, 
  MoreHorizontal, 
  PlusCircle, 
  Trash2 
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  published: boolean;
  thumbnail_url?: string | null;
}

interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string | null;
  progress?: number;
  last_activity_at?: string | null;
  course: Course;
}

interface UserCoursesProps {
  userId: string;
  userCourses: UserCourse[];
  availableCourses: Course[];
}

export function UserCourses({ 
  userId, 
  userCourses, 
  availableCourses 
}: UserCoursesProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseToRemove, setCourseToRemove] = useState<UserCourse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter out courses the user is already enrolled in
  const unenrolledCourses = (availableCourses || []).filter(
    course => !userCourses.some(uc => uc.course_id === course.id)
  );

  // Format date to be user-friendly
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle enrollment in a new course using the existing enrollment API
  const handleEnroll = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    setIsLoading(true);
    try {
      // Use the existing course enrollment API endpoint
      const response = await fetch(`/api/admin/courses/${selectedCourseId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll user in course');
      }

      toast.success('User enrolled in course successfully');
      setIsAddDialogOpen(false);
      setSelectedCourseId('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Enrollment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removal from a course using the existing enrollment API
  const handleRemove = async () => {
    if (!courseToRemove) return;

    setIsLoading(true);
    try {
      // Use the existing enrollment deletion API endpoint
      const response = await fetch(`/api/admin/courses/${courseToRemove.course_id}/enrollments/${courseToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user from course');
      }

      toast.success('User removed from course successfully');
      setIsRemoveDialogOpen(false);
      setCourseToRemove(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Course removal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting course progress - This functionality may need a new API endpoint
  const handleResetProgress = async (userCourseId: string) => {
    setIsLoading(true);
    try {
      // For now, show a message that this feature needs implementation
      toast.info('Reset progress feature is not yet implemented. Please contact development team.');
      
      /* TODO: Implement reset progress API endpoint
      const response = await fetch(`/api/admin/enrollments/${userCourseId}/reset-progress`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset course progress');
      }

      toast.success('Course progress reset successfully');
      router.refresh();
      */
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Reset progress error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle marking a course as complete - This functionality may need a new API endpoint  
  const handleMarkComplete = async (userCourseId: string) => {
    setIsLoading(true);
    try {
      // For now, show a message that this feature needs implementation
      toast.info('Mark complete feature is not yet implemented. Please contact development team.');
      
      /* TODO: Implement mark complete API endpoint
      const response = await fetch(`/api/admin/enrollments/${userCourseId}/mark-complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark course as complete');
      }

      toast.success('Course marked as complete');
      router.refresh();
      */
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Mark complete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Course Enrollments</CardTitle>
            <CardDescription>
              Manage this user's course enrollments and progress
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll User in a Course</DialogTitle>
                <DialogDescription>
                  Select a course to enroll this user in.
                </DialogDescription>
              </DialogHeader>
              
              {unenrolledCourses.length > 0 ? (
                <Select onValueChange={(value) => setSelectedCourseId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {unenrolledCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  User is already enrolled in all available courses.
                </p>
              )}
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEnroll} 
                  disabled={unenrolledCourses.length === 0 || !selectedCourseId || isLoading}
                >
                  {isLoading ? 'Enrolling...' : 'Enroll'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {userCourses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enrolled On</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userCourses.map((userCourse) => (
                  <TableRow key={userCourse.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        {userCourse.course.title}
                        <span className="text-xs text-muted-foreground mt-1">
                          {userCourse.completed_at ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed on {formatDate(userCourse.completed_at)}
                            </span>
                          ) : (
                            <span className="flex items-center text-amber-600">
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <Progress value={userCourse.progress ?? 0} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(userCourse.progress ?? 0)}% complete
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(userCourse.enrolled_at)}
                    </TableCell>
                    <TableCell>
                      {formatDate(userCourse.last_activity_at ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleMarkComplete(userCourse.id)}
                            disabled={!!userCourse.completed_at}
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Mark as Completess
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleResetProgress(userCourse.id)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Reset Progress
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setCourseToRemove(userCourse);
                              setIsRemoveDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No courses enrolled</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This user hasn't been enrolled in any courses yet.
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                disabled={unenrolledCourses.length === 0}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Enroll in a Course
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Removing Course */}
      <AlertDialog 
        open={isRemoveDialogOpen} 
        onOpenChange={setIsRemoveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Course Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from 
              &quot;{courseToRemove?.course.title}&quot;? This will delete all 
              progress data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 