'use client'

import { type Editor } from '@tiptap/react'
import { Toggle } from '@/components/ui/toggle'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
  Link,
  Image,
  Youtube,
  FileQuestion,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MediaManager } from './media-manager'

interface EditorToolbarProps {
  editor: Editor | null
  courseId: string
}

export function EditorToolbar({ editor, courseId }: EditorToolbarProps) {
  if (!editor) return null

  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL')
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
      })
    }
  }

  const setLink = () => {
    const url = prompt('Enter URL')
    if (url) {
      editor.commands.setLink({
        href: url,
      })
    }
  }

  const handleImageSelect = (url: string) => {
    editor.commands.setImage({
      src: url,
    })
  }

  return (
    <div className="border-b p-2 flex flex-wrap gap-1">
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Table className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}>
            Insert Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
            Add Column Before
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
            Add Column After
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
            Add Row Before
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
            Add Row After
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()}>
            Delete Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={setLink}>
        <Link className="h-4 w-4" />
      </Button>

      <MediaManager courseId={courseId} onSelect={handleImageSelect} />

      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={addYoutubeVideo}>
        <Youtube className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => editor.chain().focus().setQuizBlock().run()}
      >
        <FileQuestion className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => editor.chain().focus().setAssignmentBlock().run()}
      >
        <FileCheck className="h-4 w-4" />
      </Button>
    </div>
  )
} 