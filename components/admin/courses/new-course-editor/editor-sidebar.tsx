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
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
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
import type { ExtendedModule } from "@/lib/stores/course/types"
import { useParams } from "next/navigation"

export default function EditorSidebar() {
  const { toast } = useToast()
  const params = useParams()
  const courseId = params.courseId as string

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
    fetchCourse
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

  // Step 1: Select content type
  const handleSelectContentType = (type: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Find the first module to add content to
    const targetModule = modules[0];
    if (!targetModule || !courseId) {
      toast({
        title: "No modules available",
        description: "Please create a module first before adding content",
        variant: "destructive",
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
      toast({
        title: "Error",
        description: "Missing required information to create content",
        variant: "destructive",
      });
      return;
    }

    try {
      // First close the dialog to improve perceived performance
      setNewContentNameDialogOpen(false);

      // Show a loading toast
      toast({
        title: "Creating content",
        description: `Creating new ${newContentType}...`,
        variant: "default",
      });

      // Call the API directly without optimistic updates
      const newContent = await addContent(courseId, targetModuleId, newContentType, title);

      // Select the new content immediately, but with a slight delay to allow state to settle
      selectModule(targetModuleId);

      // Add a small delay before selecting the lesson to prevent editor reload
      setTimeout(() => {
        console.log('💾 [EditorSidebar] Selecting new lesson:', newContent.id);
        selectLesson(newContent.id);
        setSavedState("saved"); // Start with saved state
      }, 50);

      // Show success toast
      toast({
        title: "Success",
        description: `New ${newContentType} added successfully`
      });
    } catch (error) {
      console.error('Failed to add content:', error);
      toast({
        title: "Error",
        description: "Failed to add content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim() || !courseId) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the new module",
        variant: "destructive",
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

    toast({
      title: "Module added",
      description: `"${newModuleTitle}" has been added to your course`,
    });
  };

  const handleSelectItem = (moduleId: string, itemId: string) => {
    selectModule(moduleId);
    selectLesson(itemId);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceModule = modules.find(m => m.id === result.source.droppableId);
    const destModule = modules.find(m => m.id === result.destination?.droppableId);

    if (!sourceModule?.lessons || !destModule?.lessons) return;

    const sourceLessons = [...sourceModule.lessons];
    const destLessons = sourceModule === destModule ? sourceLessons : [...destModule.lessons];

    const [movedLesson] = sourceLessons.splice(result.source.index, 1);
    destLessons.splice(result.destination.index, 0, movedLesson);

    const newModules = modules.map(m => {
      if (m.id === sourceModule.id) {
        return { ...m, lessons: sourceLessons };
      }
      if (m.id === destModule.id) {
        return { ...m, lessons: destLessons };
      }
      return m;
    });

    setSavedState("unsaved");
  };

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
            {modules.map((module) => (
              <div key={module.id} className="mb-4">
                <div
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                    selectedModuleId === module.id && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => toggleExpandedModule(module.id)}
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {expandedModulesSet.has(module.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <FolderClosed className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{module.title}</span>
                  </div>
                </div>
                {expandedModulesSet.has(module.id) && (
                  <Droppable droppableId={module.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="pl-9 mt-1"
                      >
                        {(module.lessons || []).map((lesson, index) => (
                          <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer text-sm",
                                  selectedLessonId === lesson.id && "bg-primary/10 text-primary font-medium"
                                )}
                                onClick={() => handleSelectItem(module.id, lesson.id)}
                              >
                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                                {getItemIcon(lesson.metadata?.type || 'lesson')}
                                <span className="truncate">{lesson.title}</span>
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
            ))}
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
    </div>
  );
}

