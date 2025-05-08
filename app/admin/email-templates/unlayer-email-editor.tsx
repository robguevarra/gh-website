'use client';

/**
 * Unlayer Email Editor Component
 * 
 * Following the official Unlayer documentation:
 * https://docs.unlayer.com/builder/templates/management
 */

import React, { useRef } from 'react';
import EmailEditor, { EditorRef } from 'react-email-editor';

// Define props for our component
export interface UnlayerEmailEditorProps {
  templateId?: string;
  initialHtml?: string;
  initialDesign?: any;
  onSave?: (html: string, design: any) => Promise<void>;
  onPreview?: (html: string) => void;
}

/**
 * Unlayer Email Editor following official documentation
 */
export default function UnlayerEmailEditor({
  templateId,
  initialHtml,
  initialDesign,
  onSave,
  onPreview
}: UnlayerEmailEditorProps) {
  // Create a reference to the editor
  const emailEditorRef = useRef<EditorRef | null>(null);

  // Called when the editor is loaded
  const onReady = () => {
    console.log('Editor ready!');
    
    // Load the design from saved JSON
    if (emailEditorRef.current?.editor) {
      // Option 1: Load from design JSON if available (preferred method per documentation)
      if (initialDesign) {
        try {
          console.log('Loading design from JSON:', initialDesign);
          emailEditorRef.current.editor.loadDesign(initialDesign);
          console.log('Design loaded from JSON!');
        } catch (error) {
          console.error('Failed to load design from JSON:', error);
        }
      } 
      // Option 2: Create design from HTML if no design JSON is available
      else if (initialHtml) {
        try {
          console.log('Creating design from HTML');
          // This matches the official loadDesign API format
          // Use type assertion for HTML loading
          emailEditorRef.current.editor.loadDesign({
            html: initialHtml
          } as any);
          console.log('Design created from HTML!');
        } catch (error) {
          console.error('Failed to create design from HTML:', error);
        }
      } else {
        console.log('Starting with empty design');
      }
    }
  };

  // Export HTML per official documentation
  const exportHtml = () => {
    if (emailEditorRef.current?.editor) {
      console.log('Exporting HTML and design...');
      emailEditorRef.current.editor.exportHtml(async (data) => {
        const { design, html } = data;
        console.log('HTML exported');
        if (onSave) {
          await onSave(html, design);
        }
      });
    }
  };

  // Preview HTML
  const previewHtml = () => {
    if (emailEditorRef.current?.editor) {
      console.log('Generating preview...');
      emailEditorRef.current.editor.exportHtml(data => {
        const { html } = data;
        console.log('Preview generated');
        if (onPreview) {
          onPreview(html);
        }
      });
    }
  };

  // Make methods available via window
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).unlayerExportHtml = exportHtml;
      (window as any).unlayerPreview = previewHtml;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).unlayerExportHtml;
        delete (window as any).unlayerPreview;
      }
    };
  }, [onSave, onPreview]);

  // Render the editor with proper default options
  return (
    <EmailEditor
      ref={emailEditorRef}
      onReady={onReady}
      minHeight="600px"
      options={{
        // Include basic configuration
        displayMode: 'email',
        projectId: 1,
        // Appearance customization
        appearance: {
          theme: 'light',
          panels: {
            tools: {
              dock: 'left'
            }
          }
        }
      }}
    />
  );
}
