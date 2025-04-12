"use client"

import { useState, useEffect } from "react"
import { Download, ExternalLink, AlertCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GoogleDriveViewerProps {
  fileId: string
  fileName?: string
  fileType?: string
  height?: string
  width?: string
  showControls?: boolean
  onDownloadClick?: () => void
}

export function GoogleDriveViewer({ 
  fileId, 
  fileName = "Document", 
  fileType = "pdf", 
  height = "500px", 
  width = "100%",
  showControls = true,
  onDownloadClick
}: GoogleDriveViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // Determine the appropriate Google Drive URL based on file type
  const getGoogleDriveUrl = () => {
    if (!fileId) {
      setHasError(true)
      return ''
    }
    
    // For mock files in development
    if (fileId.startsWith('mock-')) {
      // Return a placeholder URL for mock files
      if (fileType === 'pdf') {
        return 'https://drive.google.com/viewerng/viewer?embedded=true&url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      }
      return `https://view.officeapps.live.com/op/embed.aspx?src=https://file-examples.com/storage/fe8c7eef0c6364f6898c1d3/2017/02/file-sample_100kB.docx`
    }
    
    // For PDFs, use the PDF viewer
    if (fileType === 'pdf') {
      return `https://drive.google.com/file/d/${fileId}/preview`
    }
    
    // For documents, spreadsheets, and presentations, use the general viewer
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  const handleOpenInDrive = () => {
    if (fileId.startsWith('mock-')) {
      // For mock files, open a sample document
      window.open('https://docs.google.com/document/d/1bNG78rkAkKRNmxmQ0Z5Rq5OD7U3xjIsvfZ8XjGTXwsU/edit', '_blank')
      return
    }
    
    window.open(`https://drive.google.com/file/d/${fileId}/view`, "_blank")
  }

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div 
        className="relative w-full overflow-hidden rounded border border-gray-200"
        style={{ height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="animate-pulse text-gray-400">Loading document...</div>
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-red-500 font-medium mb-1">Failed to load document</div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              This could be due to missing Google Drive configuration or insufficient permissions.
            </p>
          </div>
        )}
        {!hasError && (
          <iframe
            src={getGoogleDriveUrl()}
            width={width}
            height="100%"
            allow="autoplay"
            className="border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          ></iframe>
        )}
      </div>
      
      {showControls && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <h3 className="font-medium text-gray-800 text-sm truncate">{fileName}</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInDrive}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Drive
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onDownloadClick}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
