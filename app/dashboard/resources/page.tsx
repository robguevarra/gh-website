"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Search, Filter, Download, Eye, FileText, ExternalLink,
  ChevronRight, Folder, RotateCw, Plus, Table, FileSpreadsheet, Image
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { GoogleDriveViewer } from "@/components/dashboard/google-drive-viewer"
import { useGoogleDriveFiles } from "@/lib/hooks/use-google-drive"
import { useAuth } from "@/context/auth-context"
import type { DriveItem, BreadcrumbSegment } from '@/lib/google-drive/driveApiUtils'

interface ExtendedDriveItem extends DriveItem {
  children?: number;
  // webViewLink is now in DriveItem base interface
  owners?: Array<{ displayName: string; emailAddress?: string; }>;
}

// File type icon mapping based on MIME type
const getFileIcon = (mimeType: string | undefined, isFolder: boolean) => {
  if (isFolder) return <Folder className="h-5 w-5 text-yellow-600" />;
  if (!mimeType) return <FileText className="h-5 w-5 text-gray-500" />;

  if (mimeType.includes('pdf')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  } else if (mimeType.includes('document')) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  } else if (mimeType.includes('spreadsheet')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  } else if (mimeType.includes('presentation')) {
    return <Table className="h-5 w-5 text-orange-500" />;
  } else if (mimeType.includes('image')) {
    return <Image className="h-5 w-5 text-green-500" />;
  } else {
    return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

interface ResourceCardProps {
  file: DriveItem;
  onNavigate?: (folderId: string) => void;
  onPreview?: (file: DriveItem) => void;
  onDownload?: (file: DriveItem) => void;
  isSelected?: boolean;
}

const ResourceCard = ({ file, onNavigate, onPreview, onDownload, isSelected }: ResourceCardProps) => {
  const isFolder = file.mimeType?.includes('folder') || false;
  const Icon = getFileIcon(file.mimeType, isFolder);

  // Determine resource type for display
  // Cast file to extended type
  const fileExt = file as ExtendedDriveItem;

  const resourceType = isFolder ? 'Folder' :
    file.mimeType?.includes('pdf') ? 'PDF' :
      file.mimeType?.includes('document') ? 'Doc' :
        file.mimeType?.includes('spreadsheet') ? 'Sheet' :
          file.mimeType?.includes('presentation') ? 'Slide' :
            file.mimeType?.includes('image') ? 'Image' : 'File';

  // Get formatted date for display
  const modifiedDate = formatDate(file.modifiedTime);

  const fileSize = formatFileSize(file.size ? parseInt(file.size.toString()) : undefined);

  const handleCardClick = () => {
    if (isFolder && onNavigate) {
      onNavigate(file.id);
    } else if (!isFolder && onPreview) {
      onPreview(file);
    }
  };

  const showThumbnail = !isFolder && file.thumbnailLink && (
    file.mimeType?.includes('image') || file.mimeType?.includes('pdf')
  );

  return (
    <Card
      className={`group flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-md active:shadow-sm
        ${isSelected ? 'border-primary ring-1 ring-primary/30 shadow-primary/10' : ''}
        ${isFolder
          ? 'cursor-pointer border-yellow-100 hover:border-yellow-300 bg-gradient-to-br from-yellow-50/80 to-amber-50/40'
          : 'cursor-pointer hover:border-primary/30 bg-gradient-to-br from-white to-gray-50/80'}`}
      onClick={handleCardClick}
    >
      {/* Card Content Area */}
      <div className="p-4 flex flex-col h-full">
        {/* Resource Type Badge */}
        <div className="flex justify-between items-center mb-3">
          <Badge
            variant="outline"
            className={`text-xs font-normal px-2 py-0.5 
              ${isFolder ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' :
                resourceType === 'PDF' ? 'bg-red-50 text-red-700 border-red-200' :
                  resourceType === 'Doc' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    resourceType === 'Sheet' ? 'bg-green-50 text-green-700 border-green-200' :
                      resourceType === 'Slide' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        resourceType === 'Image' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            {resourceType}
          </Badge>

          {fileSize && !isFolder && (
            <span className="text-xs text-muted-foreground">{fileSize}</span>
          )}
        </div>

        {/* Icon and Title (and Thumbnail) */}
        <div className="flex items-start gap-3 mb-auto">
          <div className={`rounded-md transition-all duration-300 flex-shrink-0
            ${showThumbnail ? 'p-0 overflow-hidden w-12 h-12 border border-gray-100' : 'p-2'}
            ${isFolder
              ? 'bg-yellow-100 group-hover:bg-yellow-200 group-hover:scale-110'
              : showThumbnail
                ? 'bg-white'
                : 'bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110'}`}
          >
            {showThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.thumbnailLink!}
                alt={file.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              Icon
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 text-gray-800 group-hover:text-black transition-all duration-300">
              {file.name || 'Untitled'}
            </h3>
            {modifiedDate && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-muted mr-1.5"></span>
                {modifiedDate}
              </p>
            )}
          </div>
        </div>

        {/* Action Area */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          {!isFolder ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs h-8 bg-transparent hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview && onPreview(file);
                }}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs h-8 bg-transparent hover:bg-primary/5 hover:text-primary transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload && onDownload(file);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {fileExt.children ? `${fileExt.children} items` : ''}
              </span>
              <div className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors duration-300">
                <span>Open folder</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Format dates in a user-friendly way
const formatDate = (dateString?: string | null): string | undefined => {
  if (!dateString) return undefined;

  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  // Yesterday
  else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  // This year
  else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  // Previous years
  else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Format file size in human-readable format
const formatFileSize = (sizeInBytes?: number): string | undefined => {
  if (!sizeInBytes) return undefined;

  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export default function ResourcesPage() {
  const router = useRouter()
  const { user, isLoading: isLoadingAuth } = useAuth()

  // Apply subtle background effects for a more sophisticated look
  const backgroundPattern = {
    backgroundImage: `radial-gradient(rgba(233, 227, 216, 0.3) 1px, transparent 0)`,
    backgroundSize: '25px 25px',
    backgroundPosition: '0 0',
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.push('/auth/signin')
    }
  }, [isLoadingAuth, user, router])

  // Use our hook for Google Drive files
  const {
    items = [],
    breadcrumbs = [],
    isLoading,
    hasError,
    currentFolderId,
    navigateToFolder,
    refreshData: refreshFiles
  } = useGoogleDriveFiles()

  // Local state
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Filter items into folders and files
  const folders = items.filter(item => item.mimeType?.includes('folder'))
  const files = items.filter(item => !item.mimeType?.includes('folder'))

  // Extract categories from files (only non-folder items)
  const categories = Array.from(new Set(files
    .map(file => {
      if (file.mimeType?.includes('pdf')) return 'PDF'
      if (file.mimeType?.includes('document')) return 'Documents'
      if (file.mimeType?.includes('spreadsheet')) return 'Spreadsheets'
      if (file.mimeType?.includes('presentation')) return 'Presentations'
      return 'Other'
    })))

  // Handle search input
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchTerm(query)
  }, [])

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category)
  }, [])

  // Handle file selection and preview
  const handleResourceSelect = useCallback((file: DriveItem) => {
    // Only set selected file if it's not a folder
    if (!file.mimeType?.includes('folder')) {
      setSelectedFile(file)
      setShowPreview(true)
    }
  }, [])

  // Handle folder navigation
  const handleFolderNavigation = useCallback((folderId: string) => {
    // Clear any selected file when navigating
    setSelectedFile(null)
    navigateToFolder(folderId)
  }, [navigateToFolder])

  // Navigate to root folder
  const navigateToRoot = useCallback(() => {
    setSelectedFile(null) // Clear selection when navigating
    navigateToFolder(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_RESOURCES_FOLDER_ID || null)
  }, [navigateToFolder])

  // Handle file download
  const handleFileDownload = useCallback((file: DriveItem) => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock download triggered for:', file.name)
      return
    }

    window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, "_blank")
  }, [])

  // Open file in Google Drive
  const handleOpenInDrive = useCallback((file: DriveItem) => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock open in Drive triggered for:', file.name)
      return
    }

    window.open(`https://drive.google.com/file/d/${file.id}/view`, "_blank")
  }, [])

  // Close preview
  const handleClosePreview = useCallback(() => {
    setShowPreview(false)
  }, [])

  // Filter resources based on category and search term
  const filteredResources = useCallback(() => {
    // Always include folders unless searching
    const visibleFolders = folders.filter(folder => {
      // If searching, only include folders that match the search term
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase()
        return folder.name?.toLowerCase().includes(searchLower) || false
      }
      // Otherwise show all folders
      return true
    })

    // Filter files based on category and search
    const visibleFiles = files.filter(file => {
      // Apply category filter
      if (activeCategory !== 'all') {
        const fileCategory =
          file.mimeType?.includes('pdf') ? 'PDF' :
            file.mimeType?.includes('document') ? 'Documents' :
              file.mimeType?.includes('spreadsheet') ? 'Spreadsheets' :
                file.mimeType?.includes('presentation') ? 'Presentations' :
                  'Other'

        if (fileCategory !== activeCategory) return false
      }

      // Apply search filter
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase()
        return (
          file.name?.toLowerCase().includes(searchLower) ||
          file.description?.toLowerCase().includes(searchLower)
        )
      }

      return true
    })

    // Return folders first, then files
    return [...visibleFolders, ...visibleFiles]
  }, [folders, files, activeCategory, searchTerm])

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9f6f2]">
        <main className="container py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="mb-4 pl-0 text-muted-foreground"
              onClick={() => router.push("/dashboard")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Student Course Library</h1>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Render error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-[#f9f6f2]">
        <main className="container py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="mb-4 pl-0 text-muted-foreground"
              onClick={() => router.push("/dashboard")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Student Course Library</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-red-500 mb-2">Failed to load resources</p>
            <p className="text-sm text-muted-foreground mb-4">
              This could be due to missing Google Drive configuration or API access.
            </p>
            <Button variant="outline" onClick={refreshFiles}>
              Try Again
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Calculate filtered resources
  const filteredItems = filteredResources()

  // Animation variants for framer-motion
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } }
  }

  const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariant = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  return (
    <div className="min-h-screen bg-[#f9f6f2]" style={backgroundPattern}>
      <main className="container py-8 space-y-6">
        {/* Header with navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 pl-0 text-muted-foreground hover:text-foreground transition-all group"
            onClick={() => router.push('/dashboard')}
          >
            <ChevronLeft className="h-4 w-4 mr-1.5 group-hover:transform group-hover:-translate-x-0.5 transition-transform" />
            <span className="group-hover:underline">Back to Dashboard</span>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-[#5d4037]">Student Course Library</h1>
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary font-normal text-xs border-primary/20">New</Badge>
          </div>
        </motion.div>

        {/* Breadcrumb & Refresh */}
        <div className="flex items-center justify-between bg-white/50 p-3 rounded-lg border border-gray-100 shadow-sm">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 flex items-center gap-1 hover:bg-yellow-50/80"
                    onClick={navigateToRoot}
                  >
                    <Folder className="h-3.5 w-3.5 text-yellow-600" />
                    Home
                  </Button>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.id}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbLink asChild>
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-xs font-medium px-2 py-1 rounded hover:bg-background/80">
                        {crumb.name}
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 hover:bg-yellow-50/80"
                        onClick={() => handleFolderNavigation(crumb.id)}
                      >
                        {crumb.name}
                      </Button>
                    )}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshFiles}
            disabled={isLoading}
            className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
          <div className="relative flex flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={handleSearchInput}
              className="pl-9 bg-gray-50/50 border-gray-200 focus:border-primary/30"
            />
          </div>
          <Tabs defaultValue={activeCategory} onValueChange={handleCategoryChange} className="hidden sm:block">
            <TabsList className="bg-gray-50/50">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" className="bg-gray-50/50 border-gray-200 hover:bg-gray-100/80">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* === Conditional Content Area === */}
        {(() => {
          // --- Loading State ---
          if (isLoading && items.length === 0) {
            return (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
              </motion.div>
            )
          }

          // --- Error State ---
          if (hasError) {
            return (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="bg-red-50/50 border border-red-100 rounded-xl p-8 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <ExternalLink className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Unable to load resources</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  There was an error connecting to Google Drive. Please check your connection and try again.
                </p>
                <Button variant="outline" onClick={refreshFiles} className="mx-auto">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </motion.div>
            )
          }

          // --- Empty State ---
          if (filteredItems.length === 0) {
            return (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="bg-white/50 border border-gray-100 rounded-xl p-8 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No resources found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {currentFolderId && searchTerm
                    ? "No matching resources found in this folder. Try adjusting your search term."
                    : currentFolderId
                      ? "This folder is empty. Navigate to another folder or go back home."
                      : "No resources are available in the library. Please check back later."}
                </p>
                {currentFolderId && (
                  <Button variant="outline" onClick={navigateToRoot}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                )}
              </motion.div>
            )
          }

          // --- Content State / Resource Grid ---
          return (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 py-2"
              variants={staggerChildren}
              initial="hidden"
              animate="visible"
            >
              {filteredItems.map((resource: DriveItem) => (
                <motion.div key={resource.id} variants={itemVariant}>
                  <ResourceCard
                    file={resource}
                    onNavigate={handleFolderNavigation}
                    onPreview={handleResourceSelect}
                    onDownload={handleFileDownload}
                    isSelected={selectedFile?.id === resource.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          )
        })()}

        {/* Preview Modal/Section when a file is selected */}
        {selectedFile && showPreview && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="mt-8 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b bg-white/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-primary/10">
                  {getFileIcon(selectedFile.mimeType, false)}
                </div>
                <div>
                  <h3 className="font-medium">{selectedFile.name || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`
                      ${selectedFile.mimeType?.includes('pdf') ? 'bg-red-50 text-red-700 border-red-200' :
                        selectedFile.mimeType?.includes('document') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          selectedFile.mimeType?.includes('spreadsheet') ? 'bg-green-50 text-green-700 border-green-200' :
                            selectedFile.mimeType?.includes('presentation') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-gray-100 text-gray-700'}
                    `}>
                      {selectedFile.mimeType?.includes('pdf') ? 'PDF' :
                        selectedFile.mimeType?.includes('document') ? 'Document' :
                          selectedFile.mimeType?.includes('spreadsheet') ? 'Spreadsheet' :
                            selectedFile.mimeType?.includes('presentation') ? 'Presentation' :
                              'File'}
                    </Badge>
                    {selectedFile.size && (
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(parseInt(selectedFile.size.toString()))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => handleFileDownload(selectedFile)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => handleOpenInDrive(selectedFile)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open in Drive
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                  onClick={handleClosePreview}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-5">
              {/* Preview area with subtle visual enhancements */}
              <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm">
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
              </div>

              {/* File details section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 pt-6 border-t"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">File Details</h4>
                  {(selectedFile as ExtendedDriveItem).webViewLink && (
                    <a
                      href={(selectedFile as ExtendedDriveItem).webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View original
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                  <div className="bg-gray-50/70 p-3 rounded-lg">
                    <p className="text-muted-foreground mb-1 text-xs">File Name</p>
                    <p className="font-medium truncate">{selectedFile.name || 'Untitled'}</p>
                  </div>
                  <div className="bg-gray-50/70 p-3 rounded-lg">
                    <p className="text-muted-foreground mb-1 text-xs">File Type</p>
                    <p className="font-medium">
                      {selectedFile.mimeType?.includes('pdf') ? 'PDF Document' :
                        selectedFile.mimeType?.includes('document') ? 'Google Document' :
                          selectedFile.mimeType?.includes('spreadsheet') ? 'Google Spreadsheet' :
                            selectedFile.mimeType?.includes('presentation') ? 'Google Presentation' :
                              selectedFile.mimeType || 'Unknown'}
                    </p>
                  </div>
                  {selectedFile.modifiedTime && (
                    <div className="bg-gray-50/70 p-3 rounded-lg">
                      <p className="text-muted-foreground mb-1 text-xs">Last Modified</p>
                      <p className="font-medium">
                        {formatDate(selectedFile.modifiedTime) || (
                          <>
                            {new Date(selectedFile.modifiedTime).toLocaleDateString()} at
                            {" "}{new Date(selectedFile.modifiedTime).toLocaleTimeString()}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  {selectedFile.createdTime && (
                    <div className="bg-gray-50/70 p-3 rounded-lg">
                      <p className="text-muted-foreground mb-1 text-xs">Created</p>
                      <p className="font-medium">
                        {formatDate(selectedFile.createdTime) || (
                          <>
                            {new Date(selectedFile.createdTime).toLocaleDateString()} at
                            {" "}{new Date(selectedFile.createdTime).toLocaleTimeString()}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  {(selectedFile as ExtendedDriveItem).owners && (selectedFile as ExtendedDriveItem).owners!.length > 0 && (
                    <div className="bg-gray-50/70 p-3 rounded-lg">
                      <p className="text-muted-foreground mb-1 text-xs">Owner</p>
                      <p className="font-medium">{(selectedFile as ExtendedDriveItem).owners![0].displayName || 'Unknown'}</p>
                    </div>
                  )}
                  {selectedFile.size && (
                    <div className="bg-gray-50/70 p-3 rounded-lg">
                      <p className="text-muted-foreground mb-1 text-xs">File Size</p>
                      <p className="font-medium">{formatFileSize(parseInt(selectedFile.size.toString()))}</p>
                    </div>
                  )}
                  {selectedFile.description && (
                    <div className="md:col-span-2 bg-gray-50/70 p-3 rounded-lg">
                      <p className="text-muted-foreground mb-1 text-xs">Description</p>
                      <p className="font-medium">{selectedFile.description}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
