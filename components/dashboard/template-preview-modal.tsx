'use client';

import { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X as CloseIcon } from 'lucide-react';
import type { DriveItem } from '@/lib/google-drive/driveApiUtils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface TemplatePreviewModalProps {
  file: DriveItem | null;
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onDownload?: (file: DriveItem) => void;
}

export function TemplatePreviewModal({
  file,
  isOpen,
  onOpenChange,
  onClose,
  onDownload,
}: TemplatePreviewModalProps) {
  if (!file) return null;

  // Create the direct Google Drive preview URL
  const getPreviewUrl = (fileId: string): string => {
    console.log('Getting preview URL for file ID:', fileId);

    // For mock files in development, return a placeholder
    if (fileId.startsWith('mock-')) {
      console.log('Using mock preview URL for development');
      return 'https://docs.google.com/viewer?embedded=true&url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }

    // Direct Google Drive preview URL
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview?usp=sharing`;
    console.log('Generated preview URL:', previewUrl);
    return previewUrl;
  };

  // URL for opening in a new tab
  const viewUrl = file.id ? `https://drive.google.com/file/d/${file.id}/view` : '';

  const handleDownload = () => {
    if (file && onDownload) {
      onDownload(file);
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
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] h-[98vh] p-0 overflow-hidden border-0 rounded-none">
        {/* Accessible title that's visually hidden */}
        <VisuallyHidden asChild>
          <DialogTitle>{file.name || 'Document Preview'}</DialogTitle>
        </VisuallyHidden>

        {/* Minimal floating action buttons in the top-right corner */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInDrive}
            className="bg-white/90 hover:bg-white shadow-sm"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="ml-1.5 sm:inline hidden">Open</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-white/90 hover:bg-white shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span className="ml-1.5 sm:inline hidden">Download</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
            onClick={() => {
              if (onClose) onClose();
              if (onOpenChange) onOpenChange(false);
            }}
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Full-screen iframe with Google Drive's native preview */}
        <iframe
          src={getPreviewUrl(file.id)}
          className="w-full h-full border-0"
          frameBorder="0"
          allowFullScreen
          loading="eager"
          title={file.name || 'Document Preview'}
          onLoad={() => console.log('Preview iframe loaded successfully')}
          onError={() => console.error('Error loading preview iframe')}
        />
      </DialogContent>
    </Dialog>
  );
}
