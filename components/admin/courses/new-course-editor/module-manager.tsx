"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  File,
  PlusCircle,
  Trash2,
  Copy,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCourseContext, type EditorModule, type ModuleItem } from "./course-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type ItemType = "lesson" | "video" | "quiz" | "assignment"

interface NewItemData {
  title: string
  type: ItemType
  duration: number
}

export default function ModuleManager() {
  const { toast } = useToast()
  const { modules, setModules, setSavedState } = useCourseContext()

  const [newModuleDialogOpen, setNewModuleDialogOpen] = useState(false)
  const [newModuleData, setNewModuleData] = useState({
    title: "",
    description: "",
  })
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false)
  const [currentModule, setCurrentModule] = useState<EditorModule | null>(null)
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [newItemData, setNewItemData] = useState<NewItemData>({
    title: "",
    type: "lesson",
    duration: 10,
  })

  const handleAddModule = async () => {
    if (!newModuleData.title.trim()) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the new module",
        variant: "destructive",
      })
      return
    }

    try {
      setSavedState("saving")
      
      const newModule: EditorModule = {
        id: crypto.randomUUID(),
        title: newModuleData.title.trim(),
        description: newModuleData.description.trim(),
        expanded: true,
        items: []
      }

      setModules(prevModules => [...prevModules, newModule])
      setNewModuleData({ title: "", description: "" })
      setNewModuleDialogOpen(false)
      setSavedState("unsaved")

      toast({
        title: "Module added",
        description: `"${newModuleData.title}" has been added to your course`,
      })
    } catch (error) {
      console.error("Failed to add module:", error)
      toast({
        title: "Error adding module",
        description: "Failed to add new module. Please try again.",
        variant: "destructive",
      })
      setSavedState("unsaved")
    }
  }

  const handleAddItem = async () => {
    if (!newItemData.title.trim() || !selectedModuleId) {
      toast({
        title: "Invalid item data",
        description: "Please enter a title for the new item",
        variant: "destructive",
      })
      return
    }

    try {
      setSavedState("saving")
      
      const newItem: ModuleItem = {
        id: crypto.randomUUID(),
        title: newItemData.title.trim(),
        type: newItemData.type,
        content: "",
        duration: newItemData.duration
      }

      setModules(prevModules => 
        prevModules.map(module => 
          module.id === selectedModuleId
            ? { ...module, items: [...module.items, newItem] }
            : module
        )
      )

      setNewItemData({ title: "", type: "lesson", duration: 10 })
      setNewItemDialogOpen(false)
      setSavedState("unsaved")

      toast({
        title: "Item added",
        description: `New ${newItemData.type} has been added to the module`,
      })
    } catch (error) {
      console.error("Failed to add item:", error)
      toast({
        title: "Error adding item",
        description: "Failed to add new item. Please try again.",
        variant: "destructive",
      })
      setSavedState("unsaved")
    }
  }

  const handleEditModule = () => {
    if (!currentModule?.title.trim()) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the module",
        variant: "destructive",
      })
      return
    }

    setModules(prevModules => 
      prevModules.map(module => 
        module.id === currentModule.id ? currentModule : module
      )
    )

    setEditModuleDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Module updated",
      description: `"${currentModule.title}" has been updated`,
    })
  }

  const handleDeleteModule = (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module? This action cannot be undone.")) {
      return
    }

    setModules(prevModules => prevModules.filter(module => module.id !== moduleId))
    setSavedState("unsaved")

    toast({
      title: "Module deleted",
      description: "The module has been removed from your course",
    })
  }

  const handleDeleteItem = (moduleId: string, itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return
    }

    setModules(prevModules => 
      prevModules.map(module => 
        module.id === moduleId
          ? { ...module, items: module.items.filter(item => item.id !== itemId) }
          : module
      )
    )
    setSavedState("unsaved")

    toast({
      title: "Item deleted",
      description: "The item has been removed from the module",
    })
  }

  const handleDuplicateModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId)
    if (!module) return

    const duplicatedModule: EditorModule = {
      ...module,
      id: crypto.randomUUID(),
      title: `${module.title} (Copy)`,
      items: module.items.map(item => ({
        ...item,
        id: crypto.randomUUID()
      }))
    }

    setModules(prevModules => [...prevModules, duplicatedModule])
    setSavedState("unsaved")

    toast({
      title: "Module duplicated",
      description: `"${module.title}" has been duplicated`,
    })
  }

  const handleDuplicateItem = (moduleId: string, itemId: string) => {
    const module = modules.find(m => m.id === moduleId)
    const item = module?.items.find(i => i.id === itemId)
    if (!module || !item) return

    const duplicatedItem: ModuleItem = {
      ...item,
      id: crypto.randomUUID(),
      title: `${item.title} (Copy)`
    }

    setModules(prevModules => 
      prevModules.map(m => 
        m.id === moduleId
          ? { ...m, items: [...m.items, duplicatedItem] }
          : m
      )
    )
    setSavedState("unsaved")

    toast({
      title: "Item duplicated",
      description: `"${item.title}" has been duplicated`,
    })
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    setSavedState("unsaved")

    if (type === "MODULE") {
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

    if (source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId.replace("module-items-", "")
      const module = modules.find(m => m.id === moduleId)
      if (!module) return

      const newItems = Array.from(module.items)
      const [removed] = newItems.splice(source.index, 1)
      newItems.splice(destination.index, 0, removed)

      setModules(prevModules => 
        prevModules.map(m => 
          m.id === moduleId ? { ...m, items: newItems } : m
        )
      )

      toast({
        title: "Item reordered",
        description: "The item order has been updated",
      })
      return
    }

    const sourceModuleId = source.droppableId.replace("module-items-", "")
    const destModuleId = destination.droppableId.replace("module-items-", "")
    const sourceModule = modules.find(m => m.id === sourceModuleId)
    const destModule = modules.find(m => m.id === destModuleId)
    if (!sourceModule || !destModule) return

    const sourceItems = Array.from(sourceModule.items)
    const destItems = Array.from(destModule.items)
    const [removed] = sourceItems.splice(source.index, 1)
    destItems.splice(destination.index, 0, removed)

    setModules(prevModules => 
      prevModules.map(m => {
        if (m.id === sourceModuleId) return { ...m, items: sourceItems }
        if (m.id === destModuleId) return { ...m, items: destItems }
        return m
      })
    )

    toast({
      title: "Item moved",
      description: `Item moved to ${destModule.title}`,
    })
  }

  const toggleModule = (moduleId: string) => {
    setModules(prevModules => 
      prevModules.map(module => 
        module.id === moduleId
          ? { ...module, expanded: !module.expanded }
          : module
      )
    )
  }

  const openEditModuleDialog = (module: EditorModule) => {
    setCurrentModule(module)
    setEditModuleDialogOpen(true)
  }

  const prepareAddItem = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setNewItemDialogOpen(true)
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Course Modules</h2>
        <Button onClick={() => setNewModuleDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="modules" type="MODULE">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {modules.map((module, index) => (
                <Draggable key={module.id} draggableId={module.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="relative"
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-2">
                          <div {...provided.dragHandleProps}>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => toggleModule(module.id)}
                          >
                            {module.expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <CardTitle className="text-base">{module.title}</CardTitle>
                            {module.description && (
                              <CardDescription className="text-sm">
                                {module.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditModuleDialog(module)}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDuplicateModule(module.id)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteModule(module.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {module.expanded && (
                        <CardContent>
                          <Droppable droppableId={`module-items-${module.id}`} type="ITEM">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                              >
                                {module.items.map((item, itemIndex) => (
                                  <Draggable
                                    key={item.id}
                                    draggableId={item.id}
                                    index={itemIndex}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center gap-2 rounded-md border p-2 bg-background"
                                      >
                                        <div {...provided.dragHandleProps}>
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        {getItemIcon(item.type)}
                                        <span className="flex-1 text-sm">{item.title}</span>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleDuplicateItem(module.id, item.id)}
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleDeleteItem(module.id, item.id)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-6 mt-1 text-xs text-muted-foreground"
                                  onClick={() => prepareAddItem(module.id)}
                                >
                                  <PlusCircle className="h-3 w-3 mr-1" />
                                  Add item
                                </Button>
                              </div>
                            )}
                          </Droppable>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Dialog open={newModuleDialogOpen} onOpenChange={setNewModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
            <DialogDescription>Create a new module for your course.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="module-title">Module Title</Label>
              <Input
                id="module-title"
                placeholder="e.g., Introduction to the Course"
                value={newModuleData.title}
                onChange={(e) => setNewModuleData({ ...newModuleData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="module-description">Description (Optional)</Label>
              <Textarea
                id="module-description"
                placeholder="Brief description of the module"
                value={newModuleData.description}
                onChange={(e) => setNewModuleData({ ...newModuleData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddModule}>Add Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModuleDialogOpen} onOpenChange={setEditModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>Update module details.</DialogDescription>
          </DialogHeader>
          {currentModule && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-module-title">Module Title</Label>
                <Input
                  id="edit-module-title"
                  value={currentModule.title}
                  onChange={(e) => setCurrentModule({ ...currentModule, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-module-description">Description</Label>
                <Textarea
                  id="edit-module-description"
                  value={currentModule.description}
                  onChange={(e) => setCurrentModule({ ...currentModule, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditModule}>Save Changes</Button>
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
              <select
                id="item-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newItemData.type}
                onChange={(e) => setNewItemData({ ...newItemData, type: e.target.value as ItemType })}
              >
                <option value="lesson">Lesson</option>
                <option value="video">Video</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-duration">Duration (minutes)</Label>
              <Input
                id="item-duration"
                type="number"
                min="1"
                value={newItemData.duration}
                onChange={(e) => setNewItemData({ ...newItemData, duration: Number(e.target.value) || 10 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

