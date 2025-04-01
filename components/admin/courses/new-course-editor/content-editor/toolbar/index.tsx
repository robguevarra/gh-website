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
  Link,
  Image,
  FileVideo,
  Table,
  Code,
  Undo,
  Redo,
  PlusCircle,
  FileText,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react"
import { FormattingTools } from "./formatting-tools"
import { InsertTools } from "./insert-tools"

interface ToolbarProps {
  editorRef: RefObject<HTMLDivElement>
  onAddContent: () => void
  onAddVideo: () => void
}

export function Toolbar({ editorRef, onAddContent, onAddVideo }: ToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1 p-1 border rounded-lg bg-muted/50">
      <FormattingTools editorRef={editorRef} />
      <div className="w-px h-6 bg-border mx-1 my-auto" />
      <InsertTools 
        editorRef={editorRef}
        onAddContent={onAddContent}
        onAddVideo={onAddVideo}
      />
    </div>
  )
} 