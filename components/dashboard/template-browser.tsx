'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Image,
  Table,
  FileSpreadsheet,
  ChevronRight,
  ExternalLink,
  Folder,
  RotateCw,
} from 'lucide-react';
import { useUserProfileData } from '@/lib/hooks/use-dashboard-store';
import { useGoogleDriveFiles } from '@/lib/hooks/use-google-drive';
import type { DriveItem, BreadcrumbSegment } from '@/lib/google-drive/driveApiUtils';

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

interface FileCardProps {
  file: DriveItem;
  onNavigate?: (folderId: string) => void;
  onPreview?: (file: DriveItem) => void;
  onDownload?: (file: DriveItem) => void;
}

const FileCard = ({ file, onNavigate, onPreview, onDownload }: FileCardProps) => {
  const isFolder = file.isFolder;
  const Icon = getFileIcon(file.mimeType, isFolder);

  const handleCardClick = () => {
    if (isFolder && onNavigate) {
      onNavigate(file.id);
    }
  };

  return (
    <Card 
      className={`flex flex-col h-full overflow-hidden transition-all duration-200 ease-in-out hover:scale-[1.02] ${isFolder ? 'cursor-pointer hover:shadow-lg hover:bg-secondary/30 border-yellow-600/50' : 'hover:shadow-md hover:bg-secondary/30'}`}
      onClick={handleCardClick}
    >
      <CardHeader className="flex-shrink-0 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon}
            <CardTitle className="text-sm font-medium line-clamp-1">{file.name || 'Untitled'}</CardTitle>
          </div>
        </div>
      </CardHeader>
      {!isFolder && onPreview && onDownload && (
        <CardFooter className="flex-shrink-0 grid grid-cols-2 gap-2 pt-4 mt-auto"> 
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={(e) => { e.stopPropagation(); onPreview(file); }} 
          >
            <Eye className="mr-1 h-4 w-4" />
            Preview
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="w-full"
            onClick={(e) => { e.stopPropagation(); onDownload(file); }} 
          >
            <Download className="mr-1 h-4 w-4" />
            Download
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

interface TemplateBrowserProps {
  onTemplateSelect?: (file: DriveItem) => void;
}

export function TemplateBrowser({ onTemplateSelect }: TemplateBrowserProps) {
  const { userId } = useUserProfileData();
  
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const {
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    navigateToFolder,
    refreshData,
  } = useGoogleDriveFiles();
  
  const handlePreview = (file: DriveItem) => {
    setSelectedFile(file);
    
    if (onTemplateSelect) {
      onTemplateSelect(file);
    } else {
      setShowPreviewModal(true);
    }
  };
  
  const handleDownload = (file: DriveItem) => {
    window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, '_blank');
  };
  
  const handleOpenInDrive = (file: DriveItem) => {
    window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
  };
  
  return (
    <div>
      {/* === Breadcrumbs (Rendered Unconditionally) === */}
      <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap py-1 min-h-[20px]"> {/* Added min-height */}
        {isLoading && breadcrumbs.length === 0 && !hasError ? (
          // Skeleton for initial load
          <>
            <Skeleton className="h-4 w-16 rounded" />
            {/* No chevron needed for single root skeleton */}
          </>
        ) : !hasError && breadcrumbs.length === 0 ? (
          // Static Root label when at the root level
          <span className="font-medium text-foreground">Home</span>
        ) : !hasError ? (
          // Clickable Root link + Mapped breadcrumbs when inside subfolders
          <>
            <button
              onClick={() => navigateToFolder(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || null)} // Navigate back to root
              className="hover:underline hover:text-foreground"
            >
              Home
            </button>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 mx-1" /> {/* Always show chevron */}
                {index === breadcrumbs.length - 1 ? (
                  // Last crumb is the current folder - not clickable
                  <span className="font-medium text-foreground">{crumb.name}</span>
                ) : (
                  // Intermediate crumbs are clickable
                  <button
                    onClick={() => navigateToFolder(crumb.id)}
                    className="hover:underline hover:text-foreground"
                  >
                    {crumb.name}
                  </button>
                )}
              </span>
            ))}
          </>
        ) : null /* Don't render breadcrumbs if there's an error */ }
      </div>

      {/* === Conditional Content Area === */}
      {(() => {
        // --- Loading State (Show Skeleton Grid) ---
        if (isLoading) {
          // Don't show skeleton if we have previous data (SWR handles this)
          if (items.length > 0 && !hasError) return null; 
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => ( // Render 8 skeleton cards
                <Card key={i} className="flex flex-col h-full overflow-hidden">
                  <CardHeader className="flex-shrink-0 pb-2 pt-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" /> {/* Icon Skeleton */}
                      <Skeleton className="h-4 w-3/4 rounded" /> {/* Title Skeleton */}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex-shrink-0 grid grid-cols-2 gap-2 pt-4 mt-auto">
                    <Skeleton className="h-8 w-full rounded" /> {/* Button Skeleton */}
                    <Skeleton className="h-8 w-full rounded" /> {/* Button Skeleton */}
                  </CardFooter>
                </Card>
              ))}
            </div>
          );
        }

        // --- Error State ---
        if (hasError) {
          return (
            <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10 text-center">
              <div className="text-destructive font-medium mb-2">Oops! Something went wrong.</div>
              <p className="text-sm text-destructive/80 mb-4">
                We couldn't load the templates. This might be a temporary issue or a problem with accessing Google Drive.
              </p>
              <Button variant="destructive" size="sm" onClick={refreshData}>
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          );
        }

        // --- Empty Folder State ---
        if (items.length === 0) {
          return (
            <div className="text-center py-16">
              <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This folder is empty.</p>
            </div>
          );
        }

        // --- Default: Render Item Grid ---
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <FileCard
                key={item.id}
                file={item}
                onNavigate={navigateToFolder}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
