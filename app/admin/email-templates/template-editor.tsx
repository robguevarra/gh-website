'use client';

/**
 * Email Template Editor Component
 * 
 * This component provides a rich text editor for email templates using TipTap
 * with specialized extensions for email creation. The user gets a visual editor
 * while the system handles MJML conversion in the background.
 */

import { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info } from 'lucide-react';

// Import TipTap components and extensions
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';

// Import our custom email extensions
import {
  EmailButton,
  EmailColumns,
  EmailColumn,
  EmailDivider,
  EmailCard,
  EmailImage,
  EmailSpacing,
  EmailHeader,
  EmailFooter
} from '@/lib/services/email/tiptap-extensions';

// Import our enhanced email toolbar
import EmailEditorToolbar from './email-editor-toolbar';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TemplateEditor({ value, onChange, placeholder = 'Start typing your email content...' }: TemplateEditorProps) {
  // Initialize TipTap editor with needed extensions including our email-specific ones
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md max-w-full',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TextStyle,
      // Email-specific extensions
      EmailButton.configure({
        HTMLAttributes: {
          class: 'email-button',
        },
      }),
      EmailColumns,
      EmailColumn,
      EmailDivider,
      // New email components
      EmailCard.configure({
        HTMLAttributes: {
          class: 'email-card',
        },
      }),
      EmailImage.configure({
        HTMLAttributes: {
          class: 'email-image',
        },
      }),
      EmailSpacing.configure({
        HTMLAttributes: {
          class: 'email-spacing',
        },
      }),
      EmailHeader.configure({
        HTMLAttributes: {
          class: 'email-header',
        },
      }),
      EmailFooter.configure({
        HTMLAttributes: {
          class: 'email-footer',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  
  // Update editor content when value prop changes
  const updateEditorContent = useCallback(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);
  
  // Apply content updates when value changes
  useEffect(() => {
    updateEditorContent();
  }, [value, updateEditorContent]);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Email Content</Label>
      </div>
      
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="visual">Visual Editor</TabsTrigger>
          <TabsTrigger value="code">HTML Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className="border rounded-md p-0 overflow-hidden">
          <div className="bg-white">
            {editor && <EmailEditorToolbar editor={editor} />}
            <div className="p-4 min-h-[400px]">
              <EditorContent editor={editor} className="prose prose-sm max-w-none min-h-[400px]" />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="code" className="border rounded-md p-4">
          <pre className="text-xs overflow-auto bg-muted/50 p-4 rounded-md h-[400px]">
            {editor ? editor.getHTML() : value}
          </pre>
        </TabsContent>
      </Tabs>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Use <code className="bg-muted p-1 rounded text-xs">{"{{ variableName }}"}</code> syntax for dynamic content. Your content will be automatically converted to responsive email HTML.
        </AlertDescription>
      </Alert>
    </div>
  );
}
