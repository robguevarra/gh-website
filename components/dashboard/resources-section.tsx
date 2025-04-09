"use client"
import { Download, FileText, Video } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ResourcesSection() {
  // Mock data for resources
  const resources = {
    templates: [
      { id: 1, name: "Digital Planner Template", type: "pdf", size: "2.4 MB" },
      { id: 2, name: "Journal Cover Design", type: "pdf", size: "1.8 MB" },
      { id: 3, name: "Weekly Schedule Template", type: "pdf", size: "1.2 MB" },
      { id: 4, name: "Binding Guide", type: "pdf", size: "3.5 MB" },
    ],
    videos: [
      {
        id: 1,
        name: "Paper Selection Tutorial",
        duration: "15:30",
        thumbnail: "/placeholder.svg?height=80&width=120&text=Video",
      },
      {
        id: 2,
        name: "Binding Demonstration",
        duration: "22:45",
        thumbnail: "/placeholder.svg?height=80&width=120&text=Video",
      },
      {
        id: 3,
        name: "Color Theory for Planners",
        duration: "18:20",
        thumbnail: "/placeholder.svg?height=80&width=120&text=Video",
      },
    ],
    worksheets: [
      { id: 1, name: "Business Plan Worksheet", type: "pdf", size: "1.5 MB" },
      { id: 2, name: "Pricing Calculator", type: "xlsx", size: "0.8 MB" },
      { id: 3, name: "Marketing Checklist", type: "pdf", size: "1.1 MB" },
    ],
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Resources & Downloads</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-brand-purple data-[state=active]:text-white"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-brand-purple data-[state=active]:text-white">
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="worksheets"
              className="data-[state=active]:bg-brand-purple data-[state=active]:text-white"
            >
              Worksheets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-2">
            {resources.templates.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border border-muted/50 bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-purple/10 rounded-full p-2">
                    <FileText className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {resource.type.toUpperCase()} • {resource.size}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="videos" className="space-y-2">
            {resources.videos.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border border-muted/50 bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-purple/10 rounded-lg p-1 w-16 h-12 flex items-center justify-center relative">
                    <Video className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">{resource.duration}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="worksheets" className="space-y-2">
            {resources.worksheets.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border border-muted/50 bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-purple/10 rounded-full p-2">
                    <FileText className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {resource.type.toUpperCase()} • {resource.size}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground mb-2">Need additional resources?</p>
          <Button variant="outline" className="w-full">
            Request Resources
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
