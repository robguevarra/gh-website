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
} from 'lucide-react';
import { useUserProfileData } from '@/lib/hooks/use-dashboard-store';
import { useGoogleDriveFiles, GoogleDriveFile } from '@/lib/hooks/use-google-drive';
import { type Template } from '@/lib/stores/student-dashboard/types';

// File type icon mapping based on MIME type
const getFileIcon = (mimeType: string | undefined) => {
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
  file: GoogleDriveFile;
  onPreview: (file: GoogleDriveFile) => void;
  onDownload: (file: GoogleDriveFile) => void;
}

const FileCard = ({ file, onPreview, onDownload }: FileCardProps) => {
  // Get file type from MIME type
  const getFileType = (mimeType: string | undefined): string => {
    if (!mimeType) return 'FILE';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('document')) return 'DOC';
    if (mimeType.includes('spreadsheet')) return 'XLS';
    if (mimeType.includes('presentation')) return 'PPT';
    if (mimeType.includes('image')) return 'IMG';
    return 'FILE';
  };
  
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-normal">
            {getFileType(file.mimeType)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {file.size || 'Unknown'}
          </span>
        </div>
        <CardTitle className="text-base mt-2 line-clamp-1">{file.name || 'Untitled'}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">
          {file.description || 'No description available'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
          {file.thumbnailLink ? (
            <img 
              src={file.thumbnailLink} 
              alt={file.name || 'File'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {getFileIcon(file.mimeType)}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex-shrink-0 grid grid-cols-2 gap-2 pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onPreview(file)}
        >
          <Eye className="mr-1 h-4 w-4" />
          Preview
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          className="w-full"
          onClick={() => onDownload(file)}
        >
          <Download className="mr-1 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

interface TemplateBrowserProps {
  onTemplateSelect?: (file: GoogleDriveFile) => void;
}

export function TemplateBrowser({ onTemplateSelect }: TemplateBrowserProps) {
  // Use memoized state to prevent re-renders
  const { userId } = useUserProfileData();
  
  // Local component state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Use our new Google Drive files hook
  const {
    files,
    categories,
    isLoading,
    hasError,
    applyFilter,
    applySearch,
    refreshFiles
  } = useGoogleDriveFiles({
    category: activeCategory,
    searchQuery: searchTerm,
    limit: 12
  });
  
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleSearch = () => {
    applySearch(searchTerm);
  };
  
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    applyFilter(category);
  };
  
  const handlePreview = (file: GoogleDriveFile) => {
    setSelectedFile(file);
    
    // If external file select handler is provided, use it
    if (onTemplateSelect) {
      onTemplateSelect(file);
    } else {
      // Otherwise use internal preview modal
      setShowPreviewModal(true);
    }
  };
  
  const handleDownload = (file: GoogleDriveFile) => {
    // For Google Drive files, we need to open the direct download link
    if (file.id.startsWith('mock-')) {
      console.log('Mock download triggered for:', file.name);
      return;
    }
    
    window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, '_blank');
  };
  
  const handleOpenInDrive = (file: GoogleDriveFile) => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock open in Drive triggered for:', file.name);
      return;
    }
    
    window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
  };
  
  // Render loading skeletons
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
  
  // Render error state
  if (hasError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Failed to load templates</div>
        <p className="text-sm text-muted-foreground mb-4">
          This could be due to missing Google Drive configuration or API access.
        </p>
        <Button variant="outline" onClick={refreshFiles}>
          Try Again
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      {/* Search and filter bar */}
      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={handleSearchInput}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-10"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" className="ml-2">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={handleCategoryChange}
        className="mb-6"
      >
        <TabsList className="flex overflow-x-auto py-1 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* File grid */}
      {files.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm 
              ? `No templates matching "${searchTerm}"`
              : activeCategory !== 'all'
                ? `No templates in the ${activeCategory} category`
                : 'No templates available yet'}
          </p>
        </div>
      )}
      
      {/* Preview Modal would be implemented here */}
      {/* We'll create this as a separate component later */}
    </div>
  );
}
