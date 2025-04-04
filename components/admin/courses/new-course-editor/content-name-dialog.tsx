"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface ContentNameDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  contentType: string
  onSubmit: (title: string) => Promise<void>
}

export default function ContentNameDialog({
  isOpen,
  onOpenChange,
  contentType,
  onSubmit,
}: ContentNameDialogProps) {
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Close the dialog immediately to improve perceived performance
      onOpenChange(false);

      // Submit the title
      await onSubmit(title);

      // Reset the form
      setTitle("");
    } catch (error) {
      console.error("Error submitting content:", error);
      // Reopen the dialog if there was an error
      onOpenChange(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format the content type for display (e.g., "lesson" -> "Lesson")
  const formattedType = contentType.charAt(0).toUpperCase() + contentType.slice(1)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If we're closing the dialog, handle it specially
      if (!open) {
        // First set the state locally
        onOpenChange(false);
        // Then reset the form
        setTitle("");
      } else {
        onOpenChange(true);
      }
    }}>
      <DialogContent onClick={(e) => {
        // Prevent clicks inside the dialog from bubbling up
        e.stopPropagation();
      }}>
        <DialogHeader>
          <DialogTitle>Name Your New {formattedType}</DialogTitle>
          <DialogDescription>
            Enter a name for your new {contentType}. You can change this later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="content-title">Title</Label>
            <Input
              id="content-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${contentType} title`}
              disabled={isSubmitting}
              autoFocus
              onKeyDown={(e) => {
                // Handle Enter key press
                if (e.key === 'Enter' && !isSubmitting && title.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${formattedType}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
