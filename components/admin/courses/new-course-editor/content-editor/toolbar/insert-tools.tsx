"use client"

import { RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
  Link,
  Image,
  FileVideo,
  Table,
  Code,
  PlusCircle,
  FileText,
} from "lucide-react"

interface InsertToolsProps {
  editorRef: RefObject<HTMLDivElement>
  onAddContent: () => void
  onAddVideo: () => void
}

export function InsertTools({ 
  editorRef, 
  onAddContent, 
  onAddVideo 
}: InsertToolsProps) {
  const insertLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      document.execCommand("createLink", false, url)
      editorRef.current?.focus()
    }
  }

  const insertImage = () => {
    const url = window.prompt("Enter image URL:")
    if (url) {
      document.execCommand("insertImage", false, url)
      editorRef.current?.focus()
    }
  }

  const insertTable = () => {
    const html = `
      <table class="min-w-[400px] border-collapse border border-border">
        <thead>
          <tr>
            <th class="border border-border p-2">Header 1</th>
            <th class="border border-border p-2">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-border p-2">Cell 1</td>
            <td class="border border-border p-2">Cell 2</td>
          </tr>
        </tbody>
      </table>
    `
    document.execCommand("insertHTML", false, html)
    editorRef.current?.focus()
  }

  const insertCode = () => {
    const html = `
      <pre class="bg-muted p-4 rounded-lg"><code>// Your code here</code></pre>
    `
    document.execCommand("insertHTML", false, html)
    editorRef.current?.focus()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={insertLink}
        title="Insert Link"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={insertImage}
        title="Insert Image"
      >
        <Image className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddVideo}
        title="Insert Video"
      >
        <FileVideo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={insertTable}
        title="Insert Table"
      >
        <Table className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={insertCode}
        title="Insert Code Block"
      >
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 my-auto" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddContent}
        title="Add Content Block"
      >
        <PlusCircle className="h-4 w-4" />
      </Button>
    </>
  )
} 