"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  BookOpen,
  Video,
  FileText,
  File,
  Home,
  BarChart,
  Settings,
  MessageSquare,
  Loader2
} from "lucide-react"
import { useCourseContext } from "./course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { useToast } from "@/hooks/use-toast"
// Import removed as we're using dangerouslySetInnerHTML directly

interface StudentViewProps {
  courseId: string
}

// Define a type for lesson items in student view
interface LessonItem {
  id: string
  title: string
  type: string
  content: string
}

// Define a type for modules in student view
interface StudentModule {
  id: string
  title: string
  items: LessonItem[]
}

export default function StudentView({ courseId }: StudentViewProps) {
  const { activeModuleId, setActiveModuleId, activeItemId, setActiveItemId, setSavedState, currentContent } =
    useCourseContext()
  const { course, selectedModuleId, selectedLessonId, isLoading } = useCourseStore()
  const { toast } = useToast()
  const [completedItems, setCompletedItems] = useState<string[]>([])

  // Transform course modules and lessons into the format expected by the student view
  const studentModules = useMemo(() => {
    if (!course?.modules) return []

    return course.modules.map(module => ({
      id: module.id,
      title: module.title,
      items: module.lessons?.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        type: lesson.metadata?.type as string || "lesson",
        content: lesson.content_json?.content as string || lesson.content || ""
      })) || []
    }))
  }, [course])

  // Find active module and item
  const activeModule = studentModules.find((m) => m.id === (activeModuleId || selectedModuleId))
  const activeItem = activeModule?.items.find((i) => i.id === (activeItemId || selectedLessonId))

  // Calculate course progress
  const totalItems = studentModules.reduce((total, module) => total + module.items.length, 0)
  const progressPercentage = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0

  // Force a save before entering student view to ensure latest content is shown
  useEffect(() => {
    // Dispatch a custom event to trigger save in the content editor
    window.dispatchEvent(new Event("editor-save"))

    // Set active module and item if not already set
    if (!activeModuleId && selectedModuleId) {
      setActiveModuleId(selectedModuleId)
    }

    if (!activeItemId && selectedLessonId) {
      setActiveItemId(selectedLessonId)
    }
  }, [activeModuleId, activeItemId, selectedModuleId, selectedLessonId, setActiveModuleId, setActiveItemId])

  const markAsComplete = () => {
    if (activeItemId && !completedItems.includes(activeItemId)) {
      setCompletedItems([...completedItems, activeItemId])
      toast({
        title: "Item completed",
        description: "Your progress has been updated.",
      })
    }
  }

  const navigateToNextItem = () => {
    if (!activeModule || !activeItemId) return

    const currentItemIndex = activeModule.items.findIndex((item) => item.id === activeItemId)

    // If there's a next item in the current module
    if (currentItemIndex < activeModule.items.length - 1) {
      setActiveItemId(activeModule.items[currentItemIndex + 1].id)
      return
    }

    // If we need to go to the next module
    const currentModuleIndex = studentModules.findIndex((module) => module.id === activeModuleId)
    if (currentModuleIndex < studentModules.length - 1) {
      const nextModule = studentModules[currentModuleIndex + 1]
      if (nextModule.items.length > 0) {
        setActiveModuleId(nextModule.id)
        setActiveItemId(nextModule.items[0].id)
      }
    }
  }

  const navigateToPrevItem = () => {
    if (!activeModule || !activeItemId) return

    const currentItemIndex = activeModule.items.findIndex((item) => item.id === activeItemId)

    // If there's a previous item in the current module
    if (currentItemIndex > 0) {
      setActiveItemId(activeModule.items[currentItemIndex - 1].id)
      return
    }

    // If we need to go to the previous module
    const currentModuleIndex = studentModules.findIndex((module) => module.id === activeModuleId)
    if (currentModuleIndex > 0) {
      const prevModule = studentModules[currentModuleIndex - 1]
      if (prevModule.items.length > 0) {
        setActiveModuleId(prevModule.id)
        setActiveItemId(prevModule.items[prevModule.items.length - 1].id)
      }
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return <FileText className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "quiz":
      case "assignment":
        return <File className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Course Progress</h2>
            <span className="text-sm font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="p-4 border-b">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Dashboard", description: "Navigating to course dashboard" })}
          >
            <Home className="mr-2 h-4 w-4" />
            Course Dashboard
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <h3 className="font-medium mb-2">Course Content</h3>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading course content...</span>
                </div>
              ) : studentModules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No course content available.</p>
                </div>
              ) : studentModules.map((module) => (
                <div key={module.id} className="space-y-1">
                  <h4 className="font-medium text-sm">{module.title}</h4>
                  <ul className="space-y-1 pl-2 border-l">
                    {module.items.length === 0 ? (
                      <li className="text-xs text-muted-foreground pl-2">No lessons in this module</li>
                    ) : module.items.map((item) => (
                      <li key={item.id}>
                        <button
                          className={`flex items-center gap-2 w-full text-left p-1.5 rounded-md text-sm hover:bg-accent ${
                            (activeItemId === item.id || selectedLessonId === item.id) ? "bg-accent" : ""
                          }`}
                          onClick={() => {
                            setActiveModuleId(module.id)
                            setActiveItemId(item.id)
                          }}
                        >
                          {completedItems.includes(item.id) ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          {getItemIcon(item.type)}
                          <span className="truncate">{item.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => toast({ title: "Discussions", description: "Opening course discussions" })}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Discussions
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => toast({ title: "Progress", description: "Viewing detailed progress" })}
          >
            <BarChart className="mr-2 h-4 w-4" />
            My Progress
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => toast({ title: "Settings", description: "Opening course settings" })}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-xl font-semibold mb-2">Loading course content</h2>
              <p className="text-muted-foreground">Please wait while we load your course content.</p>
            </div>
          </div>
        ) : activeItem ? (
          <>
            <div className="border-b p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{activeModule?.title}</div>
                  <h1 className="text-xl font-semibold">{activeItem.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={navigateToPrevItem}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={navigateToNextItem}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto">
                <Card className="shadow-md border-muted">
                  <CardContent className="p-6 md:p-8">
                    <div
                      className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none rich-text-content"
                      dangerouslySetInnerHTML={{ __html: activeItem.content || "" }}
                    />
                    <script src="https://player.vimeo.com/api/player.js"></script>
                    <style jsx global>{`
                      .rich-text-content h1 {
                        font-size: 1.8em;
                        font-weight: bold;
                        margin-top: 1em;
                        margin-bottom: 0.5em;
                      }
                      .rich-text-content h2 {
                        font-size: 1.5em;
                        font-weight: bold;
                        margin-top: 1em;
                        margin-bottom: 0.5em;
                      }
                      .rich-text-content h3 {
                        font-size: 1.3em;
                        font-weight: bold;
                        margin-top: 1em;
                        margin-bottom: 0.5em;
                      }
                      .rich-text-content p {
                        margin-bottom: 1em;
                      }
                      .rich-text-content ul {
                        list-style-type: disc;
                        padding-left: 1.5em;
                        margin: 1em 0;
                      }
                      .rich-text-content ol {
                        list-style-type: decimal;
                        padding-left: 1.5em;
                        margin: 1em 0;
                      }
                      .rich-text-content li {
                        margin-bottom: 0.5em;
                      }
                      .rich-text-content blockquote {
                        border-left: 4px solid #e2e8f0;
                        padding-left: 1em;
                        margin: 1em 0;
                        font-style: italic;
                      }
                      .rich-text-content a {
                        color: #3182ce;
                        text-decoration: underline;
                      }
                      .rich-text-content img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 0.5rem;
                      }
                      .rich-text-content pre {
                        background-color: #f7fafc;
                        padding: 1em;
                        border-radius: 0.5rem;
                        overflow-x: auto;
                        margin: 1em 0;
                      }
                      .rich-text-content code {
                        background-color: #f7fafc;
                        padding: 0.2em 0.4em;
                        border-radius: 0.25rem;
                        font-family: monospace;
                      }

                      /* Vimeo embed styling */
                      .rich-text-content .vimeo-embed {
                        margin: 1.5em 0;
                        border-radius: 0.5rem;
                        overflow: hidden;
                      }
                    `}</style>

                    {activeItem.type === "quiz" && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <h3 className="font-medium">Sample Quiz Question</h3>
                        <p>Which of the following is NOT a type of digital marketing?</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="radio" id="option1" name="quiz" />
                            <label htmlFor="option1">Search Engine Optimization (SEO)</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="radio" id="option2" name="quiz" />
                            <label htmlFor="option2">Social Media Marketing</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="radio" id="option3" name="quiz" />
                            <label htmlFor="option3">Television Commercial Production</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="radio" id="option4" name="quiz" />
                            <label htmlFor="option4">Email Marketing</label>
                          </div>
                        </div>
                        <Button
                          className="mt-4"
                          onClick={() =>
                            toast({ title: "Quiz submitted", description: "Your answer has been recorded" })
                          }
                        >
                          Submit Answer
                        </Button>
                      </div>
                    )}

                    {activeItem.type === "assignment" && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <h3 className="font-medium">Assignment Submission</h3>
                        <p>Upload your completed assignment or paste a link to your work.</p>
                        <div className="border-2 border-dashed rounded-md p-6 text-center">
                          <p className="text-muted-foreground mb-2">Drag and drop your file here, or click to browse</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast({ title: "File browser", description: "Opening file browser" })}
                          >
                            Choose File
                          </Button>
                        </div>
                        <div className="pt-2">
                          <Button
                            onClick={() =>
                              toast({
                                title: "Assignment submitted",
                                description: "Your work has been submitted for review",
                              })
                            }
                          >
                            Submit Assignment
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {completedItems.includes(activeItemId || "") ? (
                      <Button variant="outline" disabled>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Completed
                      </Button>
                    ) : (
                      <Button onClick={markAsComplete}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={navigateToPrevItem}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button onClick={navigateToNextItem}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No content selected</h2>
              <p className="text-muted-foreground">Select a lesson from the sidebar to start learning.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

