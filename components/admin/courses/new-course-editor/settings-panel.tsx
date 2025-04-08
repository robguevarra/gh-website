"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext } from "./course-editor"
import { useCourseStore } from "@/lib/stores/course"

interface SettingsPanelProps {
  courseId: string
  initialData: {
    title: string
    description: string
    isPublished: boolean
  }
}

export default function SettingsPanel({ courseId, initialData }: SettingsPanelProps) {
  const { toast } = useToast()
  const { setSavedState } = useCourseContext()
  const { course, updateCourse } = useCourseStore()
  const [publishDate, setPublishDate] = useState<Date | undefined>()

  // Define type for metadata to avoid TypeScript errors
  type CourseMetadata = {
    code?: string;
    category?: string;
    level?: string;
    featured?: boolean;
    access?: string;
    prerequisites?: string;
    requirements?: {
      completeAll?: boolean;
      passQuizzes?: boolean;
      submitAssignments?: boolean;
    };
    enableCertificate?: boolean;
    discussion?: string;
    progress?: string;
    analytics?: boolean;
    publishDate?: string;
  }

  // Initialize form state from course data
  const [formState, setFormState] = useState({
    title: initialData.title,
    code: ((course?.metadata as CourseMetadata)?.code) || "",
    description: initialData.description || "",
    category: ((course?.metadata as CourseMetadata)?.category) || "general",
    level: ((course?.metadata as CourseMetadata)?.level) || "beginner",
    published: initialData.isPublished,
    featured: ((course?.metadata as CourseMetadata)?.featured) || false,
    access: ((course?.metadata as CourseMetadata)?.access) || "enrolled",
    prerequisites: ((course?.metadata as CourseMetadata)?.prerequisites) || "",
    completeAll: ((course?.metadata as CourseMetadata)?.requirements?.completeAll) || true,
    passQuizzes: ((course?.metadata as CourseMetadata)?.requirements?.passQuizzes) || false,
    submitAssignments: ((course?.metadata as CourseMetadata)?.requirements?.submitAssignments) || false,
    enableCertificate: ((course?.metadata as CourseMetadata)?.enableCertificate) || false,
    discussion: ((course?.metadata as CourseMetadata)?.discussion) || "module",
    progress: ((course?.metadata as CourseMetadata)?.progress) || "automatic",
    analytics: ((course?.metadata as CourseMetadata)?.analytics) || true,
  })

  // Update form state when course data changes
  useEffect(() => {
    if (course) {
      const metadata = course.metadata as CourseMetadata || {}

      setFormState({
        title: course.title,
        code: metadata.code || "",
        description: course.description || "",
        category: metadata.category || "general",
        level: metadata.level || "beginner",
        published: course.is_published || false,
        featured: metadata.featured || false,
        access: metadata.access || "enrolled",
        prerequisites: metadata.prerequisites || "",
        completeAll: metadata.requirements?.completeAll || true,
        passQuizzes: metadata.requirements?.passQuizzes || false,
        submitAssignments: metadata.requirements?.submitAssignments || false,
        enableCertificate: metadata.enableCertificate || false,
        discussion: metadata.discussion || "module",
        progress: metadata.progress || "automatic",
        analytics: metadata.analytics || true,
      })

      // Set publish date if available
      if (metadata.publishDate) {
        setPublishDate(new Date(metadata.publishDate))
      }
    }
  }, [course])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormState({
      ...formState,
      [field]: value,
    })
    setSavedState("unsaved")
  }

  const handleSaveSettings = async () => {
    if (!course) return

    setSavedState("saving")

    try {
      // Prepare metadata object
      const currentMetadata = course.metadata as CourseMetadata || {}

      const metadata: CourseMetadata = {
        ...currentMetadata,
        code: formState.code,
        category: formState.category,
        level: formState.level,
        featured: formState.featured,
        access: formState.access,
        prerequisites: formState.prerequisites,
        requirements: {
          completeAll: formState.completeAll,
          passQuizzes: formState.passQuizzes,
          submitAssignments: formState.submitAssignments
        },
        enableCertificate: formState.enableCertificate,
        discussion: formState.discussion,
        progress: formState.progress,
        analytics: formState.analytics
      }

      // Add publish date if set
      if (publishDate) {
        metadata.publishDate = publishDate.toISOString()
      }

      // Update course with new data
      await updateCourse(courseId, {
        title: formState.title,
        description: formState.description,
        is_published: formState.published,
        metadata: metadata as Record<string, unknown>
      })

      setSavedState("saved")
      toast({
        title: "Settings saved",
        description: "Your course settings have been updated successfully.",
      })
    } catch (error) {
      setSavedState("unsaved")
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    }
  }

  const handleImageChange = () => {
    // In a real implementation, this would open a file picker
    toast({
      title: "Image upload",
      description: "Course image upload functionality would open here",
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Course Settings</h2>
        <p className="text-muted-foreground">Configure your course settings and publishing options</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>Basic information about your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title</Label>
                  <Input
                    id="title"
                    value={formState.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Course Code</Label>
                  <Input id="code" value={formState.code} onChange={(e) => handleInputChange("code", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formState.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formState.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select value={formState.level} onValueChange={(value) => handleInputChange("level", value)}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Image</CardTitle>
              <CardDescription>Upload a cover image for your course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-40 h-24 bg-muted rounded-md flex items-center justify-center">
                  <img
                    src="/placeholder.svg?height=96&width=160"
                    alt="Course cover"
                    className="max-w-full max-h-full object-cover rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={handleImageChange}>
                    Change Image
                  </Button>
                  <p className="text-xs text-muted-foreground">Recommended size: 1280x720px (16:9 ratio)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Settings</CardTitle>
              <CardDescription>Control who can see and access your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="published">Published</Label>
                  <p className="text-sm text-muted-foreground">Make this course available to students</p>
                </div>
                <Switch
                  id="published"
                  checked={formState.published}
                  onCheckedChange={(checked) => handleInputChange("published", checked)}
                  aria-label="Published status"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="featured">Featured Course</Label>
                  <p className="text-sm text-muted-foreground">Highlight this course on the homepage</p>
                </div>
                <Switch
                  id="featured"
                  checked={formState.featured}
                  onCheckedChange={(checked) => handleInputChange("featured", checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="access">Access Control</Label>
                <Select value={formState.access} onValueChange={(value) => handleInputChange("access", value)}>
                  <SelectTrigger id="access">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Anyone can view)</SelectItem>
                    <SelectItem value="enrolled">Enrolled Students Only</SelectItem>
                    <SelectItem value="password">Password Protected</SelectItem>
                    <SelectItem value="private">Private (Invitation Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule Publishing</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !publishDate && "text-muted-foreground")}
                        onClick={() => setSavedState("unsaved")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {publishDate ? format(publishDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={publishDate}
                        onSelect={(newDate) => {
                          setPublishDate(newDate)
                          setSavedState("unsaved")
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Requirements</CardTitle>
              <CardDescription>Set prerequisites and completion criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prerequisites">Prerequisites</Label>
                <Textarea
                  id="prerequisites"
                  rows={3}
                  value={formState.prerequisites}
                  onChange={(e) => handleInputChange("prerequisites", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completion">Completion Requirements</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="complete-all"
                      checked={formState.completeAll}
                      onCheckedChange={(checked) => handleInputChange("completeAll", checked)}
                    />
                    <Label htmlFor="complete-all">Complete all modules</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="pass-quizzes"
                      checked={formState.passQuizzes}
                      onCheckedChange={(checked) => handleInputChange("passQuizzes", checked)}
                    />
                    <Label htmlFor="pass-quizzes">Pass all quizzes (minimum 70%)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="submit-assignments"
                      checked={formState.submitAssignments}
                      onCheckedChange={(checked) => handleInputChange("submitAssignments", checked)}
                    />
                    <Label htmlFor="submit-assignments">Submit all assignments</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate">Certificate</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="enable-certificate"
                    checked={formState.enableCertificate}
                    onCheckedChange={(checked) => handleInputChange("enableCertificate", checked)}
                  />
                  <Label htmlFor="enable-certificate">Enable course completion certificate</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Additional configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discussion">Discussion Settings</Label>
                <Select value={formState.discussion} onValueChange={(value) => handleInputChange("discussion", value)}>
                  <SelectTrigger id="discussion">
                    <SelectValue placeholder="Select discussion setting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Course-wide discussions</SelectItem>
                    <SelectItem value="module">Module-level discussions</SelectItem>
                    <SelectItem value="lesson">Lesson-level discussions</SelectItem>
                    <SelectItem value="disabled">Disable discussions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="progress">Progress Tracking</Label>
                <Select value={formState.progress} onValueChange={(value) => handleInputChange("progress", value)}>
                  <SelectTrigger id="progress">
                    <SelectValue placeholder="Select progress tracking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic (mark as complete when viewed)</SelectItem>
                    <SelectItem value="manual">Manual (students mark as complete)</SelectItem>
                    <SelectItem value="quiz">Quiz-based (complete after passing quiz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Enable Analytics</Label>
                  <p className="text-sm text-muted-foreground">Track student progress and engagement</p>
                </div>
                <Switch
                  id="analytics"
                  checked={formState.analytics}
                  onCheckedChange={(checked) => handleInputChange("analytics", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setSavedState("saved")}>
          Cancel
        </Button>
        <Button onClick={handleSaveSettings}>Save Settings</Button>
      </div>
    </div>
  )
}

