'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import EmailEditor, { EditorRef as UnlayerReactEditorRef } from 'react-email-editor';
import { useTheme } from 'next-themes';

export interface EditorRef {
  exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
  loadDesign: (design: any) => void;
  getEditorInstance: () => UnlayerReactEditorRef['editor'] | null;
}

export interface UnlayerEmailEditorProps {
  initialDesign?: any;
  initialHtml?: string;
  minHeight?: string | number;
  onSave?: (design: any, html: string) => void;
}

const UnlayerEmailEditor = forwardRef<EditorRef, UnlayerEmailEditorProps>((
  { initialDesign, initialHtml, minHeight = '80vh', onSave }, 
  ref
) => {
  const emailEditorRef = useRef<UnlayerReactEditorRef>(null);
  const { resolvedTheme } = useTheme();
  const [isLoaded, setIsLoaded] = React.useState(false);

  useImperativeHandle(ref, () => ({
    exportHtml: (callback) => {
      emailEditorRef.current?.editor?.exportHtml(callback);
    },
    loadDesign: (design) => {
      emailEditorRef.current?.editor?.loadDesign(design);
    },
    getEditorInstance: () => emailEditorRef.current?.editor || null,
  }));

  const onLoad = () => {
    setIsLoaded(true);
    if (initialDesign && emailEditorRef.current?.editor) {
      try {
        if (typeof initialDesign === 'string') {
            const parsedDesign = JSON.parse(initialDesign);
            emailEditorRef.current.editor.loadDesign(parsedDesign);
        } else if (typeof initialDesign === 'object' && initialDesign !== null) {
            emailEditorRef.current.editor.loadDesign(initialDesign);
        } 
      } catch (error) {
        console.error('Failed to load initial design into Unlayer editor:', error);
      }
    } else if (initialHtml && !initialDesign && emailEditorRef.current?.editor) {
        console.warn('UnlayerEmailEditor: initialHtml provided without initialDesign. HTML import to design is complex and not directly supported for initial load via design JSON. Consider saving templates with design JSON.');
    }
  };

  useEffect(() => {
    if (isLoaded && initialDesign && emailEditorRef.current?.editor) {
        if (typeof initialDesign === 'string') {
            try {
                const parsedDesign = JSON.parse(initialDesign);
                emailEditorRef.current.editor.loadDesign(parsedDesign);
            } catch (e) { console.error("Error parsing initialDesign string for update:", e); }
        } else if (typeof initialDesign === 'object' && initialDesign !== null) {
            emailEditorRef.current.editor.loadDesign(initialDesign);
        }
    }
  }, [initialDesign, isLoaded]); 

  useEffect(() => {
    if (emailEditorRef.current?.editor) {
      const editor = emailEditorRef.current.editor;
      (window as any).unlayerInstance = editor;
      (window as any).unlayerExportHtml = (callback: (data: { design: any; html: string }) => void) => {
        editor.exportHtml(callback);
      };
      (window as any).unlayerLoadDesign = (design: any) => {
        editor.loadDesign(design);
      };
    }
    return () => {
      delete (window as any).unlayerInstance;
      delete (window as any).unlayerExportHtml;
      delete (window as any).unlayerLoadDesign;
    };
  }, []);

  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: minHeight }}>
      <EmailEditor
        ref={emailEditorRef}
        onLoad={onLoad}
        options={{
          displayMode: 'email',
          safeHtml: true,
        }}
        appearance={{
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
        }}
        style={{ flexGrow: 1 }}
      />
    </div>
  );
});

UnlayerEmailEditor.displayName = 'UnlayerEmailEditor';

export default UnlayerEmailEditor;
