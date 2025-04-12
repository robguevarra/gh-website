"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Filter, Download, Eye, FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { useGoogleDriveFiles, GoogleDriveFile } from "@/lib/hooks/use-google-drive"

export default function TemplatesPage() {
  const router = useRouter()
  
  // Use our new hook for Google Drive files
  const {
    files,
    categories,
    isLoading,
    hasError,
    applyFilter,
    applySearch,
    refreshFiles
  } = useGoogleDriveFiles()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null)
  
  // Handle search input
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchTerm(query)
    applySearch(query)
  }
  
  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    applyFilter(category)
  }
  
  // Handle file selection
  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFile(file)
  }
  
  // Handle file download
  const handleFileDownload = (file: GoogleDriveFile) => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock download triggered for:', file.name)
      return
    }
    
    window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, "_blank")
  }
  
  // Open file in Google Drive
  const handleOpenInDrive = (file: GoogleDriveFile) => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock open in Drive triggered for:', file.name)
      return
    }
    
    window.open(`https://drive.google.com/file/d/${file.id}/view`, "_blank")
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 pl-0 text-muted-foreground" 
            onClick={() => router.push("/dashboard")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Templates Library</h1>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // Render error state
  if (hasError) {
    return (
      <div className="container py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 pl-0 text-muted-foreground" 
            onClick={() => router.push("/dashboard")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Templates Library</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Failed to load templates</p>
          <p className="text-sm text-muted-foreground mb-4">
            This could be due to missing Google Drive configuration or API access.
          </p>
          <Button variant="outline" onClick={refreshFiles}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Templates Library</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - File browser */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex w-full gap-2">
            <div className="relative flex flex-1">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={handleSearchInput}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          <Tabs defaultValue={activeCategory} onValueChange={handleCategoryChange}>
            <TabsList className="flex overflow-x-auto py-1 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {files.length > 0 ? (
              files.map((file) => (
                <Card 
                  key={file.id} 
                  className={`overflow-hidden cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? "border-brand-purple" : ""
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex items-start p-3">
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center mr-3 flex-shrink-0">
                      <FileText className={`h-6 w-6 ${
                        file.mimeType?.includes('pdf') ? "text-red-500" :
                        file.mimeType?.includes('document') ? "text-blue-500" :
                        file.mimeType?.includes('spreadsheet') ? "text-green-500" :
                        "text-gray-500"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs font-normal">
                          {file.mimeType?.includes('pdf') ? 'PDF' :
                           file.mimeType?.includes('document') ? 'DOC' :
                           file.mimeType?.includes('spreadsheet') ? 'XLS' :
                           file.mimeType?.includes('presentation') ? 'PPT' :
                           'FILE'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {file.size || 'Unknown'}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm mt-1 truncate">{file.name || 'Untitled'}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {file.description || "No description available"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <h3 className="font-medium">No templates found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - File viewer */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <div className="space-y-4">
              <GoogleDriveViewer 
                fileId={selectedFile.id}
                fileName={selectedFile.name || 'Untitled'}
                fileType={selectedFile.mimeType?.includes('pdf') ? 'pdf' :
                         selectedFile.mimeType?.includes('document') ? 'docx' :
                         selectedFile.mimeType?.includes('spreadsheet') ? 'xlsx' :
                         selectedFile.mimeType?.includes('presentation') ? 'pptx' :
                         'file'}
                height="600px"
                onDownloadClick={() => handleFileDownload(selectedFile)}
              />
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-1">{selectedFile.name || 'Untitled'}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedFile.description || "No description available"}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Badge variant="outline">
                      {selectedFile.mimeType?.includes('pdf') ? 'PDF' :
                       selectedFile.mimeType?.includes('document') ? 'Document' :
                       selectedFile.mimeType?.includes('spreadsheet') ? 'Spreadsheet' :
                       selectedFile.mimeType?.includes('presentation') ? 'Presentation' :
                       'File'}
                    </Badge>
                  </span>
                  {selectedFile.createdTime && (
                    <span className="flex items-center">
                      Created: {new Date(selectedFile.createdTime).toLocaleDateString()}
                    </span>
                  )}
                  {selectedFile.modifiedTime && (
                    <span className="flex items-center">
                      Modified: {new Date(selectedFile.modifiedTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center" 
                    onClick={() => handleFileDownload(selectedFile)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center" 
                    onClick={() => handleOpenInDrive(selectedFile)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Drive
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg h-[600px]">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <h3 className="font-medium text-lg mb-2">Select a template to preview</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Choose a template from the list to preview its contents. You can download or view it in Google Drive.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
