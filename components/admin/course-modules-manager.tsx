'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  MoreHorizontal,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  module_id: string;
  position: number;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  lessonCount: number;
  lessons: Lesson[];
}

interface CourseModulesManagerProps {
  courseId: string;
  courseTitle?: string;
  initialModules: Module[];
  setModules?: React.Dispatch<React.SetStateAction<Module[]>>;
}

export default function CourseModulesManager({
  courseId,
  courseTitle = '',
  initialModules,
  setModules,
}: CourseModulesManagerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [newModuleData, setNewModuleData] = useState({
    title: '',
    description: '',
  });
  
  // Lesson state
  const [isAddLessonDialogOpen, setIsAddLessonDialogOpen] = useState(false);
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);
  const [isDeleteLessonDialogOpen, setIsDeleteLessonDialogOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [newLessonData, setNewLessonData] = useState({
    title: '',
    description: '',
  });
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);

  // Internal state for modules if setModules is not provided
  const [modulesState, setModulesState] = useState<Module[]>(initialModules);
  
  // Use external or internal state management depending on what was provided
  const modules = setModules ? initialModules : modulesState;
  const updateModules = (newModules: Module[] | ((prev: Module[]) => Module[])) => {
    if (setModules) {
      setModules(newModules);
    } else {
      setModulesState(newModules);
    }
  };

  // Toggle module expanded state
  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

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
      
      updateModules([...modules, { ...newModule, lessonCount: 0, lessons: [] }]);
      setNewModuleData({ title: '', description: '' });
      setIsAddDialogOpen(false);
      toast.success('Module created successfully');
      
      // Auto-expand the new module
      setExpandedModules(prev => ({
        ...prev,
        [newModule.id]: true
      }));
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
      
      updateModules(modules.map(m => 
        m.id === moduleToEdit.id 
          ? { 
              ...updatedModule, 
              lessonCount: m.lessonCount,
              lessons: m.lessons 
            } 
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

      updateModules(modules.filter(m => m.id !== moduleToDelete.id));
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
  const handleReorderModule = async (moduleId: string, direction: 'up' | 'down') => {
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
    
    updateModules(updatedModules);
    
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
      updateModules(modules);
    }
  };

  // New function for creating a lesson
  const handleCreateLesson = async () => {
    if (!targetModuleId || !newLessonData.title.trim()) return;
    
    setIsLoading(true);
    setIsCreatingLesson(true);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${targetModuleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLessonData.title,
          description: newLessonData.description || null,
          status: 'draft'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API response error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error',
          url: `/api/admin/courses/${courseId}/modules/${targetModuleId}/lessons`
        });
        throw new Error(errorData.error || 'Failed to create lesson');
      }
      
      const lesson = await response.json();
      
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Lesson created successfully</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to the lesson editor...
          </p>
        </div>
      );
      
      // Reset form state
      setIsAddLessonDialogOpen(false);
      setNewLessonData({ title: '', description: '' });
      
      // Navigate to the lesson editor
      router.push(`/admin/courses/${courseId}/modules/${targetModuleId}/lessons/${lesson.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      console.error('Create lesson error:', error);
      setIsCreatingLesson(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold">Course Structure</h2>
          <Badge variant="outline" className="ml-2">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'}
          </Badge>
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
              <div className="absolute left-0 top-0 h-full w-1.5 cursor-grab bg-muted" />
              
              <Collapsible
                open={expandedModules[module.id]}
                onOpenChange={() => toggleModuleExpanded(module.id)}
                className="w-full"
              >
                <CardHeader className="pb-2 pl-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 mr-2">
                          {expandedModules[module.id] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      <div>
                        <CardTitle className="text-xl">{module.title}</CardTitle>
                        <CardDescription>
                          {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-2 sm:mt-0">
                      <div className="flex space-x-1 mr-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReorderModule(module.id, 'up')}
                          disabled={index === 0 || isLoading}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReorderModule(module.id, 'down')}
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
                
                <CollapsibleContent>
                  <CardContent className="pt-0 pl-11">
                    <p className="text-sm text-muted-foreground mb-4">
                      {module.description || 'No description provided.'}
                    </p>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Lessons</h3>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setTargetModuleId(module.id);
                          setIsAddLessonDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-3 w-3" /> Add Lesson
                      </Button>
                    </div>
                    
                    {module.lessons.length === 0 ? (
                      <div className="text-center py-4 border rounded-md">
                        <p className="text-muted-foreground">No lessons in this module yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons
                          .sort((a, b) => a.position - b.position)
                          .map((lesson, lessonIndex) => (
                            <div 
                              key={lesson.id} 
                              className="flex items-center justify-between p-3 border rounded-md bg-muted/40"
                            >
                              <div className="flex items-center">
                                <span className="text-muted-foreground mr-2">{lessonIndex + 1}.</span>
                                <span>{lesson.title}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setLessonToEdit(lesson);
                                    setIsEditLessonDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => {
                                    setLessonToDelete(lesson);
                                    setIsDeleteLessonDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
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
      
      {/* Add Lesson Dialog */}
      <Dialog open={isAddLessonDialogOpen} onOpenChange={setIsAddLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>
              Create a new lesson for this module. You'll be redirected to the lesson editor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateLesson();
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Lesson Title</Label>
              <Input
                id="lesson-title"
                placeholder="Introduction to the Topic"
                value={newLessonData.title}
                onChange={(e) => setNewLessonData({ ...newLessonData, title: e.target.value })}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-description">Description (Optional)</Label>
              <Textarea
                id="lesson-description"
                placeholder="Provide a brief overview of this lesson..."
                value={newLessonData.description}
                onChange={(e) => setNewLessonData({ ...newLessonData, description: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddLessonDialogOpen(false)} disabled={isLoading || isCreatingLesson}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isCreatingLesson || !newLessonData.title.trim()}>
                {isCreatingLesson ? 
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </> : 
                  'Create & Edit Lesson'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit and Delete Lesson Dialogs will be implemented later */}
    </div>
  );
} 