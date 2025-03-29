"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useCourseContext } from "./course-editor"
import { useToast } from "@/hooks/use-toast"

export default function StudentView() {
  const { modules, activeModuleId, setActiveModuleId, activeItemId, setActiveItemId, setSavedState } =
    useCourseContext()
  const { toast } = useToast()
  const [completedItems, setCompletedItems] = useState<string[]>([])

  // Find active module and item
  const activeModule = modules.find((m) => m.id === activeModuleId)
  const activeItem = activeModule?.items.find((i) => i.id === activeItemId)

  // Calculate course progress
  const totalItems = modules.reduce((total, module) => total + module.items.length, 0)
  const progressPercentage = Math.round((completedItems.length / totalItems) * 100)

  // Force a save before entering student view to ensure latest content is shown
  useEffect(() => {
    // Dispatch a custom event to trigger save in the content editor
    window.dispatchEvent(new Event("editor-save"))
  }, [])

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
    const currentModuleIndex = modules.findIndex((module) => module.id === activeModuleId)
    if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1]
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
    const currentModuleIndex = modules.findIndex((module) => module.id === activeModuleId)
    if (currentModuleIndex > 0) {
      const prevModule = modules[currentModuleIndex - 1]
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
              {modules.map((module) => (
                <div key={module.id} className="space-y-1">
                  <h4 className="font-medium text-sm">{module.title}</h4>
                  <ul className="space-y-1 pl-2 border-l">
                    {module.items.map((item) => (
                      <li key={item.id}>
                        <button
                          className={`flex items-center gap-2 w-full text-left p-1.5 rounded-md text-sm hover:bg-accent ${
                            activeItemId === item.id ? "bg-accent" : ""
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
        {activeItem ? (
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
                <Card>
                  <CardContent className="p-6">
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: activeItem.content || "" }} />

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

