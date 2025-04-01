"use client"

import { RefObject } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editorRef: RefObject<HTMLDivElement>
  onContentChange: () => void
}

const contentBlocks = {
  note: {
    title: "Note Block",
    html: `
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-blue-700">Your note text here</p>
          </div>
        </div>
      </div>
    `
  },
  warning: {
    title: "Warning Block",
    html: `
      <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">Your warning text here</p>
          </div>
        </div>
      </div>
    `
  },
  tip: {
    title: "Tip Block",
    html: `
      <div class="bg-green-50 border-l-4 border-green-500 p-4 my-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-green-700">Your tip text here</p>
          </div>
        </div>
      </div>
    `
  }
}

export function AddContentDialog({
  open,
  onOpenChange,
  editorRef,
  onContentChange
}: AddContentDialogProps) {
  const handleAddContent = (type: keyof typeof contentBlocks) => {
    if (!editorRef.current) return
    
    const block = contentBlocks[type]
    document.execCommand("insertHTML", false, block.html)
    editorRef.current.focus()
    onContentChange()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Content Block</DialogTitle>
          <DialogDescription>
            Choose a content block type to insert into your document.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Select onValueChange={handleAddContent}>
            <SelectTrigger>
              <SelectValue placeholder="Select a block type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(contentBlocks).map(([key, block]) => (
                <SelectItem key={key} value={key}>
                  {block.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 