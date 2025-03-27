'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Monitor, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewProps {
  courseId: string
  selectedModuleId: string | null
  selectedLessonId: string | null
}

export function Preview({
  courseId,
  selectedModuleId,
  selectedLessonId,
}: PreviewProps) {
  const [content, setContent] = useState<any>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const supabase = createClient()

  useEffect(() => {
    const fetchContent = async () => {
      if (!selectedLessonId) return

      const { data: lesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', selectedLessonId)
        .single()

      if (lesson) {
        setContent(lesson)
      }
    }

    fetchContent()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('lesson_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `id=eq.${selectedLessonId}`,
        },
        (payload) => {
          setContent(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedLessonId])

  if (!selectedLessonId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a lesson to preview
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
            <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl">
              <h1>{content.title}</h1>
              {content.description && <p>{content.description}</p>}
              {content.content_json && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: content.content_json,
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