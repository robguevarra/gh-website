"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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

interface ContentEditorProps {
  onSave: () => void
}

export default function ContentEditor({ onSave }: ContentEditorProps) {
  const { toast } = useToast()
  const { modules, setModules, activeModuleId, activeItemId, setSavedState } = useCourseContext()

  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [editorMode, setEditorMode] = useState("editor")
  const editorRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef("")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Find the active module and item
  const activeModule = modules.find((m) => m.id === activeModuleId)
  const activeItem = activeModule?.items.find((i) => i.id === activeItemId)

  const [title, setTitle] = useState(activeItem?.title || "")
  const [content, setContent] = useState(activeItem?.content || "")
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)

  // Update title and content when active item changes
  useEffect(() => {
    if (activeItem) {
      setTitle(activeItem.title)
      setContent(activeItem.content || "")
      contentRef.current = activeItem.content || ""
      setIsEditorInitialized(false) // Reset initialization flag when item changes
    }
  }, [activeItem])

  // Initialize editor content when content state changes or active item changes
  useEffect(() => {
    if (editorRef.current && editorMode === "editor" && !isEditorInitialized) {
      editorRef.current.innerHTML = content
      setIsEditorInitialized(true)
    }
  }, [content, editorMode, isEditorInitialized])

  // Save content to modules without affecting the editor
  const saveContent = () => {
    if (!activeModule || !activeItem) return

    // Get the current content from the editor
    const currentContent = editorRef.current?.innerHTML || content

    // Update the module item content
    const updatedModules = modules.map((module) => {
      if (module.id === activeModuleId) {
        const updatedItems = module.items.map((item) => {
          if (item.id === activeItemId) {
            return { ...item, content: currentContent }
          }
          return item
        })
        return { ...module, items: updatedItems }
      }
      return module
    })

    setModules(updatedModules)
    setSavedState("saving")

    // Simulate saving delay
    setTimeout(() => {
      setSavedState("saved")
    }, 1000)

    // Update the content ref to track the saved content
    contentRef.current = currentContent
  }

  // Add this useEffect to connect the onSave prop to the saveContent function
  useEffect(() => {
    // This will make the component respond to the editor-save event
    const handleSave = () => {
      saveContent()
    }

    // Create a custom event listener for save
    window.addEventListener("editor-save", handleSave)

    return () => {
      window.removeEventListener("editor-save", handleSave)
    }
  }, [activeModuleId, activeItemId])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)

    if (activeModule && activeItem) {
      // Update the module item title
      const updatedModules = modules.map((module) => {
        if (module.id === activeModuleId) {
          const updatedItems = module.items.map((item) => {
            if (item.id === activeItemId) {
              return { ...item, title: e.target.value }
            }
            return item
          })
          return { ...module, items: updatedItems }
        }
        return module
      })

      setModules(updatedModules)
      setSavedState("unsaved")
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setSavedState("unsaved")
  }

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

  // Handle editor input without resetting cursor position
  const handleEditorInput = () => {
    if (editorRef.current) {
      // Only update the content state, don't modify the DOM
      setContent(editorRef.current.innerHTML)

      // Mark as unsaved
      setSavedState("unsaved")

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set a new timeout for autosave
      saveTimeoutRef.current = setTimeout(() => {
        if (activeModule && activeItem) {
          // Update the module item content
          const updatedModules = modules.map((module) => {
            if (module.id === activeModuleId) {
              const updatedItems = module.items.map((item) => {
                if (item.id === activeItemId) {
                  return { ...item, content: editorRef.current?.innerHTML || content }
                }
                return item
              })
              return { ...module, items: updatedItems }
            }
            return module
          })

          setModules(updatedModules)
          setSavedState("saving")

          // Simulate saving delay
          setTimeout(() => {
            setSavedState("saved")
          }, 1000)
        }
      }, 2000) // Autosave after 2 seconds of inactivity
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveContent() // Save any pending changes
      }
    }
  }, [])

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Label htmlFor="title">Item Title</Label>
        <Input id="title" value={title} onChange={handleTitleChange} className="text-lg font-medium" />
      </div>

      <Tabs defaultValue="editor" value={editorMode} onValueChange={setEditorMode}>
        <TabsList className="mb-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <Card>
            <CardContent className="p-4">
              <div className="border-b pb-2 mb-4 flex flex-wrap gap-1">
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
                className="min-h-[400px] border rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-auto prose prose-sm max-w-none"
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
          <Card>
            <CardContent className="p-4">
              <textarea
                className="w-full h-[400px] font-mono text-sm p-4 border rounded-md"
                value={content}
                onChange={handleHtmlChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

