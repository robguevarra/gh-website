"use client"

import { RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react"

interface FormattingToolsProps {
  editorRef: RefObject<HTMLDivElement>
}

export function FormattingTools({ editorRef }: FormattingToolsProps) {
  const applyFormatting = (command: string, value = "") => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("underline")}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 my-auto" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("justifyLeft")}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("justifyCenter")}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("justifyRight")}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 my-auto" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("insertUnorderedList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("insertOrderedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 my-auto" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("formatBlock", "<h1>")}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("formatBlock", "<h2>")}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => applyFormatting("formatBlock", "<h3>")}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
    </>
  )
} 