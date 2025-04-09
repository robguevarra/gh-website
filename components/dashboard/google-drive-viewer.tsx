"use client"

import { useState, useEffect } from "react"

interface GoogleDriveViewerProps {
  fileId: string
  height?: string
  width?: string
}

export function GoogleDriveViewer({ fileId, height = "500px", width = "100%" }: GoogleDriveViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [fileId])

  if (!fileId) {
    return (
      <div className="flex items-center justify-center bg-gray-100 text-gray-500" style={{ height, width }}>
        Please select a template to view
      </div>
    )
  }

  // Google Drive embed URL
  const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`

  return (
    <div className="relative" style={{ height, width }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
        </div>
      )}
      <iframe
        src={embedUrl}
        className={`w-full h-full ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        allow="autoplay"
        onLoad={() => setIsLoading(false)}
      ></iframe>
    </div>
  )
}
