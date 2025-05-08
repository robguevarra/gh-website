'use client';

/**
 * Email Template Preview Component
 * 
 * This component renders an email template preview inside an iframe
 * to properly display the rendered HTML email as it would appear in email clients.
 */

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface TemplatePreviewProps {
  html: string;
}

export default function TemplatePreview({ html }: TemplatePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (iframeRef.current && html) {
      // Update iframe content when HTML changes
      const iframe = iframeRef.current;
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDocument) {
        iframeDocument.open();
        iframeDocument.write(html);
        iframeDocument.close();
        
        // Add media query for responsive preview
        const style = iframeDocument.createElement('style');
        style.textContent = `
          @media screen and (max-width: 600px) {
            body {
              zoom: 0.8;
            }
          }
        `;
        iframeDocument.head.appendChild(style);
      }
    }
  }, [html]);
  
  if (!html) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted/20">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full bg-white">
      <iframe
        ref={iframeRef}
        title="Email Template Preview"
        className="w-full h-[600px] border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
