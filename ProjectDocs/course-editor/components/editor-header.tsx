"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Save, Eye, Share2, MoreHorizontal, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface EditorHeaderProps {
  savedState: string
  onSave: () => void
  onPublish: () => void
  onPreview: () => void
  onShare: () => void
}

export default function EditorHeader({ savedState, onSave, onPublish, onPreview, onShare }: EditorHeaderProps) {
  const { toast } = useToast()

  const handleBack = () => {
    if (savedState === "unsaved") {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        // Navigate back (in a real app, this would use router)
        toast({
          title: "Navigating back",
          description: "Returning to courses dashboard",
        })
      }
    } else {
      // Navigate back
      toast({
        title: "Navigating back",
        description: "Returning to courses dashboard",
      })
    }
  }

  const handleMoreOptions = (action: string) => {
    switch (action) {
      case "duplicate":
        toast({
          title: "Course duplicated",
          description: "A copy of this course has been created",
        })
        break
      case "export":
        toast({
          title: "Exporting course",
          description: "Your course is being prepared for export",
        })
        break
      case "archive":
        toast({
          title: "Course archived",
          description: "This course has been moved to archives",
        })
        break
    }
  }

  const handleSave = () => {
    // Dispatch a custom event to trigger save in the content editor
    window.dispatchEvent(new Event("editor-save"))
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="mr-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <h1 className="text-lg font-semibold">Introduction to Digital Marketing</h1>

        {savedState === "saving" && (
          <Badge variant="outline" className="ml-auto">
            Saving...
          </Badge>
        )}
        {savedState === "saved" && (
          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
            All changes saved
          </Badge>
        )}
        {savedState === "unsaved" && (
          <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">
            Unsaved changes
          </Badge>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Student View
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button size="sm" onClick={savedState === "unsaved" ? onSave : onPublish}>
            <Save className="mr-2 h-4 w-4" />
            {savedState === "unsaved" ? "Save" : "Publish"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleMoreOptions("duplicate")}>Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreOptions("export")}>Export</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreOptions("archive")}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

