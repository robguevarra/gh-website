'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Monitor, Smartphone, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchLesson } from '@/app/actions/modules'
import { Editor } from '@tiptap/react'
import { extensions } from './tiptap-extensions'
import { generateHTML } from '@tiptap/html'

interface PreviewProps {
  courseId: string
  selectedModuleId: string | null
  selectedLessonId: string | null
}

interface LessonContent {
  title: string
  description?: string
  content_json: any
}

export function Preview({
  courseId,
  selectedModuleId,
  selectedLessonId,
}: PreviewProps) {
  const [content, setContent] = useState<LessonContent | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedLessonId) return

      setIsLoading(true)
      setError(null)
      
      try {
        const lesson = await fetchLesson(selectedLessonId)
        setContent(lesson)
      } catch (err) {
        console.error('Error fetching lesson:', err)
        setError('Failed to load lesson content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [selectedLessonId])

  const renderContent = (contentJson: any) => {
    try {
      // If content is already HTML string, return it
      if (typeof contentJson === 'string') {
        return contentJson
      }
      
      // If content is JSON, convert it to HTML using TipTap
      return generateHTML(contentJson, extensions)
    } catch (err) {
      console.error('Error rendering content:', err)
      return 'Error rendering content'
    }
  }

  if (!selectedLessonId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a lesson to preview
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview</h3>
        <Tabs value={device} onValueChange={(v) => setDevice(v as 'desktop' | 'mobile')}>
          <TabsList>
            <TabsTrigger value="desktop">
              <Monitor className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div
        className={cn(
          'border rounded-lg overflow-hidden transition-all duration-200',
          device === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
        )}
      >
        <div className="p-4">
          {content && (
            <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none">
              <h1>{content.title}</h1>
              {content.description && <p>{content.description}</p>}
              {content.content_json && (
                <div
                  className="tiptap-content"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(content.content_json)
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 