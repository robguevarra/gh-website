"use client"

import { RefObject, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editorRef: RefObject<HTMLDivElement>
  onContentChange: () => void
}

export function AddVideoDialog({
  open,
  onOpenChange,
  editorRef,
  onContentChange
}: AddVideoDialogProps) {
  const [videoUrl, setVideoUrl] = useState("")

  const handleAddVideo = () => {
    if (!editorRef.current || !videoUrl) return

    // Extract video ID from YouTube URL
    const videoId = extractYouTubeId(videoUrl)
    if (!videoId) {
      alert("Please enter a valid YouTube URL")
      return
    }

    // Create responsive video embed
    const html = `
      <div class="relative w-full aspect-video my-4">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="absolute top-0 left-0 w-full h-full rounded-lg"
        ></iframe>
      </div>
    `

    document.execCommand("insertHTML", false, html)
    editorRef.current.focus()
    onContentChange()
    setVideoUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
          <DialogDescription>
            Enter a YouTube video URL to embed in your document.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddVideo}>Add Video</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
} 