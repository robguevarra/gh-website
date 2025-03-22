"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Pencil, Trash, GripVertical, Plus, ExternalLink, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Interfaces
interface Lesson {
  id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  status: string;
  module_id: string;
}

interface LessonListProps {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  initialLessons: Lesson[];
}

export function LessonList({ courseId, moduleId, moduleTitle, initialLessons }: LessonListProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [isLoading, setIsLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonDescription, setEditLessonDescription] = useState("");

  // Sort lessons by position when first loaded
  useEffect(() => {
    if (initialLessons) {
      const sortedLessons = [...initialLessons].sort((a, b) => a.position - b.position);
      setLessons(sortedLessons);
    }
  }, [initialLessons]);

  // Handle creating a new lesson
  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newLessonTitle,
          description: newLessonDescription || null,
          status: "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lesson");
      }

      const newLesson = await response.json();
      setLessons([...lessons, newLesson]);
      setCreateDialogOpen(false);
      setNewLessonTitle("");
      setNewLessonDescription("");
      toast.success("Lesson created successfully");
      router.refresh();
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Failed to create lesson");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle updating an existing lesson
  const handleUpdateLesson = async () => {
    if (!currentLesson) return;
    if (!editLessonTitle.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${currentLesson.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editLessonTitle,
          description: editLessonDescription || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update lesson");
      }

      const updatedLesson = await response.json();
      setLessons(
        lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson))
      );
      setEditDialogOpen(false);
      setCurrentLesson(null);
      toast.success("Lesson updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast.error("Failed to update lesson");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a lesson
  const handleDeleteLesson = async () => {
    if (!currentLesson) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${currentLesson.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete lesson");
      }

      setLessons(lessons.filter((lesson) => lesson.id !== currentLesson.id));
      setDeleteDialogOpen(false);
      setCurrentLesson(null);
      toast.success("Lesson deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reordering lessons via drag and drop
  const handleReorder = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(lessons);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));
    
    // Optimistically update UI
    setLessons(updatedItems);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonOrder: updatedItems.map((item) => ({
            id: item.id,
            position: item.position,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reorder lessons");
      }
      
      toast.success("Lessons reordered successfully");
      router.refresh();
    } catch (error) {
      console.error("Error reordering lessons:", error);
      toast.error("Failed to reorder lessons");
      
      // Revert to original order
      setLessons([...initialLessons].sort((a, b) => a.position - b.position));
    }
  };

  // Edit lesson dialog with content
  const renderEditDialog = () => (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription>
            Update the lesson details below. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={editLessonTitle}
              onChange={(e) => setEditLessonTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={editLessonDescription}
              onChange={(e) => setEditLessonDescription(e.target.value)}
              className="col-span-3"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateLesson} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Delete lesson confirmation dialog
  const renderDeleteDialog = () => (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Lesson</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this lesson? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteLesson} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete Lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Create new lesson dialog
  const renderCreateDialog = () => (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to the &quot;{moduleTitle}&quot; module.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-title" className="text-right">
              Title
            </Label>
            <Input
              id="new-title"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-description" className="text-right">
              Description
            </Label>
            <Textarea
              id="new-description"
              value={newLessonDescription}
              onChange={(e) => setNewLessonDescription(e.target.value)}
              className="col-span-3"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateLesson} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lessons for {moduleTitle}</h2>
          <p className="text-muted-foreground">
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"} in this module
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Lesson
        </Button>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-semibold">No lessons</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new lesson.
              </p>
              <div className="mt-6">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Manage Lessons</CardTitle>
            <CardDescription>
              Drag and drop to reorder lessons. Click on a lesson title to edit its content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              <DragDropContext onDragEnd={handleReorder}>
                <Droppable droppableId="lessons">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {lessons.map((lesson, index) => (
                        <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center justify-between p-4 rounded-md border"
                            >
                              <div className="flex items-center gap-4">
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {lesson.title}
                                    {lesson.status === "draft" && (
                                      <Badge variant="outline" className="bg-yellow-50">
                                        <EyeOff className="h-3 w-3 mr-1" /> Draft
                                      </Badge>
                                    )}
                                  </div>
                                  {lesson.description && (
                                    <div className="text-sm text-muted-foreground truncate max-w-md">
                                      {lesson.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`}>
                                  <Button variant="outline" size="sm">
                                    <ExternalLink className="h-4 w-4 mr-1" /> Edit Content
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentLesson(lesson);
                                    setEditLessonTitle(lesson.title);
                                    setEditLessonDescription(lesson.description || "");
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentLesson(lesson);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Render dialogs */}
      {renderCreateDialog()}
      {renderEditDialog()}
      {renderDeleteDialog()}
    </div>
  );
} 