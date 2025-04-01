"use client"

import { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Save,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3
} from "lucide-react"

interface EditorToolbarProps {
  editor?: Editor | null
  onSave: () => void
}

export function EditorToolbar({ editor, onSave }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b flex-wrap">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSave}
        className="h-8 px-2"
      >
        <Save className="h-4 w-4" />
        <span className="ml-2">Save</span>
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        data-active={editor?.isActive("bold")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        data-active={editor?.isActive("italic")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleCode().run()}
        data-active={editor?.isActive("code")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        data-active={editor?.isActive("heading", { level: 1 })}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor?.isActive("heading", { level: 2 })}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor?.isActive("heading", { level: 3 })}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        data-active={editor?.isActive("bulletList")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        data-active={editor?.isActive("orderedList")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        data-active={editor?.isActive("blockquote")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-2" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt("Enter the URL")
          if (url) {
            editor?.chain().focus().setLink({ href: url }).run()
          }
        }}
        data-active={editor?.isActive("link")}
        className="h-8 w-8 p-0 data-[active=true]:bg-accent"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt("Enter the image URL")
          if (url) {
            editor?.chain().focus().setImage({ src: url }).run()
          }
        }}
        className="h-8 w-8 p-0"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  )
} 