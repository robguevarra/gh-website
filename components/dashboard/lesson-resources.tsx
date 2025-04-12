"use client"

import { FileIcon, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Resource {
  id: string
  title: string
  url: string
  type: string
}

interface LessonResourcesProps {
  resources: Resource[]
}

export function LessonResources({ resources }: LessonResourcesProps) {
  if (!resources || resources.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-[#5d4037] mb-1">No Resources Available</h3>
        <p className="text-sm text-[#6d4c41]">
          This lesson doesn't have any downloadable resources.
        </p>
      </div>
    )
  }
  
  // Get icon based on file type
  const getFileIcon = (type: string) => {
    const iconClasses = "h-10 w-10"
    
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileIcon className={cn(iconClasses, "text-red-500")} />
      case 'doc':
      case 'docx':
        return <FileIcon className={cn(iconClasses, "text-blue-500")} />
      case 'xls':
      case 'xlsx':
        return <FileIcon className={cn(iconClasses, "text-green-500")} />
      case 'ppt':
      case 'pptx':
        return <FileIcon className={cn(iconClasses, "text-orange-500")} />
      case 'zip':
        return <FileIcon className={cn(iconClasses, "text-purple-500")} />
      default:
        return <FileIcon className={cn(iconClasses, "text-gray-500")} />
    }
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[#5d4037] mb-4">Lesson Resources</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resources.map((resource) => (
          <div 
            key={resource.id}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-brand-purple/20 transition-colors"
          >
            {getFileIcon(resource.type)}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#5d4037] truncate">{resource.title}</h4>
              <p className="text-xs text-[#6d4c41] uppercase mt-1">{resource.type} file</p>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0"
              onClick={() => window.open(resource.url, '_blank')}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        ))}
      </div>
      
      <div className="text-sm text-[#6d4c41] mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p>
          <strong>Note:</strong> These resources are provided to help you implement what you've learned in this lesson.
          Download and use them as reference materials for your projects.
        </p>
      </div>
    </div>
  )
}
