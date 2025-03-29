"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronDown,
  ChevronRight,
  File,
  FolderClosed,
  FolderOpen,
  Video,
  FileText,
  PlusCircle,
  GripVertical,
} from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext, type Module, type ModuleItem } from "./course-editor"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function EditorSidebar() {
  const { toast } = useToast()
  const { modules, setModules, activeModuleId, setActiveModuleId, activeItemId, setActiveItemId, setSavedState } =
    useCourseContext()

  const [newContentDialogOpen, setNewContentDialogOpen] = useState(false)
  const [newModuleDialogOpen, setNewModuleDialogOpen] = useState(false)
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [newItemData, setNewItemData] = useState({
    title: "",
    type: "lesson",
  })
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newContentType, setNewContentType] = useState("")

  const toggleModule = (moduleId: string) => {
    setModules(modules.map((module) => (module.id === moduleId ? { ...module, expanded: !module.expanded } : module)))
  }

  const handleAddContent = (type: string) => {
    setNewContentType(type)

    // Find the first module to add content to
    const targetModule = modules[0]
    if (!targetModule) {
      toast({
        title: "No modules available",
        description: "Please create a module first before adding content",
        variant: "destructive",
      })
      setNewContentDialogOpen(false)
      return
    }

    const newItem: ModuleItem = {
      id: `item-${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type as any,
      duration: 10,
      content: `<p>New ${type} content goes here</p>`,
    }

    // Add the new item to the first module
    const updatedModules = modules.map((module) =>
      module.id === targetModule.id ? { ...module, items: [...module.items, newItem] } : module,
    )

    setModules(updatedModules)

    // Select the new item
    setActiveModuleId(targetModule.id)
    setActiveItemId(newItem.id)

    setNewContentDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Content added",
      description: `New ${type} has been added to your course`,
    })
  }

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the new module",
        variant: "destructive",
      })
      return
    }

    const newModule: Module = {
      id: `module-${Date.now()}`,
      title: newModuleTitle,
      description: "New module description",
      expanded: true,
      items: [],
    }

    setModules([...modules, newModule])
    setNewModuleTitle("")
    setNewModuleDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Module added",
      description: `"${newModuleTitle}" has been added to your course`,
    })
  }

  const handleAddItem = () => {
    if (!newItemData.title.trim()) {
      toast({
        title: "Item title required",
        description: "Please enter a title for the new item",
        variant: "destructive",
      })
      return
    }

    const getIcon = (type: string) => {
      switch (type) {
        case "lesson":
          return <FileText className="h-4 w-4" />
        case "video":
          return <Video className="h-4 w-4" />
        case "quiz":
        case "assignment":
          return <File className="h-4 w-4" />
        default:
          return <FileText className="h-4 w-4" />
      }
    }

    const newItem: ModuleItem = {
      id: `item-${Date.now()}`,
      title: newItemData.title,
      type: newItemData.type as any,
      duration: 10,
      content: "<p>New content goes here</p>",
    }

    setModules(
      modules.map((module) =>
        module.id === selectedModuleId ? { ...module, items: [...module.items, newItem] } : module,
      ),
    )

    setNewItemData({ title: "", type: "lesson" })
    setNewItemDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Item added",
      description: `"${newItemData.title}" has been added to the module`,
    })
  }

  const prepareAddItem = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setNewItemDialogOpen(true)
  }

  const handleSelectItem = (moduleId: string, itemId: string) => {
    setActiveModuleId(moduleId)
    setActiveItemId(itemId)
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    // If there's no destination or the item was dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    setSavedState("unsaved")

    // If dragging modules
    if (type === "SIDEBAR-MODULE") {
      const newModuleOrder = Array.from(modules)
      const [removed] = newModuleOrder.splice(source.index, 1)
      newModuleOrder.splice(destination.index, 0, removed)

      setModules(newModuleOrder)
      toast({
        title: "Module reordered",
        description: "The module order has been updated",
      })
      return
    }

    // If dragging items within the same module
    if (source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId.replace("sidebar-module-", "")
      const module = modules.find((m) => m.id === moduleId)

      if (!module) return

      const newItems = Array.from(module.items)
      const [removed] = newItems.splice(source.index, 1)
      newItems.splice(destination.index, 0, removed)

      setModules(modules.map((m) => (m.id === moduleId ? { ...m, items: newItems } : m)))

      toast({
        title: "Item reordered",
        description: "The item order has been updated",
      })
      return
    }

    // If dragging items between modules
    const sourceModuleId = source.droppableId.replace("sidebar-module-", "")
    const destModuleId = destination.droppableId.replace("sidebar-module-", "")

    const sourceModule = modules.find((m) => m.id === sourceModuleId)
    const destModule = modules.find((m) => m.id === destModuleId)

    if (!sourceModule || !destModule) return

    const sourceItems = Array.from(sourceModule.items)
    const destItems = Array.from(destModule.items)

    const [removed] = sourceItems.splice(source.index, 1)
    destItems.splice(destination.index, 0, removed)

    setModules(
      modules.map((m) => {
        if (m.id === sourceModuleId) return { ...m, items: sourceItems }
        if (m.id === destModuleId) return { ...m, items: destItems }
        return m
      }),
    )

    toast({
      title: "Item moved",
      description: `Item moved to ${destModule.title}`,
    })
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return <FileText className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "quiz":
      case "assignment":
        return <File className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="w-64 border-r bg-muted/40 flex flex-col">
      <div className="p-4 border-b">
        <Dialog open={newContentDialogOpen} onOpenChange={setNewContentDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Content</DialogTitle>
              <DialogDescription>Choose the type of content you want to add to your course.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContent("lesson")}>
                  <FileText className="h-8 w-8 mb-2" />
                  Lesson
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContent("video")}>
                  <Video className="h-8 w-8 mb-2" />
                  Video
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContent("quiz")}>
                  <File className="h-8 w-8 mb-2" />
                  Quiz
                </Button>
                <Button variant="outline" className="h-24 flex flex-col" onClick={() => handleAddContent("assignment")}>
                  <File className="h-8 w-8 mb-2" />
                  Assignment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sidebar-modules" type="SIDEBAR-MODULE">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {modules.map((module, moduleIndex) => (
                    <Draggable key={module.id} draggableId={`sidebar-${module.id}`} index={moduleIndex}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="mb-2">
                          <div className="flex items-center p-2 rounded-md hover:bg-accent cursor-pointer group">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground mr-1 opacity-0 group-hover:opacity-100" />
                            </div>
                            <div className="flex items-center flex-1" onClick={() => toggleModule(module.id)}>
                              {module.expanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground mr-1" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground mr-1" />
                              )}
                              {module.expanded ? (
                                <FolderOpen className="h-4 w-4 text-muted-foreground mr-2" />
                              ) : (
                                <FolderClosed className="h-4 w-4 text-muted-foreground mr-2" />
                              )}
                              <span className="text-sm font-medium truncate">{module.title}</span>
                            </div>
                          </div>

                          {module.expanded && (
                            <Droppable droppableId={`sidebar-module-${module.id}`} type="SIDEBAR-ITEM">
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className="ml-6 pl-2 border-l"
                                >
                                  {module.items.map((item, itemIndex) => (
                                    <Draggable key={item.id} draggableId={`sidebar-item-${item.id}`} index={itemIndex}>
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center p-2 rounded-md hover:bg-accent cursor-pointer group ${
                                            activeModuleId === module.id && activeItemId === item.id ? "bg-accent" : ""
                                          }`}
                                          onClick={() => handleSelectItem(module.id, item.id)}
                                        >
                                          <div {...provided.dragHandleProps}>
                                            <GripVertical className="h-4 w-4 text-muted-foreground mr-1 opacity-0 group-hover:opacity-100" />
                                          </div>
                                          {getItemIcon(item.type)}
                                          <span className="ml-2 text-sm truncate">{item.title}</span>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-1 mt-1 h-7 text-xs text-muted-foreground"
                                    onClick={() => prepareAddItem(module.id)}
                                  >
                                    <PlusCircle className="h-3 w-3 mr-1" />
                                    Add item
                                  </Button>
                                </div>
                              )}
                            </Droppable>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Dialog open={newModuleDialogOpen} onOpenChange={setNewModuleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start mt-2 text-muted-foreground">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Module</DialogTitle>
                <DialogDescription>Create a new module to organize your course content.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="module-title">Module Title</Label>
                  <Input
                    id="module-title"
                    placeholder="e.g., Module 4: Advanced Techniques"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddModule}>Add Module</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>Add a new content item to your module.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="item-title">Item Title</Label>
                  <Input
                    id="item-title"
                    placeholder="e.g., Introduction to SEO"
                    value={newItemData.title}
                    onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-type">Item Type</Label>
                  <Select
                    value={newItemData.type}
                    onValueChange={(value) => setNewItemData({ ...newItemData, type: value })}
                  >
                    <SelectTrigger id="item-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson">Lesson</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  )
}

