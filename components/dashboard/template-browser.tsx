'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useTemplateBrowser } from '@/lib/hooks/ui/use-template-browser';
import type { DriveItem, BreadcrumbSegment } from '@/lib/google-drive/driveApiUtils';
import { TemplatePreviewModal } from '@/components/dashboard/template-preview-modal';

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

  // Format the modified date if available
  const formattedDate = file.modifiedTime
    ? new Date(file.modifiedTime).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const handleCardClick = () => {
    if (isFolder && onNavigate) {
      onNavigate(file.id);
    } else if (!isFolder && onPreview) {
      onPreview(file);
    }
  };

  return (
    <Card
      className={`group flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg ${isFolder
        ? 'cursor-pointer border-yellow-100 hover:border-yellow-300 bg-yellow-50/30'
        : 'hover:border-primary/30 bg-white'}`}
      onClick={handleCardClick}
    >
      {/* Card Content Area */}
      <div className="p-4 flex flex-col h-full">
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-2">
          <div className={`p-2 rounded-md ${isFolder ? 'bg-yellow-100' : 'bg-primary/10'}
            transition-colors duration-300 group-hover:${isFolder ? 'bg-yellow-200' : 'bg-primary/20'}`}>
            {Icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 text-gray-800 group-hover:text-black transition-colors duration-300">
              {file.name || 'Untitled'}
            </h3>
            {formattedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Modified {formattedDate}
              </p>
            )}
          </div>
        </div>

        {/* Button Area - Only for files, not folders */}
        {!isFolder && onPreview && onDownload && (
          <div className="mt-auto pt-3 flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:flex-1 text-xs transition-all duration-300 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Preview button clicked for file:', file);
                onPreview(file);
              }}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              className="w-full sm:flex-1 text-xs bg-primary hover:bg-primary/90 transition-all duration-300"
              onClick={(e) => { e.stopPropagation(); onDownload(file); }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        )}

        {/* Folder Indicator */}
        {isFolder && (
          <div className="mt-auto pt-2 flex justify-end">
            <div className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors duration-300">
              <span>Open folder</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface TemplateBrowserProps {
  onTemplateSelect?: (file: DriveItem) => void;
}

export function TemplateBrowser({ onTemplateSelect }: TemplateBrowserProps) {
  // Local state for preview modal
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Use our optimized hook for the template browser
  const {
    items,
    breadcrumbs,
    isLoading,
    hasError,
    currentFolderId,
    navigateToFolder,
    refreshData,
    handleDownload
  } = useTemplateBrowser({ onTemplateSelect });

  // Additional handlers specific to this component
  const handleOpenInDrive = useCallback((file: DriveItem) => {
    window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
  }, []);

  // Handle preview
  const handlePreview = useCallback((file: DriveItem) => {
    console.log('Preview handler called with file:', file);
    setPreviewFile(file);
    setShowPreview(true);
  }, []);

  // Memoize navigation handlers
  const navigateToRoot = useCallback(() => {
    navigateToFolder(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || null);
  }, [navigateToFolder]);

  return (
    <div className="space-y-4">
      {/* Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={showPreview}
        file={previewFile}
        onClose={() => setShowPreview(false)}
        onOpenChange={(open) => setShowPreview(open)}
        onDownload={handleDownload}
      />
      {/* === Header with Breadcrumbs and Refresh Button === */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-1 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap py-1 min-h-[28px] rounded-md bg-muted/30 px-3">
          {isLoading && breadcrumbs.length === 0 && !hasError ? (
            // Skeleton for initial load
            <>
              <Skeleton className="h-4 w-16 rounded" />
            </>
          ) : !hasError && breadcrumbs.length === 0 ? (
            // Static Root label when at the root level
            <div className="flex items-center">
              <Folder className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
              <span className="font-medium text-foreground">Home</span>
            </div>
          ) : !hasError ? (
            // Clickable Root link + Mapped breadcrumbs when inside subfolders
            <>
              <button
                onClick={navigateToRoot}
                className="hover:underline hover:text-foreground flex items-center"
              >
                <Folder className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
                <span>Home</span>
              </button>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.id} className="flex items-center">
                  <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground" />
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

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshData}
          disabled={isLoading}
          className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* === Conditional Content Area === */}
      {(() => {
        // --- Loading State (Show Skeleton Grid) ---
        if (isLoading) {
          // Don't show skeleton if we have previous data (SWR handles this)
          if (items.length > 0 && !hasError) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 6 }).map((_, i) => ( // Render 6 skeleton cards
                <div key={i} className="bg-white border border-gray-100 rounded-lg p-4 h-[160px] animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-gray-200 h-10 w-10 rounded-md"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex gap-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              ))}
            </div>
          );
        }

        // --- Error State ---
        if (hasError) {
          return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-primary/5 rounded-lg border border-primary/10">
              <div className="bg-red-100 p-3 rounded-full mb-4 transition-all duration-300 hover:bg-red-200">
                <ExternalLink className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-800">Unable to load templates</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                There was an error connecting to Google Drive. Please try again later or contact support if the issue persists.
              </p>
              <Button
                onClick={refreshData}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-primary/5 transition-all duration-300"
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          );
        }

        // --- Empty State (No Items) ---
        if (items.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-primary/5 rounded-lg border border-primary/10">
              <div className="bg-primary/10 p-3 rounded-full mb-4 transition-all duration-300 hover:bg-primary/20">
                <Folder className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-800">No items found</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {currentFolderId
                  ? "This folder is empty. Navigate to another folder or go back to the home directory."
                  : "No templates are available. Please check back later or contact support."}
              </p>
              {currentFolderId && (
                <Button
                  onClick={navigateToRoot}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-primary/5 transition-all duration-300"
                >
                  <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                  Back to Home
                </Button>
              )}
            </div>
          );
        }

        // --- Content State (Show Files Grid) ---
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((file) => (
              <FileCard
                key={file.id}
                file={file}
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