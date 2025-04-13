"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext } from "./course-editor"
import { useCourseStore } from "@/lib/stores/course"
import { VideoEmbedField, extractVimeoId } from "./video-embed-field"

interface LessonSettingsPanelProps {
  lessonId: string
}

export default function LessonSettingsPanel({ lessonId }: LessonSettingsPanelProps) {
  const { toast } = useToast()
  const { setSavedState } = useCourseContext()
  const { updateLesson, selectedModuleId, selectedLessonId, modules } = useCourseStore()

  // Find the current lesson - search in all modules in case the lesson is in a different module
  const currentLesson = useMemo(() => {
    // First try to find in the selected module (most common case)
    const lessonInSelectedModule = modules
      .find(m => m.id === selectedModuleId)
      ?.lessons?.find(l => l.id === lessonId);

    if (lessonInSelectedModule) return lessonInSelectedModule;

    // If not found, search in all modules
    for (const module of modules) {
      const lesson = module.lessons?.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }

    return undefined;
  }, [modules, selectedModuleId, lessonId])

  // Define type for lesson metadata
  type LessonMetadata = {
    type?: string
    duration?: number
    videoUrl?: string
    videoId?: string
    videoType?: string
    downloadable?: boolean
    requireCompletion?: boolean
    completionThreshold?: number
  }

  // Initialize form state from lesson data
  const [formState, setFormState] = useState({
    title: currentLesson?.title || "",
    description: currentLesson?.description || "",
    type: ((currentLesson?.metadata as LessonMetadata)?.type) || "video",
    duration: ((currentLesson?.metadata as LessonMetadata)?.duration) || 15,
    videoUrl: ((currentLesson?.metadata as LessonMetadata)?.videoUrl) || "",
    downloadable: ((currentLesson?.metadata as LessonMetadata)?.downloadable) || false,
    requireCompletion: ((currentLesson?.metadata as LessonMetadata)?.requireCompletion) || true,
    completionThreshold: ((currentLesson?.metadata as LessonMetadata)?.completionThreshold) || 95,
  })

  // Update form state when lesson data changes
  useEffect(() => {
    if (currentLesson) {
      const metadata = currentLesson.metadata as LessonMetadata || {}

      setFormState({
        title: currentLesson.title || "",
        description: currentLesson.description || "",
        type: metadata.type || "video",
        duration: metadata.duration || 15,
        videoUrl: metadata.videoUrl || "",
        downloadable: metadata.downloadable || false,
        requireCompletion: metadata.requireCompletion !== false, // Default to true
        completionThreshold: metadata.completionThreshold || 95,
      })
    }
  }, [currentLesson, lessonId])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormState({
      ...formState,
      [field]: value,
    })
    setSavedState("unsaved")
  }

  const handleVideoChange = (url: string) => {
    handleInputChange("videoUrl", url)
  }

  const handleVideoIdChange = (videoId: string | null) => {
    // This is handled in the save function, but we could update the form state here if needed
    setSavedState("unsaved")
  }

  const handleSaveSettings = async () => {
    if (!currentLesson) return

    setSavedState("saving")

    try {
      // Prepare metadata object
      const currentMetadata = currentLesson.metadata as LessonMetadata || {}

      const metadata: LessonMetadata = {
        ...currentMetadata,
        type: formState.type,
        duration: formState.duration,
        videoUrl: formState.videoUrl,
        videoId: extractVimeoId(formState.videoUrl),
        videoType: "vimeo", // Currently only supporting Vimeo
        downloadable: formState.downloadable,
        requireCompletion: formState.requireCompletion,
        completionThreshold: formState.completionThreshold,
      }

      // Update lesson with new data
      await updateLesson(lessonId, {
        title: formState.title,
        description: formState.description,
        metadata: metadata as Record<string, unknown>
      })

      setSavedState("saved")
      toast({
        title: "Lesson settings saved",
        description: "Your lesson settings have been updated successfully.",
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

  if (!currentLesson) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Select a lesson to edit its settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lesson Settings</h2>
        <p className="text-muted-foreground">Configure settings for this lesson</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="completion">Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Information</CardTitle>
              <CardDescription>Basic information about this lesson</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Lesson Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formState.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Lesson Type</Label>
                  <Select value={formState.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select lesson type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="240"
                    value={formState.duration}
                    onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 15)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
              <CardDescription>Configure the video for this lesson</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VideoEmbedField
                value={formState.videoUrl}
                onChange={handleVideoChange}
                onVideoIdChange={handleVideoIdChange}
              />

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="downloadable">Downloadable</Label>
                  <p className="text-sm text-muted-foreground">Allow students to download this video</p>
                </div>
                <Switch
                  id="downloadable"
                  checked={formState.downloadable}
                  onCheckedChange={(checked) => handleInputChange("downloadable", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion Settings</CardTitle>
              <CardDescription>Configure how students complete this lesson</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireCompletion">Require Completion</Label>
                  <p className="text-sm text-muted-foreground">Students must complete this lesson to progress</p>
                </div>
                <Switch
                  id="requireCompletion"
                  checked={formState.requireCompletion}
                  onCheckedChange={(checked) => handleInputChange("requireCompletion", checked)}
                />
              </div>

              {formState.type === "video" && (
                <div className="space-y-2 pt-4">
                  <Label htmlFor="completionThreshold">
                    Completion Threshold ({formState.completionThreshold}%)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Percentage of the video that must be watched to mark as complete
                  </p>
                  <Input
                    id="completionThreshold"
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={formState.completionThreshold}
                    onChange={(e) => handleInputChange("completionThreshold", parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
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
