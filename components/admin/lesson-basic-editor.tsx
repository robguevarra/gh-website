"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: any;
  status: string;
  position: number;
  module_id: string;
  created_at: string;
  updated_at: string;
}

interface LessonBasicEditorProps {
  lesson: Lesson;
  courseId: string;
  moduleId: string;
}

export function LessonBasicEditor({ lesson, courseId, moduleId }: LessonBasicEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(lesson.status === "published");
  const [isSaving, setIsSaving] = useState(false);
  const [savedContent, setSavedContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (lesson.content) {
      try {
        const parsedContent = typeof lesson.content === "string" ? lesson.content : JSON.stringify(lesson.content);
        setContent(parsedContent);
        setSavedContent(parsedContent);
      } catch (error) {
        console.error("Error parsing lesson content:", error);
        setContent("");
        setSavedContent("");
      }
    } else {
      setContent("");
      setSavedContent("");
    }
  }, [lesson]);

  // Check for unsaved changes
  useEffect(() => {
    setHasChanges(content !== savedContent || isPublished !== (lesson.status === "published"));
    
    // Reset success state when changes are made after a successful save
    if (saveSuccess && (content !== savedContent || isPublished !== (lesson.status === "published"))) {
      setSaveSuccess(false);
    }
  }, [content, savedContent, isPublished, lesson.status, saveSuccess]);

  // Format timestamp for last saved
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(date);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
          status: isPublished ? "published" : "draft",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save lesson content");
      }

      const updatedLesson = await response.json();
      
      // Update local state
      setSavedContent(content);
      setLastSaved(new Date().toISOString());
      setSaveSuccess(true);
      toast.success("Lesson content saved successfully");
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      router.refresh();
    } catch (error) {
      console.error("Error saving lesson content:", error);
      setSaveError(error instanceof Error ? error.message : "An unknown error occurred");
      toast.error("Failed to save lesson content");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishStatus = () => {
    setIsPublished(!isPublished);
  };

  const handleDiscard = () => {
    setContent(savedContent);
    setIsPublished(lesson.status === "published");
    setSaveError(null);
    toast.info("Changes discarded");
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Lesson Content</h3>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Last saved: {formatTimestamp(lastSaved)}
              </span>
            )}
            {hasChanges && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDiscard}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" /> Discard
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges}
              size="sm"
              className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-1" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save
                </>
              )}
            </Button>
          </div>
        </div>
        
        {saveError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        
        {hasChanges && (
          <Alert className="mb-4 bg-yellow-50 border-yellow-100">
            <AlertDescription className="text-yellow-800">
              You have unsaved changes. Don't forget to save before leaving this page.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label htmlFor="publish-status">Publish Status</Label>
              <div className="text-sm text-muted-foreground">
                {isPublished 
                  ? "This lesson is visible to students" 
                  : "This lesson is only visible to administrators"}
              </div>
            </div>
            <Switch
              id="publish-status"
              checked={isPublished}
              onCheckedChange={togglePublishStatus}
            />
          </div>
          
          <div>
            <Label htmlFor="content">Content</Label>
            <div className="mt-1 relative">
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter lesson content..."
                className="min-h-[400px] font-mono"
                disabled={isSaving}
              />
              {isSaving && (
                <div className="absolute right-3 top-3 bg-background/80 rounded-full p-1">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              This is a basic text editor. For now, you can use Markdown formatting.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 