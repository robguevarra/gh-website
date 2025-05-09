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
  onSave?: (html: string, design: any) => Promise<any>;
}

/**
 * Unlayer Email Editor following official documentation
 */
export default function UnlayerEmailEditor({
  templateId,
  initialHtml,
  initialDesign,
  onSave
}: UnlayerEmailEditorProps): JSX.Element {
  // Create a reference to the editor
  const emailEditorRef = useRef<EditorRef | null>(null);

  // Called when the editor is loaded
  const onReady = () => {
    // Track editor state for save detection
    (window as any).unlayerReady = true;
    (window as any).unlayerInstance = emailEditorRef.current?.editor;
    
    // Load the design from saved JSON
    if (emailEditorRef.current?.editor) {
      // Add event listener to detect content changes
      try {
        // Access the internal editor events to track changes
        // This is using Unlayer's internal API - not officially documented but works
        const editorInstance = emailEditorRef.current.editor as any;
        if (editorInstance.addEventListener) {
          editorInstance.addEventListener('design:updated', () => {
            // Flag that content has changed since last save
            (window as any).unlayerHasUnsavedChanges = true;
          });
        }
      } catch (err) {
        console.error('Error setting up change detection:', err);
      }
      
      // Option 1: Load from design JSON if available (preferred method per documentation)
      if (initialDesign) {
        try {
          emailEditorRef.current.editor.loadDesign(initialDesign);
          
          // Initialize with no unsaved changes since we just loaded
          (window as any).unlayerHasUnsavedChanges = false;
        } catch (error) {
          console.error('Failed to load design from JSON:', error);
        }
      } 
      // Option 2: Create design from HTML if no design JSON is available
      else if (initialHtml) {
        try {
          // This matches the official loadDesign API format
          emailEditorRef.current.editor.loadDesign({
            html: initialHtml
          } as any);
          
          // Initialize with no unsaved changes since we just loaded
          (window as any).unlayerHasUnsavedChanges = false;
        } catch (error) {
          console.error('Failed to create design from HTML:', error);
        }
      } else {
        // Starting with empty design
        (window as any).unlayerHasUnsavedChanges = false;
      }
    }
  };

  // Export HTML and design following Unlayer's official documentation
  const exportHtml = async () => {
    // Check if editor is initialized
    if (!emailEditorRef.current?.editor) {
      return false;
    }

    // Track if we have unsaved changes
    const hasChanges = (window as any).unlayerHasUnsavedChanges === true;
    
    try {
      // Step 1: Get the latest design JSON
      const design = await new Promise<any>((resolve) => {
        emailEditorRef.current?.editor?.saveDesign((designData: any) => {
          resolve(designData);
        });
      });
      
      // Step 2: Get the latest HTML output
      const htmlData = await new Promise<{html: string}>((resolve) => {
        emailEditorRef.current?.editor?.exportHtml((data: {html: string}) => {
          resolve(data);
        });
      });
      
      // Make sure HTML exists
      if (!htmlData.html) {
        return false;
      }
      
      // Step 3: Sanitize design data for storage
      let cleanDesign;
      try {
        // Create a deep copy to ensure we don't have non-serializable properties
        cleanDesign = JSON.parse(JSON.stringify(design));
      } catch (_) {
        // Provide a minimal valid design object as fallback
        cleanDesign = { body: {}, counters: {}, schemaVersion: 1 };
      }
      
      // Step 4: Reset change tracking
      (window as any).unlayerHasUnsavedChanges = false;
      
      // Step 5: Call parent's save handler with processed data
      if (onSave) {
        return await onSave(htmlData.html, cleanDesign);
      }
      
      return true;
    } catch (_) {
      return false;
    }
  };

  // Preview HTML - internal use only, uses Unlayer's built-in preview
  const previewHtml = () => {
    if (emailEditorRef.current?.editor) {
      // Since 'preview' is not directly exposed in the TypeScript types,
      // we need to use the editor as 'any' to access this method
      (emailEditorRef.current.editor as any).togglePreview();
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
  }, [onSave]);

  // Render the editor with proper default options
  // Use a container div with fixed height to control the editor size
  return (
    <div style={{ 
      width: '100%', 
      height: 'calc(100vh - 10rem)',
      position: 'relative' 
    }}>
      <EmailEditor
        ref={emailEditorRef}
        onReady={onReady}
        minHeight="100%"
        style={{ 
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          height: '100%',
          width: '100%'
        }}
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
    </div>
  );
}
