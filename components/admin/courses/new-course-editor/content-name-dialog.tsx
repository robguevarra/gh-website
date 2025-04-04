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

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    // Prevent default if it's a form event
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Close the dialog before submitting to prevent any navigation issues
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name Your New {formattedType}</DialogTitle>
          <DialogDescription>
            Enter a name for your new {contentType}. You can change this later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
              type="button" // Changed from submit to button to prevent form submission
              onClick={handleSubmit} // Handle click manually
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
