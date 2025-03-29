"use client"

import { Button } from "@/components/ui/button"
import { useState, createContext, useContext, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import EditorSidebar from "./editor-sidebar"
import ContentEditor from "./content-editor"
import ModuleManager from "./module-manager"
import SettingsPanel from "./settings-panel"
import CoursePreview from "./course-preview"
import StudentView from "./student-view"
import EditorHeader from "./editor-header"

// Define module and item types
export interface ModuleItem {
  id: string
  title: string
  type: "lesson" | "video" | "quiz" | "assignment"
  content?: string
  duration: number
}

export interface Module {
  id: string
  title: string
  description: string
  expanded?: boolean
  items: ModuleItem[]
}

// Create context for sharing module data across components
type CourseContextType = {
  modules: Module[]
  setModules: React.Dispatch<React.SetStateAction<Module[]>>
  activeModuleId: string | null
  setActiveModuleId: (id: string | null) => void
  activeItemId: string | null
  setActiveItemId: (id: string | null) => void
  savedState: string
  setSavedState: (state: string) => void
}

export const CourseContext = createContext<CourseContextType | undefined>(undefined)

export function useCourseContext() {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error("useCourseContext must be used within a CourseProvider")
  }
  return context
}

// Initial course data for testing - we'll replace this with real data later
const initialModules: Module[] = [
  {
    id: "module-1",
    title: "Module 1: Introduction",
    description: "An introduction to the course",
    expanded: true,
    items: [
      {
        id: "item-1",
        title: "Welcome",
        type: "lesson",
        duration: 5,
        content: "<p>Welcome to the course.</p>"
      }
    ]
  }
]

export default function CourseEditor() {
  const [activeTab, setActiveTab] = useState("content")
  const [savedState, setSavedState] = useState("saved") // 'saved', 'saving', 'unsaved'
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [activeModuleId, setActiveModuleId] = useState<string | null>("module-1")
  const [activeItemId, setActiveItemId] = useState<string | null>("item-1")
  const [viewMode, setViewMode] = useState<"editor" | "student">("editor")
  const { toast } = useToast()

  // Set up the editor-save event listener
  useEffect(() => {
    const handleEditorSave = () => {
      console.log("Editor save event received")
    }

    window.addEventListener("editor-save", handleEditorSave)
    return () => {
      window.removeEventListener("editor-save", handleEditorSave)
    }
  }, [])

  const handleSave = () => {
    setSavedState("saving")
    window.dispatchEvent(new Event("editor-save"))
    setTimeout(() => {
      setSavedState("saved")
      toast({
        title: "Changes saved",
        description: "All your changes have been saved successfully.",
      })
    }, 1500)
  }

  const handlePublish = () => {
    window.dispatchEvent(new Event("editor-save"))
    toast({
      title: "Course published",
      description: "Your course is now live and available to students.",
    })
  }

  return (
    <CourseContext.Provider
      value={{
        modules,
        setModules,
        activeModuleId,
        setActiveModuleId,
        activeItemId,
        setActiveItemId,
        savedState,
        setSavedState,
      }}
    >
      <div className="flex h-screen flex-col">
        <EditorHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          onSave={handleSave}
          onPublish={handlePublish}
          savedState={savedState}
        />
        <div className="flex-1 overflow-hidden">
          {viewMode === "editor" ? (
            <div className="grid h-full grid-cols-[300px_1fr]">
              <EditorSidebar />
              <main className="flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                  <div className="border-b px-4">
                    <TabsList>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="modules">Modules</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                  </div>
                  <ScrollArea className="h-[calc(100vh-10rem)]">
                    <TabsContent value="content" className="m-0">
                      <ContentEditor />
                    </TabsContent>
                    <TabsContent value="modules" className="m-0">
                      <ModuleManager />
                    </TabsContent>
                    <TabsContent value="settings" className="m-0">
                      <SettingsPanel />
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </main>
            </div>
          ) : (
            <StudentView />
          )}
        </div>
      </div>
    </CourseContext.Provider>
  )
} 