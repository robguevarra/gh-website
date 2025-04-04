"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronDown,
  ChevronRight,
  File,
  FolderClosed,
  Video,
  FileText,
  PlusCircle,
  GripVertical,
  Loader2,
  Pencil,
  Trash2,
  MoreHorizontal,
  Save,
  X,
  Plus,
} from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "sonner"
import type { ModuleItem } from "./course-editor"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import ContentNameDialog from "./content-name-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCourseStore } from "@/lib/stores/course"
import type { ExtendedModule, ExtendedLesson } from "@/lib/stores/course/types"
import { useParams } from "next/navigation"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EditorSidebar() {
  const params = useParams()
  const courseId = params.courseId as string
  const [isCreatingLesson, setIsCreatingLesson] = useState(false)

  // Use Zustand store
  const {
    course,
    modules,
    selectedModuleId,
    selectModule,
    selectedLessonId,
    selectLesson,
    expandedModules,
    toggleExpandedModule,
    addContent,
    setSavedState,
    isLoading,
    error,
    fetchCourse,
    updateLesson,
    reorderLesson,
    reorderModule
  } = useCourseStore()

  // Ensure expandedModules is a Set
  const expandedModulesSet = useMemo(() => {
    return expandedModules instanceof Set ? expandedModules : new Set(expandedModules || []);
  }, [expandedModules]);

  // Fetch course data only if not already loaded
  useEffect(() => {
    if (!courseId) return;

    // Only fetch if we don't have the course or if it's a different course
    if (!course || course.id !== courseId) {
      fetchCourse(courseId);
    }
  }, [courseId, fetchCourse]); // Removed course?.id dependency to prevent reloads

  const [newContentTypeDialogOpen, setNewContentTypeDialogOpen] = useState(false)
  const [newContentNameDialogOpen, setNewContentNameDialogOpen] = useState(false)
  const [newModuleDialogOpen, setNewModuleDialogOpen] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newContentType, setNewContentType] = useState("")
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null)

  // Inline editing states
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const editInputRef = useRef<HTMLInputElement>(null)

  // Deletion states
  const [moduleToDelete, setModuleToDelete] = useState<ExtendedModule | null>(null)
  const [lessonToDelete, setLessonToDelete] = useState<ExtendedLesson | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<"module" | "lesson" | null>(null)

  // Track when context menus close
  const [contextMenuCloseTime, setContextMenuCloseTime] = useState<number>(0)

  // Step 1: Select content type
  const handleSelectContentType = (type: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Find the first module to add content to
    const targetModule = modules[0];
    if (!targetModule || !courseId) {
      toast.error("No modules available", {
        description: "Please create a module first before adding content"
      });
      setNewContentTypeDialogOpen(false);
      return;
    }

    // Store the content type and target module for the next step
    setNewContentType(type);
    setTargetModuleId(targetModule.id);

    // Close the type selection dialog and open the naming dialog
    setNewContentTypeDialogOpen(false);
    setNewContentNameDialogOpen(true);
  };

  // Step 2: Create content with name
  const handleCreateContent = async (title: string) => {
    if (!courseId || !targetModuleId || !newContentType) {
      toast.error("Error", {
        description: "Missing required information to create content",
      });
      return;
    }

    // First close the dialog to improve perceived performance
    setNewContentNameDialogOpen(false);

    // Show loading state - force a state update
    setIsCreatingLesson(true);

    // Ensure the state update is applied immediately
    // This is a React trick to force a re-render
    await new Promise(resolve => setTimeout(resolve, 0));

    // Show a loading toast that will persist
    // Store the ID so we can dismiss it later
    const loadingToastId = toast.loading(`Creating new ${newContentType}...`, {
      duration: 60000, // Keep it visible for a long time in case the operation takes a while
    });

    // Execute the async function after a small delay to
    // ensure the dialog close operation has completed
    // Capture the loadingToastId in the closure
    const loadingToastIdCaptured = loadingToastId;
    setTimeout(async () => {
      // Use the captured toast ID to ensure it's available in this scope
      const loadingToastId = loadingToastIdCaptured;
      try {
        console.log('🔄 [EditorSidebar] Creating new content:', { moduleId: targetModuleId, type: newContentType, title });

        // 1. First silently expand the module if it's not already expanded
        if (!expandedModulesSet.has(targetModuleId)) {
          toggleExpandedModule(targetModuleId);
          // Give a moment for this state update to settle
          await new Promise(resolve => setTimeout(resolve, 100)); // Increased timeout
        }

        // 2. Select the module first to establish context - this is a crucial ordering
        selectModule(targetModuleId);

        // 3. Set saved state to prevent any "unsaved" indicators
        setSavedState("saved");

        // 4. Allow the module selection to settle before proceeding
        await new Promise(resolve => setTimeout(resolve, 100)); // Increased timeout

        // 5. Only now call the API to create content - after UI is prepared
        const newContent = await addContent(courseId, targetModuleId, newContentType, title);
        console.log('✅ [EditorSidebar] Content created successfully:', newContent.id);

        // 6. Add significant delay before selecting the lesson
        // This ensures all state updates have fully processed
        setTimeout(() => {
          // Now it's safe to select the lesson
          console.log('💾 [EditorSidebar] Selecting new lesson:', newContent.id);
          selectLesson(newContent.id);

          // Hide loading state
          setIsCreatingLesson(false);

          // Dismiss the loading toast
          toast.dismiss(loadingToastId);

          // Show success toast at the very end of the process
          toast.success("Success", {
            description: `New ${newContentType} added successfully`
          });
        }, 1000); // Increased timeout for better state settlement
      } catch (error) {
        console.error('Failed to add content:', error);

        // Ensure loading state is reset
        setIsCreatingLesson(false);

        // Force a re-render to update the UI
        await new Promise(resolve => setTimeout(resolve, 0));

        // Dismiss the loading toast
        toast.dismiss(loadingToastId);

        toast.error("Error", {
          description: "Failed to add content. Please try again."
        });
      }
    }, 100);
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim() || !courseId) {
      toast.error("Module title required", {
        description: "Please enter a title for the new module"
      });
      return;
    }

    const newModule: ExtendedModule = {
      id: `module-${Date.now()}`,
      title: newModuleTitle,
      description: "New module description",
      position: modules.length,
      metadata: { courseId },
      lessons: []
    };

    setSavedState("unsaved");

    toast.success("Module added", {
      description: `"${newModuleTitle}" has been added to your course`
    });
  };

  const handleSelectItem = (moduleId: string, itemId: string) => {
    selectModule(moduleId);
    selectLesson(itemId);
  };

  const handleDragEnd = async (result: DropResult) => {
    // If there's no destination, the item was dropped outside a valid drop area
    if (!result.destination) return;

    // If the item was dropped in the same position, do nothing
    if (
      result.destination.droppableId === result.source.droppableId &&
      result.destination.index === result.source.index
    ) {
      return;
    }

    // Show loading toast
    const loadingToastId = toast.loading("Updating order...");

    try {
      // Check if we're dealing with modules or lessons
      if (result.type === "MODULE") {
        // Handle module reordering
        const modulesCopy = [...modules];
        const [movedModule] = modulesCopy.splice(result.source.index, 1);
        modulesCopy.splice(result.destination.index, 0, movedModule);

        // Update positions
        modulesCopy.forEach((module, index) => {
          module.position = index;
        });

        // Update UI optimistically
        setSavedState("unsaved");

        // Call the reorderModule function from the store
        try {
          // Get the course ID
          if (!courseId) {
            throw new Error("Course ID not found");
          }

          // Call the reorderModule function
          await reorderModule(movedModule.id, result.destination.index);

          // Dismiss loading toast and show success
          toast.dismiss(loadingToastId);
          toast.success("Modules reordered", {
            description: "The module order has been updated"
          });
        } catch (error) {
          console.error('Error reordering modules:', error);
          toast.dismiss(loadingToastId);
          toast.error("Error", {
            description: "Failed to reorder modules. Please try again."
          });
        }
      } else {
        // Handle lesson reordering
        // Get the source and destination modules
        const sourceModule = modules.find(m => m.id === result.source.droppableId);
        const destModule = modules.find(m => m.id === result.destination?.droppableId);

        if (!sourceModule?.lessons || !destModule?.lessons) {
          toast.dismiss(loadingToastId);
          toast.error("Error", { description: "Module not found" });
          return;
        }

        // Create copies of the lesson arrays
        const sourceLessons = [...sourceModule.lessons];
        const destLessons = sourceModule === destModule ? sourceLessons : [...destModule.lessons];

        // Move the lesson from source to destination
        const [movedLesson] = sourceLessons.splice(result.source.index, 1);
        destLessons.splice(result.destination.index, 0, movedLesson);

        // Update the position property of each lesson
        sourceLessons.forEach((lesson, index) => {
          lesson.position = index;
        });

        if (sourceModule.id !== destModule.id) {
          destLessons.forEach((lesson, index) => {
            lesson.position = index;
          });
        }

        // Update the UI optimistically
        setSavedState("unsaved");

        // If the lesson was moved to a different module, we need to update its module_id
        if (sourceModule.id !== destModule.id) {
          console.log('💾 [EditorSidebar] Moving lesson to different module:', {
            lessonId: movedLesson.id,
            fromModuleId: sourceModule.id,
            toModuleId: destModule.id,
            newPosition: result.destination.index
          });

          try {
            console.log('💾 [EditorSidebar] Using dedicated move endpoint');

            // Use the dedicated move endpoint instead of updateLesson
            const response = await fetch(`/api/courses/${courseId}/lessons/move`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                lessonId: movedLesson.id,
                sourceModuleId: sourceModule.id,
                targetModuleId: destModule.id,
                position: result.destination.index
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to move lesson between modules');
            }

            // The move endpoint handles all the reordering for us

            // Get the response data
            const moveData = await response.json();
            console.log('💾 [EditorSidebar] Move successful:', moveData);

            // Force a complete refresh of the course data to ensure UI is in sync with server
            if (courseId) {
              console.log('🔄 [EditorSidebar] Refreshing course data after move');
              await fetchCourse(courseId, true); // Pass true to force a complete refresh
            }

            toast.dismiss(loadingToastId);
            toast.success("Lesson moved", {
              description: `Moved to ${destModule.title}`
            });

            // Select the moved lesson in its new module
            selectModule(destModule.id);
            selectLesson(movedLesson.id);
          } catch (error) {
            console.error('Error moving lesson between modules:', error);
            toast.dismiss(loadingToastId);
            toast.error("Error", {
              description: "Failed to move lesson between modules. Please try again."
            });

            // Refresh the course data to ensure UI is in sync with server
            if (courseId) {
              await fetchCourse(courseId);
            }
          }
        } else {
          // Just update the position within the same module
          try {
            await reorderLesson(movedLesson.id, result.destination.index);

            toast.dismiss(loadingToastId);
            toast.success("Order updated", {
              description: "Lesson order has been updated"
            });
          } catch (error) {
            console.error('Error reordering lessons:', error);
            toast.dismiss(loadingToastId);
            toast.error("Error", {
              description: "Failed to update lesson order. Please try again."
            });

            // Refresh the course data to ensure UI is in sync with server
            if (courseId) {
              await fetchCourse(courseId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.dismiss(loadingToastId);

      // Provide more detailed error message
      let errorMessage = "Failed to update order. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error("Error", {
        description: errorMessage
      });

      // Refresh the course data to ensure UI is in sync with server
      if (courseId) {
        await fetchCourse(courseId);
      }
    }
  };

  // Handle starting inline editing for a module
  const handleEditModule = (module: ExtendedModule, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setEditingModuleId(module.id);
    setEditingTitle(module.title);
    // Focus the input after it renders with a slight delay to avoid blur issues
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  // Handle starting inline editing for a lesson
  const handleEditLesson = (lesson: ExtendedLesson, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setEditingLessonId(lesson.id);
    setEditingTitle(lesson.title);
    // Focus the input after it renders with a slight delay to avoid blur issues
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  // Handle saving the edited title
  const handleSaveTitle = async (e?: React.FocusEvent) => {
    // If this is a blur event from the context menu selection, ignore it
    if (e && Date.now() - contextMenuCloseTime < 300) {
      return;
    }

    if (editingTitle.trim() === "") {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      if (editingModuleId) {
        // Update module title
        const module = modules.find(m => m.id === editingModuleId);
        if (!module) return;

        // Call API to update module title
        const response = await fetch(`/api/courses/${courseId}/modules/${editingModuleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editingTitle,
            updated_at: new Date().toISOString()
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update module title');
        }

        // Refresh course data
        await fetchCourse(courseId, true);
        toast.success("Module title updated");
      } else if (editingLessonId) {
        // Update lesson title
        const module = modules.find(m => m.lessons?.some(l => l.id === editingLessonId));
        if (!module) return;

        // Call updateLesson from the store
        await updateLesson(editingLessonId, {
          title: editingTitle
        });

        toast.success("Lesson title updated");
      }
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error("Failed to update title");
    } finally {
      // Reset editing state
      setEditingModuleId(null);
      setEditingLessonId(null);
      setEditingTitle("");
    }
  };

  // Handle canceling the edit
  const handleCancelEdit = () => {
    setEditingModuleId(null);
    setEditingLessonId(null);
    setEditingTitle("");
  };

  // Handle keydown events in the edit input
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteModule = (module: ExtendedModule, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setModuleToDelete(module);
    setDeleteType("module");
    setDeleteDialogOpen(true);
  };

  // Handle opening the delete confirmation dialog for a lesson
  const handleDeleteLesson = (lesson: ExtendedLesson, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setLessonToDelete(lesson);
    setDeleteType("lesson");
    setDeleteDialogOpen(true);
  };

  // Handle confirming deletion
  const handleConfirmDelete = async () => {
    try {
      if (deleteType === "module" && moduleToDelete) {
        // Delete module
        const response = await fetch(`/api/courses/${courseId}/modules/${moduleToDelete.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete module');
        }

        // Refresh course data
        await fetchCourse(courseId, true);
        toast.success("Module deleted");
      } else if (deleteType === "lesson" && lessonToDelete) {
        // Find the module containing the lesson
        const module = modules.find(m => m.lessons?.some(l => l.id === lessonToDelete.id));
        if (!module) return;

        // Delete lesson
        const response = await fetch(`/api/courses/${courseId}/modules/${module.id}/lessons/${lessonToDelete.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete lesson');
        }

        // Refresh course data
        await fetchCourse(courseId, true);
        toast.success("Lesson deleted");
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error("Failed to delete item");
    } finally {
      // Reset deletion state
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
      setLessonToDelete(null);
      setDeleteType(null);
    }
  };

  // Get the appropriate icon for a content type
  const getItemIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
      case "quiz":
        return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
      case "video":
        return <Video className="h-4 w-4 shrink-0 text-muted-foreground" />;
      default:
        return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-80 border-r bg-muted/10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-80 border-r bg-muted/10 p-4">
        <div className="text-destructive">Error: {error}</div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchCourse(courseId)}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show empty state
  if (!modules.length) {
    return (
      <div className="w-80 border-r bg-muted/10">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Course Content</h2>
        </div>
        <div className="p-4 text-center">
          <p className="text-muted-foreground mb-4">No modules yet</p>
          <Button
            variant="outline"
            onClick={() => setNewModuleDialogOpen(true)}
          >
            Add First Module
          </Button>
        </div>
        <Dialog open={newModuleDialogOpen} onOpenChange={setNewModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Module</DialogTitle>
              <DialogDescription>Enter a title for the new module.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Enter module title"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddModule}>Add Module</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show main content
  return (
    <div className="w-80 border-r bg-muted/10">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {isCreatingLesson ? (
            <div className="bg-background border rounded-md px-2 py-1 text-xs flex items-center gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Creating lesson...</span>
            </div>
          ) : (
            <Dialog open={newContentTypeDialogOpen} onOpenChange={setNewContentTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Content</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Content</DialogTitle>
                  <DialogDescription>Choose the type of content to add to your course.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    onClick={() => handleSelectContentType("lesson")}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-auto py-3"
                  >
                    <FileText className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Lesson</div>
                      <div className="text-sm text-muted-foreground">Add a text-based lesson with rich content</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleSelectContentType("quiz")}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-auto py-3"
                  >
                    <File className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Quiz</div>
                      <div className="text-sm text-muted-foreground">Create an interactive quiz or assessment</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleSelectContentType("video")}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-auto py-3"
                  >
                    <Video className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Video</div>
                      <div className="text-sm text-muted-foreground">Upload or embed a video lesson</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleSelectContentType("assignment")}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-auto py-3"
                  >
                    <File className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Assignment</div>
                      <div className="text-sm text-muted-foreground">Create a practical assignment or project</div>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Content Naming Dialog */}
          <ContentNameDialog
            isOpen={newContentNameDialogOpen}
            onOpenChange={setNewContentNameDialogOpen}
            contentType={newContentType}
            onSubmit={handleCreateContent}
          />
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="modules" type="MODULE">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "space-y-4",
                    snapshot.isDraggingOver && "bg-muted/30 rounded-md p-2"
                  )}
                >
                  {modules.map((module, moduleIndex) => (
                    <Draggable key={module.id} draggableId={`module-${module.id}`} index={moduleIndex}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="mb-4"
                        >
                          <ContextMenu modal={true} onOpenChange={(open) => {
                            if (!open) setContextMenuCloseTime(Date.now());
                          }}>
                            <ContextMenuTrigger>
                              <div
                                className={cn(
                                  "flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group relative",
                                  selectedModuleId === module.id && "bg-primary/10 text-primary font-medium",
                                  snapshot.isDragging && "border-2 border-primary/50 bg-muted/20 shadow-md"
                                )}
                              >
                                <div className="flex items-center gap-2 flex-1 truncate pr-6">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                  </div>
                                  <div onClick={() => toggleExpandedModule(module.id)}>
                                    {expandedModulesSet.has(module.id) ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                  </div>
                                  <FolderClosed className="h-4 w-4 shrink-0 text-muted-foreground" />

                                  {/* Inline editing for module title */}
                                  {editingModuleId === module.id ? (
                                    <div className="flex items-center gap-1 flex-1">
                                      <Input
                                        ref={editInputRef}
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={handleEditKeyDown}
                                        onBlur={handleSaveTitle}
                                        className="h-6 py-1 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveTitle();
                                        }}
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEdit();
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span
                                      className="truncate flex-1"
                                      onClick={() => toggleExpandedModule(module.id)}
                                    >
                                      {module.title}
                                    </span>
                                  )}
                                </div>

                                {/* Module actions dropdown */}
                                {!editingModuleId && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center bg-background/80 rounded-sm shadow-sm">
                                    <DropdownMenu onOpenChange={(open) => {
                                      if (!open) setContextMenuCloseTime(Date.now());
                                    }}>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem onSelect={() => handleEditModule(module)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => {
                                          setTargetModuleId(module.id);
                                          setNewContentTypeDialogOpen(true);
                                        }}>
                                          <Plus className="mr-2 h-4 w-4" />
                                          Add Content
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onSelect={() => handleDeleteModule(module)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-40">
                              <ContextMenuItem onSelect={() => toggleExpandedModule(module.id)}>
                                {expandedModulesSet.has(module.id) ? "Collapse" : "Expand"}
                              </ContextMenuItem>
                              <ContextMenuItem onSelect={() => handleEditModule(module)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </ContextMenuItem>
                              <ContextMenuItem onSelect={() => {
                                setTargetModuleId(module.id);
                                setNewContentTypeDialogOpen(true);
                              }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Content
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => handleDeleteModule(module)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                {expandedModulesSet.has(module.id) && (
                  <Droppable droppableId={module.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "pl-9 mt-1",
                          snapshot.isDraggingOver && "bg-muted/20 rounded-md py-1"
                        )}
                      >
                        {/* Show loading indicator in the module where content is being added */}
                        {isCreatingLesson && targetModuleId === module.id && (
                          <div className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-muted/30 text-sm animate-pulse my-1">
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            <span className="truncate">Creating new {newContentType}...</span>
                          </div>
                        )}

                        {(module.lessons || []).map((lesson, index) => (
                          <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="mb-1"
                              >
                                <ContextMenu modal={true} onOpenChange={(open) => {
                                  if (!open) setContextMenuCloseTime(Date.now());
                                }}>
                                  <ContextMenuTrigger>
                                    <div
                                      className={cn(
                                        "flex items-center justify-between gap-2 py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-sm group relative",
                                        selectedLessonId === lesson.id && "bg-primary/10 text-primary font-medium",
                                        snapshot.isDragging && "border border-primary/50 bg-muted/20 shadow-sm"
                                      )}
                                      onClick={() => {
                                        if (!editingLessonId) {
                                          handleSelectItem(module.id, lesson.id);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2 flex-1 truncate pr-6">
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                                        </div>
                                        {getItemIcon(lesson.metadata?.type || 'lesson')}

                                        {/* Inline editing for lesson title */}
                                        {editingLessonId === lesson.id ? (
                                          <div className="flex items-center gap-1 flex-1">
                                            <Input
                                              ref={editInputRef}
                                              value={editingTitle}
                                              onChange={(e) => setEditingTitle(e.target.value)}
                                              onKeyDown={handleEditKeyDown}
                                              onBlur={handleSaveTitle}
                                              className="h-5 py-0.5 text-xs"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSaveTitle();
                                              }}
                                            >
                                              <Save className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCancelEdit();
                                              }}
                                            >
                                              <X className="h-2.5 w-2.5" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <span className="truncate flex-1">{lesson.title}</span>
                                        )}
                                      </div>

                                      {/* Lesson actions dropdown */}
                                      {!editingLessonId && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center bg-background/80 rounded-sm shadow-sm">
                                          <DropdownMenu onOpenChange={(open) => {
                                            if (!open) setContextMenuCloseTime(Date.now());
                                          }}>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <MoreHorizontal className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                              <DropdownMenuItem onSelect={() => handleEditLesson(lesson)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit Title
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onSelect={() => handleDeleteLesson(lesson)}
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      )}
                                    </div>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent className="w-40">
                                    <ContextMenuItem onSelect={() => handleSelectItem(module.id, lesson.id)}>
                                      Open
                                    </ContextMenuItem>
                                    <ContextMenuItem onSelect={() => handleEditLesson(lesson)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Title
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={() => handleDeleteLesson(lesson)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setNewModuleDialogOpen(true)}
          >
            Add Module
          </Button>
        </div>
      </ScrollArea>
      <Dialog open={newModuleDialogOpen} onOpenChange={setNewModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
            <DialogDescription>Enter a title for the new module.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="Enter module title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddModule}>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === "module" ? "Delete Module" : "Delete Lesson"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "module" ? (
                <>Are you sure you want to delete the module <strong>{moduleToDelete?.title}</strong>? This will also delete all lessons within this module.</>
              ) : (
                <>Are you sure you want to delete the lesson <strong>{lessonToDelete?.title}</strong>? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
