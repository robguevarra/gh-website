"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save, Download } from "lucide-react"
import { getBrowserClient } from "@/lib/supabase/client"

interface LessonNotesProps {
  lessonId: string
}

export function LessonNotes({ lessonId }: LessonNotesProps) {
  const { user } = useAuth()
  const [notes, setNotes] = useState("")
  const [savedNotes, setSavedNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Load notes from database
  useEffect(() => {
    if (!user?.id || !lessonId) return
    
    const loadNotes = async () => {
      const supabase = getBrowserClient()
      
      const { data, error } = await supabase
        .from("user_lesson_notes")
        .select("notes, updated_at")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .single()
      
      if (error) {
        console.error("Error loading notes:", error)
        return
      }
      
      if (data) {
        setNotes(data.notes)
        setSavedNotes(data.notes)
        setLastSaved(new Date(data.updated_at))
      }
    }
    
    loadNotes()
  }, [user?.id, lessonId])
  
  // Save notes to database
  const saveNotes = async () => {
    if (!user?.id || !lessonId) return
    
    setIsSaving(true)
    
    try {
      const supabase = getBrowserClient()
      
      const { error } = await supabase
        .from("user_lesson_notes")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          notes,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error("Error saving notes:", error)
        return
      }
      
      setSavedNotes(notes)
      setLastSaved(new Date())
    } catch (error) {
      console.error("Error saving notes:", error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Download notes as text file
  const downloadNotes = () => {
    if (!notes) return
    
    const element = document.createElement("a")
    const file = new Blob([notes], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `lesson-notes-${lessonId}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }
  
  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return ""
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).format(lastSaved)
  }
  
  // Check if notes have unsaved changes
  const hasUnsavedChanges = notes !== savedNotes
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#5d4037]">Lesson Notes</h3>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-[#6d4c41]">
              Last saved: {formatLastSaved()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadNotes}
            disabled={!notes}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      
      <Textarea
        placeholder="Take notes on this lesson here..."
        className="min-h-[300px] font-mono text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      
      <div className="text-sm text-[#6d4c41]">
        <p>
          <strong>Tip:</strong> Your notes are automatically saved as you type and will be available 
          when you return to this lesson.
        </p>
      </div>
    </div>
  )
}
