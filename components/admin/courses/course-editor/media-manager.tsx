'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface MediaManagerProps {
  courseId: string
  onSelect: (url: string) => void
}

export function MediaManager({ courseId, onSelect }: MediaManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [files, setFiles] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase.storage
      .from('course-media')
      .list(`${courseId}/`)

    if (data) {
      const urls = await Promise.all(
        data.map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('course-media')
            .getPublicUrl(`${courseId}/${file.name}`)
          return publicUrl
        })
      )
      setFiles(urls)
    }
  }, [courseId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${courseId}/${fileName}`

      const { error } = await supabase.storage
        .from('course-media')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('course-media')
        .getPublicUrl(filePath)

      await fetchFiles()
      toast({
        description: 'File uploaded successfully',
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        variant: 'destructive',
        title: 'Error uploading file',
        description: 'Please try again.',
      })
    }
    setIsUploading(false)
  }

  const handleSelect = (url: string) => {
    onSelect(url)
    setOpen(false)
  }

  const handleDelete = async (url: string) => {
    const filePath = url.split('/').pop()
    if (!filePath) return

    try {
      const { error } = await supabase.storage
        .from('course-media')
        .remove([`${courseId}/${filePath}`])

      if (error) throw error

      await fetchFiles()
      toast({
        description: 'File deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        variant: 'destructive',
        title: 'Error deleting file',
        description: 'Please try again.',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => fetchFiles()}>
          Choose Media
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Media Manager</DialogTitle>
          <DialogDescription>
            Upload and manage your course media files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Upload File</Label>
            <div className="flex gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleUpload}
                disabled={isUploading}
              />
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {files.map((url) => (
              <div
                key={url}
                className="relative group cursor-pointer border rounded-lg overflow-hidden"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-32 object-cover"
                  onClick={() => handleSelect(url)}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(url)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 