"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  FileVideo,
  Table,
  Code,
  Undo,
  Redo,
  PlusCircle,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext } from "./course-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCourseStore } from "@/lib/stores/course"
import { debounce } from "lodash"

interface ContentEditorProps {
  onSave: () => void
}

export default function ContentEditor({ onSave }: ContentEditorProps) {
  const { toast } = useToast()
  const { 
    modules, 
    activeModuleId, 
    activeItemId, 
    setSavedState, 
    currentContent: contextContent,
    setCurrentContent,
    setActiveModuleId,
    setActiveItemId
  } = useCourseContext()
  
  const { course, selectedModuleId, selectedLessonId, updateLesson } = useCourseStore()

  // All state declarations moved to the top
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [editorMode, setEditorMode] = useState("editor")
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  // All refs declared at the top
  const editorRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef("")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const selectionStateRef = useRef<{
    startContainer: Node;
    startOffset: number;
    endContainer: Node;
    endOffset: number;
  } | null>(null)

  // Sync active item with selected lesson - FIXED
  useEffect(() => {
    if (!selectedLessonId || !selectedModuleId) {
      // Clear content if no lesson selected
      setContent("")
      setTitle("")
      contentRef.current = ""
      if (editorRef.current) {
        editorRef.current.innerHTML = ""
      }
      setIsEditorInitialized(false)
      return
    }

    // Set active IDs
    setActiveModuleId(selectedModuleId)
    setActiveItemId(selectedLessonId)

  }, [selectedLessonId, selectedModuleId]) // Removed circular dependencies

  // Memoize active module and item with proper dependencies
  const { activeModule, activeItem } = useMemo(() => {
    const module = modules?.find((m) => m.id === selectedModuleId)
    return {
      activeModule: module,
      activeItem: module?.items?.find((i) => i.id === selectedLessonId)
    }
  }, [modules, selectedModuleId, selectedLessonId]) // Changed to use selected IDs directly

  // Load content when active item changes
  useEffect(() => {
    if (!activeItem) return

    const lessonContent = activeItem.content_json?.content || activeItem.content || ""
    
    setIsContentLoading(true)
    setTitle(activeItem.title)
    
    // Update content and editor
    setContent(lessonContent)
    contentRef.current = lessonContent
    if (editorRef.current) {
      editorRef.current.innerHTML = lessonContent
    }

    // Update context
    setCurrentContent(lessonContent)
    
    setIsContentLoading(false)
    setIsEditorInitialized(true)

  }, [activeItem, setCurrentContent])

  // Initialize debounced save function
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!selectedLessonId) return
      try {
        await saveContent(content)
      } catch (error) {
        console.error("Failed to save content:", error)
        setSavedState("unsaved")
        toast({
          title: "Error saving content",
          description: error instanceof Error ? error.message : "Your changes could not be saved. Please try again.",
          variant: "destructive",
        })
      }
    }, 1000)
  ).current

  // Save content to modules
  const saveContent = useCallback(async (newContent: string) => {
    if (!activeItem?.id) return

    try {
      setIsSaving(true)
      setSavedState("saving")
      
      debouncedSave.cancel()

      await updateLesson(activeItem.id, {
        content_json: {
          content: newContent,
          type: "html",
          version: 1
        },
        title
      })

      contentRef.current = newContent
      setSavedState("saved")
      
      toast({
        title: "Changes saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save changes:", error)
      setSavedState("unsaved")
      toast({
        title: "Error saving changes",
        description: error instanceof Error ? error.message : "Your changes could not be saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [activeItem, title, updateLesson, setSavedState, toast, debouncedSave])

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (newContent === contentRef.current) return
    
    contentRef.current = newContent
    setContent(newContent)
    setCurrentContent(newContent)
    setSavedState("unsaved")
    
    debouncedSave(newContent)
  }, [setCurrentContent, setSavedState, debouncedSave])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [debouncedSave])

  // Initialize MutationObserver
  useEffect(() => {
    if (!editorRef.current || !isEditorInitialized) return

    const observer = new MutationObserver(() => {
      if (!editorRef.current) return
      handleContentChange(editorRef.current.innerHTML)
    })

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => observer.disconnect()
  }, [isEditorInitialized, handleContentChange])

  // Save selection state
  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return

    const range = selection.getRangeAt(0)
    selectionStateRef.current = {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    }
  }, [])

  // Handle title changes
  const handleTitleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    if (!activeItem?.id || newTitle === title) return
    
    setTitle(newTitle)
    setSavedState("unsaved")
    
    try {
      setIsSaving(true)
      await updateLesson(activeItem.id, { title: newTitle })
      setSavedState("saved")
    } catch (error) {
      console.error("Failed to update title:", error)
      setSavedState("unsaved")
      toast({
        title: "Error updating title",
        description: error instanceof Error ? error.message : "Title could not be updated. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [activeItem, title, updateLesson, setSavedState, toast])

  // Handle editor input
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return
    handleContentChange(editorRef.current.innerHTML)
  }, [handleContentChange])

  // Render loading state
  if (isContentLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading lesson content...</p>
        </div>
      </div>
    )
  }

  // Render empty state
  if (!activeModule || !activeItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No content selected</h2>
          <p className="text-muted-foreground">Select a module item from the sidebar to edit its content.</p>
        </div>
      </div>
    )
  }

  // Handle formatting without losing cursor position
  const applyFormatting = (command: string, value = "") => {
    if (!editorRef.current) return

    // Focus the editor if it's not already focused
    editorRef.current.focus()

    // Apply formatting to the editor content
    document.execCommand(command, false, value)

    // Get the updated content from the editor
    handleContentChange(editorRef.current.innerHTML)

    toast({
      title: "Formatting applied",
      description: `Applied ${command} formatting`,
    })
  }

  const handleAddContentBlock = (type: string) => {
    setAddContentDialogOpen(false)

    let blockHtml = ""
    switch (type) {
      case "text":
        blockHtml = "<p>New paragraph text</p>"
        break
      case "heading":
        blockHtml = "<h2>New Heading</h2>"
        break
      case "list":
        blockHtml = "<ul><li>List item 1</li><li>List item 2</li></ul>"
        break
      case "image":
        blockHtml = '<div class="image-placeholder p-4 bg-muted rounded-md text-center my-4">Image Placeholder</div>'
        break
      case "video":
        setVideoDialogOpen(true)
        return
    }

    if (editorRef.current) {
      // Append the new content to the editor
      editorRef.current.innerHTML += blockHtml
      handleContentChange(editorRef.current.innerHTML)
    } else {
      // Fallback if editor ref isn't available
      handleContentChange(content + blockHtml)
    }

    toast({
      title: "Content block added",
      description: `Added new ${type} block to your content`,
    })
  }

  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Video URL required",
        description: "Please enter a valid YouTube or Vimeo URL",
        variant: "destructive",
      })
      return
    }

    let embedHtml = ""

    // Check if it's a YouTube URL
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      // Extract video ID
      let videoId = ""

      if (videoUrl.includes("youtube.com/watch?v=")) {
        videoId = videoUrl.split("v=")[1]
        const ampersandPosition = videoId.indexOf("&")
        if (ampersandPosition !== -1) {
          videoId = videoId.substring(0, ampersandPosition)
        }
      } else if (videoUrl.includes("youtu.be/")) {
        videoId = videoUrl.split("youtu.be/")[1]
      }

      if (videoId) {
        embedHtml = `
          <div class="video-embed my-4">
            <div class="aspect-video">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
              ></iframe>
            </div>
          </div>
        `
      }
    }
    // Check if it's a Vimeo URL
    else if (videoUrl.includes("vimeo.com")) {
      // Extract video ID
      const vimeoId = videoUrl.split("vimeo.com/")[1]

      if (vimeoId) {
        embedHtml = `
          <div class="video-embed my-4">
            <div class="aspect-video">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://player.vimeo.com/video/${vimeoId}" 
                title="Vimeo video player" 
                frameborder="0" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen
              ></iframe>
            </div>
          </div>
        `
      }
    }
    // If not recognized, create a placeholder with the URL
    else {
      embedHtml = `
        <div class="video-placeholder p-4 bg-muted rounded-md text-center my-4">
          <p>Video: ${videoUrl}</p>
        </div>
      `
    }

    if (editorRef.current && embedHtml) {
      editorRef.current.innerHTML += embedHtml
      handleContentChange(editorRef.current.innerHTML)

      setVideoUrl("")
      setVideoDialogOpen(false)

      toast({
        title: "Video added",
        description: "Video embed has been added to your content",
      })
    }
  }

  // Handle HTML mode changes
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    handleContentChange(newContent)
    setIsEditorInitialized(false) // Reset so editor will update when switching back
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="title">Item Title</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={handleTitleChange} 
          className="text-lg font-medium h-12 px-4"
          placeholder="Enter item title..."
        />
      </div>

      <Tabs defaultValue="editor" value={editorMode} onValueChange={setEditorMode}>
        <TabsList className="mb-6 w-auto inline-flex p-1 bg-muted/50">
          <TabsTrigger value="editor" className="text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Visual Editor
          </TabsTrigger>
          <TabsTrigger value="html" className="text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Code View
          </TabsTrigger>
          <TabsTrigger value="json" className="text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            JSON Structure
          </TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <Card className="shadow-sm border-muted">
            <CardContent className="p-0">
              <div className="border-b p-2 bg-muted/30 flex flex-wrap gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("bold")}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("italic")}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("underline")}>
                  <Underline className="h-4 w-4" />
                </Button>
                <span className="w-px h-8 bg-border mx-1"></span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("formatBlock", "<h1>")}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("formatBlock", "<h2>")}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("formatBlock", "<h3>")}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                <span className="w-px h-8 bg-border mx-1"></span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("justifyLeft")}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("justifyCenter")}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("justifyRight")}>
                  <AlignRight className="h-4 w-4" />
                </Button>
                <span className="w-px h-8 bg-border mx-1"></span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => applyFormatting("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <span className="w-px h-8 bg-border mx-1"></span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = prompt("Enter link URL:")
                    if (url) applyFormatting("createLink", url)
                  }}
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddContentBlock("image")}>
                  <Image className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddContentBlock("video")}>
                  <FileVideo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const rows = prompt("Number of rows:", "2")
                    const cols = prompt("Number of columns:", "2")
                    if (rows && cols) {
                      let tableHtml = '<table class="border-collapse border w-full my-4"><tbody>'
                      for (let i = 0; i < Number.parseInt(rows); i++) {
                        tableHtml += "<tr>"
                        for (let j = 0; j < Number.parseInt(cols); j++) {
                          tableHtml += '<td class="border p-2">Cell</td>'
                        }
                        tableHtml += "</tr>"
                      }
                      tableHtml += "</tbody></table>"
                      if (editorRef.current) {
                        editorRef.current.innerHTML += tableHtml
                        handleContentChange(editorRef.current.innerHTML)
                      }
                    }
                  }}
                >
                  <Table className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const code = prompt("Enter code:")
                    if (code) {
                      const codeHtml = `<pre class="bg-muted p-4 rounded-md my-4 font-mono text-sm overflow-auto">${code}</pre>`
                      if (editorRef.current) {
                        editorRef.current.innerHTML += codeHtml
                        handleContentChange(editorRef.current.innerHTML)
                      }
                    }
                  }}
                >
                  <Code className="h-4 w-4" />
                </Button>
                <span className="w-px h-8 bg-border mx-1"></span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("undo")}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormatting("redo")}>
                  <Redo className="h-4 w-4" />
                </Button>
              </div>

              <div
                ref={editorRef}
                className="min-h-[400px] p-6 focus:outline-none focus:ring-0 overflow-auto prose prose-sm max-w-none"
                contentEditable={true}
                onInput={handleEditorInput}
                suppressContentEditableWarning={true}
              />
            </CardContent>
          </Card>

          <Dialog open={addContentDialogOpen} onOpenChange={setAddContentDialogOpen}>
            <DialogTrigger asChild>
              <div className="mt-6 flex justify-center">
                <Button variant="outline" className="gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Content Block
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Content Block</DialogTitle>
                <DialogDescription>Choose the type of content block to add to your lesson.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContentBlock("text")}>
                  <FileText className="h-8 w-8 mb-2" />
                  Text
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col"
                  onClick={() => handleAddContentBlock("heading")}
                >
                  <Heading2 className="h-8 w-8 mb-2" />
                  Heading
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContentBlock("list")}>
                  <List className="h-8 w-8 mb-2" />
                  List
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContentBlock("image")}>
                  <Image className="h-8 w-8 mb-2" />
                  Image
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContentBlock("video")}>
                  <FileVideo className="h-8 w-8 mb-2" />
                  Video
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Video</DialogTitle>
                <DialogDescription>Enter a YouTube or Vimeo URL to embed a video in your content.</DialogDescription>
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
                  <p className="text-sm text-muted-foreground">
                    Supports YouTube (youtube.com, youtu.be) and Vimeo (vimeo.com) URLs.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddVideo}>Add Video</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="html">
          <Card className="shadow-sm border-muted">
            <CardContent className="p-0">
              <div className="bg-muted/30 p-3 border-b">
                <Label htmlFor="editor-format" className="text-sm font-medium">Format</Label>
                <div className="flex gap-2 mt-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn("text-xs", editorMode === "html" && "bg-primary/10")}
                    onClick={() => setEditorMode("html")}
                  >
                    HTML
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn("text-xs", editorMode === "json" && "bg-primary/10")}
                    onClick={() => {
                      try {
                        // Format JSON for readability
                        const parsed = JSON.parse(content);
                        setContent(JSON.stringify(parsed, null, 2));
                        setEditorMode("json");
                      } catch (e) {
                        toast({
                          title: "Invalid JSON",
                          description: "The content cannot be parsed as JSON",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    JSON
                  </Button>
                </div>
              </div>
              <textarea
                className="w-full h-[400px] font-mono text-sm p-6 border-0 focus:outline-none focus:ring-0"
                value={content}
                onChange={handleHtmlChange}
                placeholder={editorMode === "html" ? "<p>Enter HTML here...</p>" : '{"type":"doc","content":[{"type":"paragraph"}]}'}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="json">
          <Card className="shadow-sm border-muted">
            <CardContent className="p-0">
              <div className="bg-muted/30 p-3 border-b flex justify-between items-center">
                <Label htmlFor="json-editor" className="text-sm font-medium">JSON Structure</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      try {
                        // Format JSON for readability
                        const parsed = JSON.parse(content);
                        setContent(JSON.stringify(parsed, null, 2));
                        toast({
                          title: "JSON Formatted",
                          description: "The JSON structure has been formatted",
                        });
                      } catch (e) {
                        toast({
                          title: "Invalid JSON",
                          description: "The content cannot be parsed as JSON",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Format JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setEditorMode("html")}
                  >
                    Switch to HTML
                  </Button>
                </div>
              </div>
              <textarea
                id="json-editor"
                className="w-full h-[400px] font-mono text-sm p-6 border-0 focus:outline-none focus:ring-0 bg-muted/5"
                value={content}
                onChange={handleHtmlChange}
                placeholder='{"type":"doc","content":[{"type":"paragraph"}]}'
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Saving changes...</span>
        </div>
      )}
    </div>
  )
}

