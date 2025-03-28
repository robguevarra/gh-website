"use client"

import { Button } from "@/components/ui/button"
import type React from "react"
import { useState, createContext, useContext, useEffect, useMemo } from "react"
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
import { useCourseStore, type Course, type Module, type Lesson } from "@/lib/stores/course-store"
import { Loader2 } from "lucide-react"
import { debounce } from "lodash"

// Define module and item types
export interface ModuleItem {
  id: string
  title: string
  type: "lesson" | "video" | "quiz" | "assignment"
  content?: string
  duration: number
}

export interface EditorModule {
  id: string
  title: string
  description: string
  expanded?: boolean
  items: ModuleItem[]
}

// Create context for sharing module data across components
type CourseContextType = {
  modules: EditorModule[]
  setModules: React.Dispatch<React.SetStateAction<EditorModule[]>>
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

interface CourseEditorProps {
  courseId: string
}

export default function CourseEditor({ courseId }: CourseEditorProps) {
  const [activeTab, setActiveTab] = useState("content")
  const [savedState, setSavedState] = useState("saved") // 'saved', 'saving', 'unsaved'
  const [viewMode, setViewMode] = useState<"editor" | "student">("editor")
  const { toast } = useToast()
  
  // Load data from the course store
  const { course, fetchCourse, updateCourse, isLoading, error } = useCourseStore()
  
  // Use store's selection state instead of local state
  const { selectedModuleId: activeModuleId, selectedLessonId: activeItemId, selectModule: setActiveModuleId, selectLesson: setActiveItemId } = useCourseStore()
  
  // Convert course modules and lessons to the editor format only once when course changes
  const modules = useMemo(() => {
    if (!course?.modules) return []
    
    return course.modules.map((module) => {
      const items: ModuleItem[] = module.lessons?.map((lesson) => {
        // Parse content_json and extract content as string
        let contentStr = "";
        if (lesson.content_json) {
          try {
            if (typeof lesson.content_json === 'string') {
              contentStr = lesson.content_json;
            } else if (typeof lesson.content_json === 'object' && lesson.content_json !== null) {
              const content = (lesson.content_json as Record<string, unknown>).content;
              contentStr = typeof content === 'string' ? content : JSON.stringify(content || lesson.content_json);
            }
          } catch (error) {
            console.error("Error parsing content_json:", error);
            contentStr = "";
          }
        }
        
        return {
          id: lesson.id,
          title: lesson.title,
          type: "lesson",
          content: contentStr,
          duration: 0,
        };
      }) || []
      
      return {
        id: module.id,
        title: module.title,
        description: module.description || "",
        expanded: false,
        items,
      }
    })
  }, [course?.modules])
  
  // Load course data only once
  useEffect(() => {
    fetchCourse(courseId)
  }, [courseId, fetchCourse])
  
  // Set initial selection if none exists
  useEffect(() => {
    if (!activeModuleId && modules.length > 0) {
      const firstModule = modules[0]
      setActiveModuleId(firstModule.id)
      
      if (!activeItemId && firstModule.items.length > 0) {
        setActiveItemId(firstModule.items[0].id)
      }
    }
  }, [modules, activeModuleId, activeItemId, setActiveModuleId, setActiveItemId])

  // Handle editor save events with debounced save
  const debouncedSave = useMemo(() => 
    debounce(async (updatedCourse: Partial<Course>) => {
      try {
        await updateCourse(courseId, updatedCourse)
        setSavedState("saved")
      } catch (error) {
        setSavedState("unsaved")
        console.error("Save failed:", error)
      }
    }, 1000),
    [courseId, updateCourse]
  )

  useEffect(() => {
    const handleEditorSave = async () => {
      if (savedState === "saving") return
      if (!course) return
      
      setSavedState("saving")
      
      // First update the course basic info
      const updatedCourse: Partial<Course> = {
        title: course.title,
        description: course.description,
        status: course.status || 'draft', // Ensure status is included
      }
      
      try {
        // Update course first
        await updateCourse(courseId, updatedCourse)
        
        // Then update each module separately
        for (const module of modules) {
          // Ensure we send the correct module data structure
          const moduleData = {
            title: module.title,
            description: module.description || '',
            position: modules.indexOf(module),
            status: 'draft' as const // Explicitly type as const to match enum
          }
          
          await useCourseStore.getState().updateModule(module.id, moduleData)
          
          // Update each lesson in the module
          for (const item of module.items) {
            const lessonData = {
              title: item.title,
              content_json: item.content ? { content: item.content } : {},
              position: module.items.indexOf(item),
              status: 'draft' as const // Explicitly type as const to match enum
            }
            
            await useCourseStore.getState().updateLesson(item.id, lessonData)
          }
        }
        
        setSavedState("saved")
        toast({
          title: "Changes saved",
          description: "All your changes have been saved successfully.",
        })
      } catch (error) {
        setSavedState("unsaved")
        console.error("Save failed:", error)
        toast({
          title: "Error saving changes",
          description: error instanceof Error ? error.message : "Failed to save changes",
          variant: "destructive",
        })
      }
    }

    window.addEventListener("editor-save", handleEditorSave)
    return () => {
      window.removeEventListener("editor-save", handleEditorSave)
      debouncedSave.cancel()
    }
  }, [course, modules, courseId, debouncedSave])

  const handleSave = () => {
    // Prevent multiple rapid saves
    if (savedState === "saving") return

    setSavedState("saving")

    // Dispatch a custom event to trigger save in the content editor
    window.dispatchEvent(new Event("editor-save"))

    // Convert editor data back to course format
    const updatedCourse: Partial<Course> = {
      title: course?.title || "",
      description: course?.description || "",
    }
    
    // Save to backend
    updateCourse(courseId, updatedCourse)
      .then(() => {
        setSavedState("saved")
        toast({
          title: "Changes saved",
          description: "All your changes have been saved successfully.",
        })
      })
      .catch((error) => {
        setSavedState("unsaved")
        toast({
          title: "Error saving changes",
          description: error.message || "Failed to save changes. Please try again.",
          variant: "destructive",
        })
      })
  }

  const handlePublish = () => {
    // First save any pending changes
    window.dispatchEvent(new Event("editor-save"))

    setSavedState("saving")
    
    // Update course to published state
    updateCourse(courseId, { is_published: true })
      .then(() => {
        setSavedState("saved")
        toast({
          title: "Course published",
          description: "Your course has been published successfully.",
        })
      })
      .catch((error) => {
        setSavedState("unsaved")
        toast({
          title: "Error publishing course",
          description: error.message || "Failed to publish course. Please try again.",
          variant: "destructive",
        })
      })
  }

  const handlePreview = () => {
    setActiveTab("preview")
    toast({
      title: "Preview mode",
      description: "You are now viewing the course as students will see it.",
    })
  }

  const handleShare = () => {
    // Construct a share link using the course slug if available
    const shareUrl = course?.metadata?.slug 
      ? `${window.location.origin}/courses/${course.metadata.slug}`
      : `${window.location.origin}/courses/${courseId}`
      
    // Simulate copying a share link
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast({
          title: "Share link copied",
          description: "Course link has been copied to clipboard.",
        })
      })
      .catch(() => {
        toast({
          title: "Failed to copy link",
          description: "Please try again or share manually.",
          variant: "destructive",
        })
      })
  }

  const toggleViewMode = () => {
    // Save content before switching to student view
    if (viewMode === "editor") {
      window.dispatchEvent(new Event("editor-save"))
    }

    setViewMode(viewMode === "editor" ? "student" : "editor")
    toast({
      title: viewMode === "editor" ? "Student View" : "Editor View",
      description:
        viewMode === "editor"
          ? "You are now viewing the course as a student would see it."
          : "You are now back in editor mode.",
    })
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <p>Loading course...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-6 max-w-md mx-auto bg-destructive/10 rounded-lg text-center">
          <h2 className="text-lg font-semibold mb-2">Error Loading Course</h2>
          <p>{error}</p>
          <Button onClick={() => fetchCourse(courseId)} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }
  
  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-6 max-w-md mx-auto bg-muted rounded-lg text-center">
          <h2 className="text-lg font-semibold mb-2">Course Not Found</h2>
          <p>The requested course could not be found or you don't have permission to view it.</p>
        </div>
      </div>
    )
  }

  return (
    <CourseContext.Provider
      value={{
        modules,
        setModules: () => {},
        activeModuleId,
        setActiveModuleId: (id: string | null) => id && setActiveModuleId(id),
        activeItemId,
        setActiveItemId: (id: string | null) => id && setActiveItemId(id),
        savedState,
        setSavedState,
      }}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <EditorHeader
          title={course?.title || "Untitled Course"}
          onSave={handleSave}
          onPublish={handlePublish}
          onPreview={handlePreview}
          onShare={handleShare}
          savedState={savedState}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
        />

        {viewMode === "student" ? (
          <StudentView courseId={courseId} />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-72 border-r overflow-y-auto h-full bg-muted/10">
              <div className="p-4">
                <h2 className="font-semibold text-lg mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Course Structure
                </h2>
              </div>
              <EditorSidebar />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="border-b sticky top-0 bg-background z-10">
                  <TabsList className="mx-4 my-1">
                    <TabsTrigger value="content" className="data-[state=active]:bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="data-[state=active]:bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      Modules
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="data-[state=active]:bg-primary/10">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </div>
                <ScrollArea className="flex-1 p-6 bg-white">
                  <div className="max-w-5xl mx-auto pb-10">
                    <TabsContent value="content" className="mt-0 h-full">
                      <ContentEditor />
                    </TabsContent>
                    <TabsContent value="modules" className="mt-0">
                      <ModuleManager />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-0">
                      <SettingsPanel 
                        courseId={courseId}
                        initialData={{
                          title: course.title,
                          description: course.description || "",
                          isPublished: course.is_published,
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0">
                      <CoursePreview />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </CourseContext.Provider>
  )
}

