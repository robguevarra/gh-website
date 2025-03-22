'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowUp,
  ArrowDown,
  BookOpen,
  Edit,
  FileText,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2
} from 'lucide-react';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Module {
  id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  lessonCount: number;
}

interface ModuleListProps {
  courseId: string;
  courseTitle: string;
  modules: Module[];
}

export default function ModuleList({
  courseId,
  courseTitle,
  modules: initialModules,
}: ModuleListProps) {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [newModuleData, setNewModuleData] = useState({
    title: '',
    description: '',
  });

  // Handle creating a new module
  const handleCreateModule = async () => {
    if (!newModuleData.title) {
      toast.error('Module title is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newModuleData.title,
          description: newModuleData.description || null,
          position: modules.length, // Add to the end by default
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create module');
      }

      const newModule = await response.json();
      
      setModules([...modules, { ...newModule, lessonCount: 0 }]);
      setNewModuleData({ title: '', description: '' });
      setIsAddDialogOpen(false);
      toast.success('Module created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Create module error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating a module
  const handleUpdateModule = async () => {
    if (!moduleToEdit) return;
    if (!moduleToEdit.title) {
      toast.error('Module title is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleToEdit.title,
          description: moduleToEdit.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update module');
      }

      const updatedModule = await response.json();
      
      setModules(modules.map(m => 
        m.id === moduleToEdit.id 
          ? { ...updatedModule, lessonCount: m.lessonCount } 
          : m
      ));
      
      setIsEditDialogOpen(false);
      setModuleToEdit(null);
      toast.success('Module updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Update module error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a module
  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete module');
      }

      setModules(modules.filter(m => m.id !== moduleToDelete.id));
      setIsDeleteDialogOpen(false);
      setModuleToDelete(null);
      toast.success('Module deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Delete module error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reordering modules
  const handleReorder = async (moduleId: string, direction: 'up' | 'down') => {
    const moduleIndex = modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return;
    
    // Can't move up if already at the top
    if (direction === 'up' && moduleIndex === 0) return;
    
    // Can't move down if already at the bottom
    if (direction === 'down' && moduleIndex === modules.length - 1) return;
    
    const newIndex = direction === 'up' ? moduleIndex - 1 : moduleIndex + 1;
    const newModules = [...modules];
    const moduleToMove = newModules[moduleIndex];
    
    // Remove the module from its current position
    newModules.splice(moduleIndex, 1);
    
    // Insert it at the new position
    newModules.splice(newIndex, 0, moduleToMove);
    
    // Update positions
    const updatedModules = newModules.map((module, index) => ({
      ...module,
      position: index,
    }));
    
    setModules(updatedModules);
    
    // Send reorder request to backend
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleOrder: updatedModules.map(m => ({ id: m.id, position: m.position })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder modules');
      }
      
      toast.success('Module order updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Reorder error:', error);
      // Revert to original order on error
      setModules(initialModules);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-4 sm:mb-0">
            <Link href={`/admin/courses/${courseId}`}>
              <ArrowUp className="mr-2 h-4 w-4 rotate-90" />
              Back to Course
            </Link>
          </Button>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
              <DialogDescription>
                Create a new module for this course. You can add lessons to it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Module Title</Label>
                <Input
                  id="title"
                  placeholder="Introduction to the Course"
                  value={newModuleData.title}
                  onChange={(e) => setNewModuleData({ ...newModuleData, title: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a brief overview of this module..."
                  value={newModuleData.description}
                  onChange={(e) => setNewModuleData({ ...newModuleData, description: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleCreateModule} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Module'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium text-center">No modules yet</p>
            <p className="text-muted-foreground text-center mb-4">
              This course doesn't have any modules. Add your first module to get started.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create your first module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <Card key={module.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    <CardDescription>
                      {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <div className="flex space-x-1 mr-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(module.id, 'up')}
                        disabled={index === 0 || isLoading}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(module.id, 'down')}
                        disabled={index === modules.length - 1 || isLoading}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setModuleToEdit(module);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit Module
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/courses/${courseId}/modules/${module.id}/lessons`}>
                            <BookOpen className="mr-2 h-4 w-4" /> Manage Lessons
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setModuleToDelete(module);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Module
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {module.description || 'No description provided.'}
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/courses/${courseId}/modules/${module.id}/lessons`}>
                    <BookOpen className="mr-2 h-4 w-4" /> Manage Lessons
                  </Link>
                </Button>
              </CardFooter>
              <div className="absolute left-0 top-0 h-full w-1.5 cursor-grab bg-muted" />
            </Card>
          ))}
        </div>
      )}

      {/* Edit Module Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the details of this module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Module Title</Label>
              <Input
                id="edit-title"
                value={moduleToEdit?.title || ''}
                onChange={(e) => setModuleToEdit(moduleToEdit ? { ...moduleToEdit, title: e.target.value } : null)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={moduleToEdit?.description || ''}
                onChange={(e) => setModuleToEdit(moduleToEdit ? { ...moduleToEdit, description: e.target.value } : null)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateModule} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module &quot;{moduleToDelete?.title}&quot;
              and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModule}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 