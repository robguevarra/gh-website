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
import { useCourseStore } from "@/lib/stores/course"
import type { Course, Module, Lesson } from "@/lib/stores/course/types"
import { Loader2 } from "lucide-react"
import { debounce } from "lodash"
import { ErrorBoundary } from "./error-boundary"

// Define module and item types
export interface ModuleItem {
  id: string
  title: string
  type: "lesson" | "video" | "quiz" | "assignment"
  content?: string
  content_json?: {
    content: string
    type: string
    version: number
  }
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
  courseId: string
  currentContent: string | null
  setCurrentContent: (content: string) => void
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
  const [currentContent, setCurrentContent] = useState<string | null>(null)
  const { toast } = useToast()

  // Load data from the course store
  const {
    course,
    modules,
    updateCourse,
    isLoading,
    error,
    selectedModuleId: activeModuleId,
    selectedLessonId: activeItemId,
    selectModule: setActiveModuleId,
    selectLesson: setActiveItemId,
    expandedModules,
    fetchCourse
  } = useCourseStore()

  // Fetch course data on mount and handle course ID changes
  useEffect(() => {
    if (!courseId) return;

    const controller = new AbortController();
    let isSubscribed = true;

    const initializeCourse = async () => {
      try {
        // Only fetch if we don't have the course or if it's a different course
        if (!course || course.id !== courseId) {
          console.log('🔄 [CourseEditor] Initializing course:', courseId);
          await fetchCourse(courseId, controller.signal);
        }
      } catch (error: unknown) {
        // Only handle non-abort errors when still subscribed
        if (error instanceof Error && error.name !== 'AbortError' && isSubscribed) {
          console.error('❌ [CourseEditor] Failed to fetch course:', error);
          toast({
            title: "Error",
            description: "Failed to load course data. Please try refreshing the page.",
            variant: "destructive",
          });
        }
      }
    };

    // Start initialization
    initializeCourse();

    // Cleanup function
    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [courseId, course?.id, fetchCourse, toast]);

  // Set initial selection if none exists
  useEffect(() => {
    if (!activeModuleId && modules.length > 0) {
      const firstModule = modules[0]
      setActiveModuleId(firstModule.id)

      const items = firstModule.items || []
      if (items.length > 0) {
        setActiveItemId(items[0].id)
      }
    }
  }, [modules, activeModuleId, activeItemId, setActiveModuleId, setActiveItemId])

  // Update content in context when lesson changes
  useEffect(() => {
    if (!activeModuleId || !activeItemId) {
      // Reset content if no lesson is selected
      setCurrentContent('');
      return;
    }

    // Find the lesson in the modules array first (more reliable)
    let foundLesson = null;
    for (const module of modules) {
      if (module.id === activeModuleId) {
        foundLesson = module.lessons?.find(l => l.id === activeItemId);
        break;
      }
    }

    // If not found in modules, try the course object as fallback
    if (!foundLesson && course) {
      const module = course.modules?.find(m => m.id === activeModuleId);
      foundLesson = module?.lessons?.find(l => l.id === activeItemId);
    }

    if (foundLesson) {
      // Set content with fallbacks to ensure we always have something to display
      const content = foundLesson.content_json?.content || foundLesson.content || '<p>New content</p>';
      console.log('📝 [CourseEditor] Setting content for lesson:', {
        lessonId: activeItemId,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
      });
      setCurrentContent(content);
    } else {
      console.warn('⚠️ [CourseEditor] No lesson found for ID:', activeItemId);
      // Set default content even if lesson not found
      setCurrentContent('<p>Start writing your content...</p>');
    }
  }, [course, modules, activeModuleId, activeItemId]);

  // Transform modules to EditorModule type
  const editorModules: EditorModule[] = useMemo(() => {
    // Ensure expandedModules is a Set
    const expandedModulesSet = expandedModules instanceof Set ? expandedModules : new Set(expandedModules || []);

    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description || "",
      expanded: expandedModulesSet.has(module.id),
      // Convert lessons to items for backward compatibility
      items: module.lessons?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        type: (lesson.metadata?.type as "lesson" | "video" | "quiz" | "assignment") || "lesson",
        content: lesson.content || lesson.content_json?.content || "",
        content_json: lesson.content_json,
        duration: lesson.duration || 0
      })) || []
    }))
  }, [modules, expandedModules])

  // Type guard for viewMode
  const isValidViewMode = (mode: string): mode is "editor" | "student" => {
    return mode === "editor" || mode === "student"
  }

  const handleViewModeChange = (mode: string) => {
    if (isValidViewMode(mode)) {
      setViewMode(mode)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-destructive">Error loading course: {error}</p>
          <Button onClick={() => fetchCourse(courseId)}>Try Again</Button>
        </div>
      </div>
    )
  }

  // Show not found state
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

  // Handle save functionality
  const handleSave = async () => {
    if (savedState === "saving" || !course) return

    setSavedState("saving")

    try {
      // Find the active module and lesson
      const activeModule = course.modules?.find(m => m.id === activeModuleId)
      const activeLesson = activeModule?.lessons?.find(l => l.id === activeItemId)

      if (activeLesson) {
        // Get the current content from the editor
        const contentEditor = document.querySelector('[contenteditable="true"]')
        const currentContent = contentEditor?.innerHTML || ''

        // Update lesson content and title
        await useCourseStore.getState().updateLesson(activeLesson.id, {
          content_json: {
            content: currentContent,
            type: "html",
            version: 1
          },
          title: activeLesson.title
        })
      }

      // Update course with current state
      const updatedCourse: Partial<Course> = {
        title: course.title,
        description: course.description,
        status: course.status || 'draft',
      }

      // Single update call
      await updateCourse(courseId, updatedCourse)

      setSavedState("saved")
      toast({
        title: "Changes saved",
        description: "All your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Failed to save:", error)
      setSavedState("unsaved")
      toast({
        title: "Error saving changes",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePublish = () => {
    // First save any pending changes
    handleSave()
      .then(() => {
        // Only update publish state if save was successful
        return updateCourse(courseId, { is_published: true })
      })
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
      handleSave()
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
    <ErrorBoundary>
      <CourseContext.Provider
        value={{
          modules: editorModules,
          setModules: () => {},
          activeModuleId,
          setActiveModuleId: (id: string | null) => id && setActiveModuleId(id),
          activeItemId,
          setActiveItemId: (id: string | null) => id && setActiveItemId(id),
          savedState,
          setSavedState,
          courseId,
          currentContent,
          setCurrentContent
        }}
      >
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <EditorHeader
            title={course?.title || "Untitled Course"}
            savedState={savedState}
            onPublish={handlePublish}
            onPreview={handlePreview}
            onShare={handleShare}
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
                        <ContentEditor onSave={handleSave} />
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
                            isPublished: course.is_published || false,
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
    </ErrorBoundary>
  )
}

