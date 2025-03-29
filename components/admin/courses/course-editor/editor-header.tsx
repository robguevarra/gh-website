import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface EditorHeaderProps {
  viewMode: "editor" | "student"
  setViewMode: (mode: "editor" | "student") => void
  onSave: () => void
  onPublish: () => void
  savedState: string
}

export default function EditorHeader({
  viewMode,
  setViewMode,
  onSave,
  onPublish,
  savedState,
}: EditorHeaderProps) {
  return (
    <header className="border-b px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant={viewMode === "editor" ? "default" : "outline"}
            onClick={() => setViewMode("editor")}
          >
            Editor
          </Button>
          <Button
            variant={viewMode === "student" ? "default" : "outline"}
            onClick={() => setViewMode("student")}
          >
            Student View
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {savedState === "saving" ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : savedState === "saved" ? (
              "All changes saved"
            ) : (
              "Unsaved changes"
            )}
          </span>
          <Button variant="outline" onClick={onSave}>
            Save
          </Button>
          <Button onClick={onPublish}>Publish</Button>
        </div>
      </div>
    </header>
  )
} 