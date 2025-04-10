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
import { type Template } from '@/lib/stores/student-dashboard/types';

interface TemplatePreviewModalProps {
  template: Template | null;
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onDownload?: (template: Template) => void;
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onOpenChange,
  onClose,
  onDownload,
}: TemplatePreviewModalProps) {
  const [activeTab, setActiveTab] = useState('preview');
  
  if (!template) return null;
  
  // Generate Google Drive preview URL
  const previewUrl = template ? `https://drive.google.com/file/d/${template.googleDriveId}/preview` : '';
  // Generate Google Drive direct view URL
  const viewUrl = template ? `https://drive.google.com/file/d/${template.googleDriveId}/view` : '';
  
  const handleDownload = () => {
    if (template && onDownload) {
      onDownload(template);
    }
  };
  
  const handleOpenInDrive = () => {
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
              <DialogTitle className="text-xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="text-xs">
                  {template.type.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {template.size}
                </span>
                <span className="text-xs text-muted-foreground">
                  {template.downloads} downloads
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
              <iframe 
                src={previewUrl}
                className="w-full h-full"
                allow="autoplay"
                loading="lazy"
              ></iframe>
            </div>
          </TabsContent>
          
          <TabsContent 
            value="details" 
            className="flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {template.description || 'No description available for this template.'}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Category</h3>
                <p className="text-sm text-muted-foreground">{template.category}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">File Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{' '}
                    <span>{template.type.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>{' '}
                    <span>{template.size}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Downloads:</span>{' '}
                    <span>{template.downloads}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Added:</span>{' '}
                    <span>{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-1">Usage Guidelines</h3>
                <p className="text-sm text-muted-foreground">
                  This template is provided as part of your enrollment in the Papers to Profits program.
                  You may use this template for your personal or commercial projects. Reselling or 
                  redistributing these templates is prohibited.
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
