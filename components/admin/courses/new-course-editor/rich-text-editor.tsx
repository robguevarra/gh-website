"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface RichTextEditorProps {
  initialContent: string
  onChange: (content: string) => void
}

export default function RichTextEditor({ initialContent, onChange }: RichTextEditorProps) {
  const [editorContent, setEditorContent] = useState(initialContent)

  useEffect(() => {
    // Initialize editor content
    setEditorContent(initialContent)
  }, [initialContent])

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML
    setEditorContent(content)
    onChange(content)
  }

  return (
    <div
      className="min-h-[400px] border rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      contentEditable={true}
      dangerouslySetInnerHTML={{ __html: editorContent }}
      onInput={handleInput}
      suppressContentEditableWarning={true}
    />
  )
}

