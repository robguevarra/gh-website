"use client"

import { Button } from "@/components/ui/button"

import type React from "react"

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

// Initial course data
const initialModules: Module[] = [
  {
    id: "module-1",
    title: "Module 1: Introduction",
    description: "An introduction to the course and its objectives",
    expanded: true,
    items: [
      {
        id: "item-1",
        title: "Welcome",
        type: "lesson",
        duration: 5,
        content:
          "<p>Welcome to this comprehensive course on digital marketing. In this module, you will learn the fundamentals of digital marketing strategies and their implementation.</p><h2>Learning Objectives</h2><ul><li>Understand the core principles of digital marketing</li><li>Learn about different digital channels</li><li>Develop skills to create effective digital campaigns</li></ul>",
      },
      {
        id: "item-2",
        title: "Course Overview",
        type: "video",
        duration: 10,
        content:
          "<p>This video provides an overview of what you'll learn in this course.</p><div class='video-placeholder p-4 bg-muted rounded-md text-center my-4'>Video: Course Overview</div><p>By the end of this course, you'll have a solid understanding of digital marketing fundamentals.</p>",
      },
      {
        id: "item-3",
        title: "Getting Started",
        type: "lesson",
        duration: 15,
        content:
          "<h2>Getting Started with Digital Marketing</h2><p>Before diving into specific strategies, let's understand the digital landscape.</p><p>Digital marketing encompasses all marketing efforts that use electronic devices or the internet. Businesses leverage digital channels such as search engines, social media, email, and websites to connect with current and prospective customers.</p>",
      },
    ],
  },
  {
    id: "module-2",
    title: "Module 2: Fundamentals",
    description: "Core concepts and fundamentals",
    expanded: false,
    items: [
      {
        id: "item-4",
        title: "Key Concepts",
        type: "lesson",
        duration: 20,
        content:
          "<h2>Key Digital Marketing Concepts</h2><p>This lesson covers the fundamental concepts you need to understand.</p><ul><li><strong>SEO (Search Engine Optimization)</strong>: The process of optimizing your website to rank higher in search engine results.</li><li><strong>Content Marketing</strong>: Creating and distributing valuable content to attract and engage your target audience.</li><li><strong>Social Media Marketing</strong>: Using social media platforms to promote your products or services.</li></ul>",
      },
      {
        id: "item-5",
        title: "Demonstration",
        type: "video",
        duration: 15,
        content:
          "<p>This video demonstrates key digital marketing tools in action.</p><div class='video-placeholder p-4 bg-muted rounded-md text-center my-4'>Video: Digital Marketing Tools Demonstration</div><p>These tools will help you implement effective digital marketing campaigns.</p>",
      },
      {
        id: "item-6",
        title: "Practice Exercise",
        type: "assignment",
        duration: 30,
        content:
          "<h2>Practice Exercise: Create a Marketing Plan</h2><p>Now it's time to apply what you've learned by creating a simple digital marketing plan.</p><ol><li>Identify your target audience</li><li>Select appropriate digital channels</li><li>Outline content strategy</li><li>Define success metrics</li></ol><p>Submit your plan for review and feedback.</p>",
      },
    ],
  },
  {
    id: "module-3",
    title: "Module 3: Advanced Topics",
    description: "Advanced techniques and applications",
    expanded: false,
    items: [
      {
        id: "item-7",
        title: "Advanced Techniques",
        type: "lesson",
        duration: 25,
        content:
          "<h2>Advanced Digital Marketing Techniques</h2><p>This lesson covers more sophisticated strategies for experienced marketers.</p><p>We'll explore marketing automation, retargeting campaigns, and advanced analytics to optimize your marketing efforts.</p>",
      },
      {
        id: "item-8",
        title: "Case Study",
        type: "lesson",
        duration: 20,
        content:
          "<h2>Case Study: Successful Digital Campaign</h2><p>In this lesson, we'll analyze a highly successful digital marketing campaign.</p><p>We'll break down the strategy, execution, and results to understand what made it effective and how you can apply similar principles to your own campaigns.</p>",
      },
      {
        id: "item-9",
        title: "Final Assessment",
        type: "quiz",
        duration: 45,
        content:
          "<h2>Final Assessment</h2><p>This quiz will test your understanding of all the concepts covered in the course.</p><div class='quiz-placeholder p-4 bg-muted rounded-md text-center my-4'>Quiz: 20 questions covering all course material</div><p>You need to score at least 70% to pass and receive your certificate.</p>",
      },
    ],
  },
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
      // This will be handled by the ContentEditor component
      console.log("Editor save event received")
    }

    window.addEventListener("editor-save", handleEditorSave)

    return () => {
      window.removeEventListener("editor-save", handleEditorSave)
    }
  }, [])

  const handleSave = () => {
    setSavedState("saving")

    // Dispatch a custom event to trigger save in the content editor
    window.dispatchEvent(new Event("editor-save"))

    // Simulate saving process
    setTimeout(() => {
      setSavedState("saved")
      toast({
        title: "Changes saved",
        description: "All your changes have been saved successfully.",
      })
    }, 1500)
  }

  const handlePublish = () => {
    // First save any pending changes
    window.dispatchEvent(new Event("editor-save"))

    setSavedState("saving")
    // Simulate publishing process
    setTimeout(() => {
      setSavedState("saved")
      toast({
        title: "Course published",
        description: "Your course has been published successfully.",
      })
    }, 2000)
  }

  const handlePreview = () => {
    setActiveTab("preview")
    toast({
      title: "Preview mode",
      description: "You are now viewing the course as students will see it.",
    })
  }

  const handleShare = () => {
    // Simulate copying a share link
    navigator.clipboard
      .writeText("https://lms-example.com/courses/digital-marketing")
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

  if (viewMode === "student") {
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
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 gap-4 justify-between">
              <h1 className="text-lg font-semibold">Student View: Introduction to Digital Marketing</h1>
              <Button onClick={toggleViewMode}>Return to Editor</Button>
            </div>
          </div>
          <StudentView />
        </div>
      </CourseContext.Provider>
    )
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
          savedState={savedState}
          onSave={handleSave}
          onPublish={handlePublish}
          onPreview={toggleViewMode}
          onShare={handleShare}
        />
        <div className="flex flex-1 overflow-hidden">
          <EditorSidebar />
          <div className="flex-1 overflow-hidden">
            <Tabs
              defaultValue="content"
              className="h-full flex flex-col"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <div className="border-b px-6 py-2">
                <TabsList className="grid w-full max-w-md grid-cols-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>
              <ScrollArea className="flex-1">
                <TabsContent value="content" className="h-full p-6 data-[state=active]:flex-1">
                  <ContentEditor onSave={handleSave} />
                </TabsContent>
                <TabsContent value="modules" className="h-full p-6">
                  <ModuleManager />
                </TabsContent>
                <TabsContent value="settings" className="h-full p-6">
                  <SettingsPanel />
                </TabsContent>
                <TabsContent value="preview" className="h-full">
                  <CoursePreview />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </div>
    </CourseContext.Provider>
  )
}

