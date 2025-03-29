'use client'

import { useEffect, useState } from "react"
import { useCourseContext } from "."
import { Editor, EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Button } from "@/components/ui/button"
import { Bold, Italic, List, ListOrdered } from "lucide-react"

export default function ContentEditor() {
  const { modules, setModules, activeModuleId, activeItemId } = useCourseContext()
  const [currentContent, setCurrentContent] = useState("")

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentContent,
    onUpdate: ({ editor }) => {
      setCurrentContent(editor.getHTML())
      // Update the module content
      if (activeModuleId && activeItemId) {
        setModules(
          modules.map((module) => {
            if (module.id === activeModuleId) {
              return {
                ...module,
                items: module.items.map((item) => {
                  if (item.id === activeItemId) {
                    return {
                      ...item,
                      content: editor.getHTML(),
                    }
                  }
                  return item
                }),
              }
            }
            return module
          })
        )
      }
    },
  })

  useEffect(() => {
    // Update editor content when active item changes
    if (activeModuleId && activeItemId) {
      const module = modules.find((m) => m.id === activeModuleId)
      const item = module?.items.find((i) => i.id === activeItemId)
      if (item?.content) {
        editor?.commands.setContent(item.content)
      } else {
        editor?.commands.setContent("")
      }
    }
  }, [activeModuleId, activeItemId, modules, editor])

  if (!activeModuleId || !activeItemId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a module or item to start editing
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center space-x-2 border-b pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={editor?.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={editor?.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      <div className="prose max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
} 