'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { GoogleDriveFile } from '@/lib/hooks/use-google-drive';
import { GoogleDriveViewer } from '@/components/dashboard/google-drive-viewer';

interface TemplatePreviewModalProps {
  file: GoogleDriveFile | null;
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onDownload?: (file: GoogleDriveFile) => void;
}

export function TemplatePreviewModal({
  file,
  isOpen,
  onOpenChange,
  onClose,
  onDownload,
}: TemplatePreviewModalProps) {
  const [activeTab, setActiveTab] = useState('preview');
  
  if (!file) return null;
  
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
  
  // Generate Google Drive direct view URL
  const viewUrl = file ? `https://drive.google.com/file/d/${file.id}/view` : '';
  
  const handleDownload = () => {
    if (file && onDownload) {
      onDownload(file);
    }
  };
  
  const handleOpenInDrive = () => {
    if (file.id.startsWith('mock-')) {
      console.log('Mock open in Drive triggered for:', file.name);
      return;
    }
    window.open(viewUrl, '_blank');
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (onOpenChange) onOpenChange(open);
        if (!open && onClose) onClose();
      }}
    >
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">{file.name}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="text-xs">
                  {getFileType(file.mimeType)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {file.size || 'Unknown size'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Last modified: {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown'}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs 
          defaultValue="preview" 
          className="flex-1 flex flex-col overflow-hidden"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent 
            value="preview" 
            className="flex-1 overflow-hidden relative data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="flex-1 overflow-hidden rounded-md border">
              <GoogleDriveViewer 
                fileId={file.id}
                fileName={file.name}
                fileType={getFileType(file.mimeType).toLowerCase()}
                height="100%"
                width="100%"
                showControls={false}
              />
            </div>
          </TabsContent>
          
          <TabsContent 
            value="details" 
            className="flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {file.description || 'No description available for this template.'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Details</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Format</dt>
                    <dd>{getFileType(file.mimeType)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{file.size || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>{file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Modified</dt>
                    <dd>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown'}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Usage</h3>
                <p className="text-sm text-muted-foreground">
                  This template is free to use for all Graceful Homeschooling members. 
                  Download and customize it for your personal use.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleOpenInDrive}
              className="flex-1 sm:flex-none"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Drive
            </Button>
            <Button 
              variant="default" 
              onClick={handleDownload}
              className="flex-1 sm:flex-none"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
