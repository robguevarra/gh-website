"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Save, Eye, Share2, MoreHorizontal, ArrowLeft, ArrowLeftRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface EditorHeaderProps {
  title: string
  savedState: string
  onSave: () => void
  onPublish: () => void
  onPreview: () => void
  onShare: () => void
  viewMode: "editor" | "student"
  onToggleViewMode: () => void
}

export default function EditorHeader({ 
  title, 
  savedState, 
  onSave, 
  onPublish, 
  onPreview, 
  onShare,
  viewMode,
  onToggleViewMode
}: EditorHeaderProps) {
  const { toast } = useToast()

  const handleBack = () => {
    if (savedState === "unsaved") {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        // Navigate back (in a real app, this would use router)
        window.history.back();
        toast({
          title: "Navigating back",
          description: "Returning to courses dashboard",
        })
      }
    } else {
      // Navigate back
      window.history.back();
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

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex h-16 items-center px-4 gap-4">
        <Button variant="ghost" size="icon" className="mr-2 text-muted-foreground hover:text-foreground" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>

        {savedState === "saving" && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5 py-1 h-7">
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving changes...
          </Badge>
        )}

        {savedState === "unsaved" && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 py-1 h-7">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Unsaved changes
          </Badge>
        )}

        {savedState === "saved" && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1.5 py-1 h-7">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            All changes saved
          </Badge>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onToggleViewMode}>
            <ArrowLeftRight className="h-4 w-4" />
            <span>{viewMode === "editor" ? "Student View" : "Editor View"}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
          <Button 
            size="sm" 
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90" 
            onClick={onSave}
            disabled={savedState === "saving"}
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onPublish}
          >
            <Eye className="h-4 w-4" />
            <span>Publish</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleMoreOptions("duplicate")} className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreOptions("export")} className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreOptions("archive")} className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

