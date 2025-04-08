"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Editor } from "@tiptap/react"

interface AddVimeoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
}

export function AddVimeoDialog({
  open,
  onOpenChange,
  editor
}: AddVimeoDialogProps) {
  const [activeTab, setActiveTab] = useState("url")
  const [vimeoUrl, setVimeoUrl] = useState("")
  const [vimeoId, setVimeoId] = useState("")
  const [embedCode, setEmbedCode] = useState("")
  const [error, setError] = useState("")

  // Extract Vimeo ID from URL when input changes
  const handleUrlChange = (url: string) => {
    setVimeoUrl(url)
    setError("")

    // Try to extract Vimeo ID
    const extractedId = extractVimeoId(url)
    if (url && !extractedId) {
      setError("Please enter a valid Vimeo URL")
    } else {
      setVimeoId(extractedId || "")
    }
  }

  // Validate embed code when it changes
  const handleEmbedCodeChange = (code: string) => {
    setEmbedCode(code)
    setError("")

    if (code && !isValidVimeoEmbed(code)) {
      setError("Please enter a valid Vimeo embed code")
    }
  }

  const handleAddVideo = () => {
    if (!editor) return

    if (activeTab === "url") {
      if (!vimeoId) {
        setError("Please enter a valid Vimeo URL")
        return
      }

      // Insert a Vimeo node at the current cursor position
      editor.chain().focus().setVimeo({
        src: `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&dnt=1`,
        videoId: vimeoId
      }).run()
    } else {
      if (!embedCode || !isValidVimeoEmbed(embedCode)) {
        setError("Please enter a valid Vimeo embed code")
        return
      }

      // Extract the Vimeo ID from the embed code
      const videoIdMatch = embedCode.match(/player\.vimeo\.com\/video\/([0-9]+)/)
      const videoId = videoIdMatch ? videoIdMatch[1] : null

      if (!videoId) {
        setError("Could not extract Vimeo ID from embed code")
        return
      }

      // Insert a Vimeo node at the current cursor position
      editor.chain().focus().setVimeo({
        src: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479&dnt=1`,
        videoId: videoId
      }).run()
    }

    // Reset and close dialog
    setVimeoUrl("")
    setVimeoId("")
    setEmbedCode("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Vimeo Video</DialogTitle>
          <DialogDescription>
            Add a Vimeo video to your lesson using a URL or embed code.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Vimeo URL</TabsTrigger>
            <TabsTrigger value="embed">Embed Code</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-4">
            <div className="grid gap-2">
              <Label htmlFor="vimeo-url">Vimeo URL or ID</Label>
              <Input
                id="vimeo-url"
                placeholder="https://vimeo.com/123456789 or 123456789"
                value={vimeoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={error && activeTab === "url" ? "border-red-500" : ""}
              />
              {error && activeTab === "url" && <p className="text-red-500 text-sm">{error}</p>}

              {vimeoId && (
                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="text-sm font-medium">Preview:</p>
                  <p className="text-sm text-muted-foreground mt-1">Vimeo ID: {vimeoId}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="embed" className="mt-4">
            <div className="grid gap-2">
              <Label htmlFor="embed-code">Vimeo Embed Code</Label>
              <Textarea
                id="embed-code"
                placeholder="Paste the full embed code from Vimeo here"
                value={embedCode}
                onChange={(e) => handleEmbedCodeChange(e.target.value)}
                className={`min-h-[120px] font-mono text-sm ${error && activeTab === "embed" ? "border-red-500" : ""}`}
              />
              {error && activeTab === "embed" && <p className="text-red-500 text-sm">{error}</p>}

              {embedCode && !error && activeTab === "embed" && (
                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="text-sm font-medium">Preview:</p>
                  <p className="text-sm text-muted-foreground mt-1">Embed code validated ✓</p>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mt-2">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> For restricted videos, copy the embed code directly from Vimeo's share dialog.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddVideo}
            disabled={(activeTab === "url" && !vimeoId) || (activeTab === "embed" && (!embedCode || error))}
          >
            Add Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Function to extract Vimeo ID from various URL formats
function extractVimeoId(input: string): string | null {
  // If input is just a number, assume it's a Vimeo ID
  if (/^\d+$/.test(input)) {
    return input;
  }

  // Try to extract from URL
  const patterns = [
    /vimeo\.com\/(\d+)/,                          // vimeo.com/123456789
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/,        // vimeo.com/channels/channel/123456789
    /vimeo\.com\/groups\/[^\/]+\/videos\/(\d+)/,  // vimeo.com/groups/group/videos/123456789
    /player\.vimeo\.com\/video\/(\d+)/            // player.vimeo.com/video/123456789
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Function to validate Vimeo embed code
function isValidVimeoEmbed(code: string): boolean {
  // Check if it contains an iframe with a vimeo.com source
  return (
    code.includes('<iframe') &&
    code.includes('</iframe>') &&
    (code.includes('player.vimeo.com') || code.includes('vimeo.com'))
  );
}