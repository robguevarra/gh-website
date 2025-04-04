"use client"

import { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo
} from "lucide-react"

interface ToolbarProps {
  editor: Editor | null
  onSave: () => void
}

export function Toolbar({ editor, onSave }: ToolbarProps) {
  if (!editor) {
    return (
      <div className="flex items-center gap-1 p-2 border-b">
        <div className="text-muted-foreground text-sm">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`h-8 w-8 ${editor.isActive('underline') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`h-8 w-8 ${editor.isActive('code') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 w-8 ${editor.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 ${editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`h-8 w-8 ${editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`h-8 w-8 ${editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alignment */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`h-8 w-8 ${editor.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-foreground' : ''}`}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Links and media */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const previousUrl = editor.isActive('link') ? editor.getAttributes('link').href : ''
          const url = window.prompt('Enter URL', previousUrl)
          
          // If url is empty, remove the link
          if (url === '') {
            editor.chain().focus().unsetLink().run()
            return
          }
          
          // Set link if url is provided
          if (url) {
            // Ensure http:// or https:// is included
            const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
              ? url 
              : `https://${url}`
              
            editor.chain().focus().setLink({ href: fullUrl }).run()
          }
        }}
        className={`h-8 w-8 ${editor.isActive('link') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Insert Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const previousSrc = editor.isActive('image') ? editor.getAttributes('image').src : ''
          const url = window.prompt('Enter image URL', previousSrc)
          
          if (url) {
            editor.chain().focus().setImage({ src: url, alt: 'Image' }).run()
          }
        }}
        className={`h-8 w-8 ${editor.isActive('image') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Insert Image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`h-8 w-8 ${!editor.can().undo() ? 'opacity-50' : ''}`}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`h-8 w-8 ${!editor.can().redo() ? 'opacity-50' : ''}`}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Export for backward compatibility
export const EditorToolbar = Toolbar;