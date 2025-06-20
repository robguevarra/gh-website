"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Video, Clock, Award, Users, BookOpen } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext } from "./course-editor"

export default function CoursePreview() {
  const { toast } = useToast()
  const { modules } = useCourseContext()
  const [viewMode, setViewMode] = useState("desktop")

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode)
    toast({
      title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} view`,
      description: `Switched to ${mode} preview mode`,
    })
  }

  const handleOpenInNewTab = () => {
    toast({
      title: "Preview in new tab",
      description: "Opening preview in a new browser tab",
    })
    // In a real implementation, this would open a new tab with the preview
    window.open("#", "_blank")
  }

  const getPreviewClass = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px] mx-auto border shadow-sm"
      case "tablet":
        return "max-w-[768px] mx-auto border shadow-sm"
      default:
        return "max-w-4xl mx-auto"
    }
  }

  const handleEnroll = () => {
    toast({
      title: "Enrollment simulation",
      description: "In a real course, this would enroll the student",
    })
  }

  // Calculate total course duration
  const totalDuration = modules.reduce((total, module) => {
    return total + module.items.reduce((moduleTotal, item) => moduleTotal + item.duration, 0)
  }, 0)

  // Calculate total lessons
  const totalLessons = modules.reduce((total, module) => total + module.items.length, 0)

  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("desktop")}
          >
            Desktop
          </Button>
          <Button
            variant={viewMode === "tablet" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("tablet")}
          >
            Tablet
          </Button>
          <Button
            variant={viewMode === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewModeChange("mobile")}
          >
            Mobile
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
          Open in New Tab
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-background p-6">
        <div className={getPreviewClass()}>
          <div className="space-y-8">
            {/* Course Header */}
            <div className="space-y-4">
              <Badge className="mb-2">Marketing</Badge>
              <h1 className="text-3xl font-bold">Introduction to Digital Marketing</h1>
              <p className="text-muted-foreground">
                A comprehensive introduction to digital marketing concepts, strategies, and implementation. Learn how to
                create effective campaigns across various digital channels.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{Math.round(totalDuration / 60)} hours</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>156 enrolled</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>Certificate</span>
                </div>
              </div>
            </div>

            <div className={`grid ${viewMode === "mobile" ? "" : "md:grid-cols-3"} gap-6`}>
              <div className={`${viewMode === "mobile" ? "order-2" : "md:col-span-2"} space-y-6`}>
                {/* Course Description */}
                <Card>
                  <CardContent className="p-6">
                    <Tabs defaultValue="overview">
                      <TabsList className="mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                        <TabsTrigger value="instructor">Instructor</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-2">About This Course</h3>
                          <p>
                            Digital marketing is one of the most in-demand skills in today's job market. This course
                            will teach you the fundamentals of digital marketing, including search engine optimization
                            (SEO), social media marketing, email marketing, and content marketing.
                          </p>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-2">What You'll Learn</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Understand the core principles of digital marketing</li>
                            <li>Create effective digital marketing strategies</li>
                            <li>Implement campaigns across various digital channels</li>
                            <li>Analyze and optimize campaign performance</li>
                            <li>Stay updated with the latest digital marketing trends</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-2">Prerequisites</h3>
                          <p>
                            Basic computer skills and familiarity with social media platforms. No prior marketing
                            experience required.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="curriculum" className="space-y-4">
                        <div className="space-y-4">
                          {modules.map((module) => (
                            <div key={module.id}>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-medium">{module.title}</h3>
                                <span className="text-sm text-muted-foreground">
                                  {module.items.length} lessons •{" "}
                                  {module.items.reduce((total, item) => total + item.duration, 0)} min
                                </span>
                              </div>
                              <div className="space-y-2 pl-4 border-l">
                                {module.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2">
                                      {item.type === "video" ? (
                                        <Video className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span>{item.title}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.duration} min</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="instructor" className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
                            <img
                              src="/placeholder.svg?height=64&width=64"
                              alt="Instructor"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">Dr. Sarah Johnson</h3>
                            <p className="text-sm text-muted-foreground mb-2">Digital Marketing Specialist</p>
                            <p className="text-sm">
                              Dr. Sarah Johnson has over 10 years of experience in digital marketing, working with
                              Fortune 500 companies and startups alike. She holds a Ph.D. in Marketing and has published
                              numerous articles on digital marketing strategies.
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <div className={`${viewMode === "mobile" ? "order-1" : ""} space-y-4`}>
                {/* Course Card */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="aspect-video bg-muted rounded-md overflow-hidden">
                      <img
                        src="/placeholder.svg?height=180&width=320"
                        alt="Course preview"
                        alt="Course preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold">$49.99</span>
                        <span className="text-sm line-through text-muted-foreground">$99.99</span>
                      </div>
                      <Button className="w-full" onClick={handleEnroll}>
                        Enroll Now
                      </Button>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">This course includes:</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span>8 hours of video content</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>12 downloadable resources</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span>Certificate of completion</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Lifetime access</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

