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
      className={`flex flex-col h-full overflow-hidden transition-shadow ${isFolder ? 'cursor-pointer hover:shadow-lg border-yellow-600/50' : 'hover:shadow-md'}`}
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
  
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="ml-2">
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <div className="mb-4">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Failed to load templates</div>
        <p className="text-sm text-muted-foreground mb-4">
          This could be due to missing Google Drive configuration or API access.
        </p>
        <Button variant="outline" onClick={refreshData}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap py-1">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.name}</span>
            ) : (
              <button 
                onClick={() => navigateToFolder(crumb.id)} 
                className="hover:underline hover:text-foreground"
              >
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </div>

      {hasError && (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load templates</div>
          <p className="text-sm text-muted-foreground mb-4">
            This could be due to missing Google Drive configuration or API access.
          </p>
          <Button variant="outline" onClick={refreshData}>
            Try Again
          </Button>
        </div>
      )}
      
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
      
      {/* Internal Preview Modal (if needed) */}
      {/* Simplified for now - external modal handled by parent */}
      {/* {showPreviewModal && selectedFile && (
        <TemplatePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          file={selectedFile}
          onDownload={handleDownload}
          onOpenInDrive={handleOpenInDrive}
        />
      )} */}
    </div>
  );
}
