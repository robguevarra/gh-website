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
import { useCourseContext } from "./course-editor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export default function ModuleManager() {
  const { toast } = useToast()
  const { modules, setModules, setSavedState } = useCourseContext()

  const [newModuleDialogOpen, setNewModuleDialogOpen] = useState(false)
  const [newModuleData, setNewModuleData] = useState({
    title: "",
    description: "",
  })
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false)
  const [currentModule, setCurrentModule] = useState<any>(null)
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState("")
  const [newItemData, setNewItemData] = useState({
    title: "",
    type: "lesson",
    duration: 10,
  })

  const toggleModule = (moduleId: string) => {
    setModules(modules.map((module) => (module.id === moduleId ? { ...module, expanded: !module.expanded } : module)))
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    // If there's no destination or the item was dropped in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    setSavedState("unsaved")

    // If dragging modules
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

    // If dragging items within the same module
    if (source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId.replace("module-items-", "")
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
    const sourceModuleId = source.droppableId.replace("module-items-", "")
    const destModuleId = destination.droppableId.replace("module-items-", "")

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

  const handleAddModule = () => {
    if (!newModuleData.title.trim()) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the new module",
        variant: "destructive",
      })
      return
    }

    const newModule = {
      id: `module-${Date.now()}`,
      title: newModuleData.title,
      description: newModuleData.description,
      expanded: true,
      items: [],
    }

    setModules([...modules, newModule])
    setNewModuleData({ title: "", description: "" })
    setNewModuleDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Module added",
      description: `"${newModuleData.title}" has been added to your course`,
    })
  }

  const handleEditModule = () => {
    if (!currentModule) return

    if (!currentModule.title.trim()) {
      toast({
        title: "Module title required",
        description: "Please enter a title for the module",
        variant: "destructive",
      })
      return
    }

    setModules(modules.map((module) => (module.id === currentModule.id ? currentModule : module)))

    setEditModuleDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Module updated",
      description: `"${currentModule.title}" has been updated`,
    })
  }

  const handleDeleteModule = (moduleId: string) => {
    if (confirm("Are you sure you want to delete this module? This action cannot be undone.")) {
      setModules(modules.filter((module) => module.id !== moduleId))
      setSavedState("unsaved")

      toast({
        title: "Module deleted",
        description: "The module has been removed from your course",
      })
    }
  }

  const handleDuplicateModule = (moduleId: string) => {
    const moduleToDuplicate = modules.find((module) => module.id === moduleId)
    if (!moduleToDuplicate) return

    const newModule = {
      ...moduleToDuplicate,
      id: `module-${Date.now()}`,
      title: `${moduleToDuplicate.title} (Copy)`,
      items: moduleToDuplicate.items.map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      })),
    }

    setModules([...modules, newModule])
    setSavedState("unsaved")

    toast({
      title: "Module duplicated",
      description: `"${moduleToDuplicate.title}" has been duplicated`,
    })
  }

  const openEditModuleDialog = (module: any) => {
    setCurrentModule(module)
    setEditModuleDialogOpen(true)
  }

  const prepareAddItem = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setNewItemDialogOpen(true)
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

    const newItem = {
      id: `item-${Date.now()}`,
      title: newItemData.title,
      type: newItemData.type,
      duration: Number.parseInt(newItemData.duration.toString()),
      content: "<p>New content goes here</p>",
    }

    setModules(
      modules.map((module) =>
        module.id === selectedModuleId ? { ...module, items: [...module.items, newItem] } : module,
      ),
    )

    setNewItemData({ title: "", type: "lesson", duration: 10 })
    setNewItemDialogOpen(false)
    setSavedState("unsaved")

    toast({
      title: "Item added",
      description: `"${newItemData.title}" has been added to the module`,
    })
  }

  const handleDeleteItem = (moduleId: string, itemId: string) => {
    if (confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      setModules(
        modules.map((module) =>
          module.id === moduleId ? { ...module, items: module.items.filter((item) => item.id !== itemId) } : module,
        ),
      )
      setSavedState("unsaved")

      toast({
        title: "Item deleted",
        description: "The item has been removed from the module",
      })
    }
  }

  const handleDuplicateItem = (moduleId: string, itemId: string) => {
    const module = modules.find((m) => m.id === moduleId)
    if (!module) return

    const itemToDuplicate = module.items.find((item) => item.id === itemId)
    if (!itemToDuplicate) return

    const newItem = {
      ...itemToDuplicate,
      id: `item-${Date.now()}`,
      title: `${itemToDuplicate.title} (Copy)`,
    }

    setModules(modules.map((m) => (m.id === moduleId ? { ...m, items: [...m.items, newItem] } : m)))
    setSavedState("unsaved")

    toast({
      title: "Item duplicated",
      description: `"${itemToDuplicate.title}" has been duplicated`,
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Course Structure</h2>
        <Dialog open={newModuleDialogOpen} onOpenChange={setNewModuleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  value={newModuleData.title}
                  onChange={(e) => setNewModuleData({ ...newModuleData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="module-description">Description</Label>
                <Textarea
                  id="module-description"
                  placeholder="Brief description of this module"
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
                      className="border-2 border-dashed border-muted hover:border-muted-foreground/50"
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center">
                          <div {...provided.dragHandleProps} className="mr-2">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div
                            className="flex items-center cursor-pointer flex-1"
                            onClick={() => toggleModule(module.id)}
                          >
                            {module.expanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground mr-2" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground mr-2" />
                            )}
                            <div>
                              <CardTitle>{module.title}</CardTitle>
                              <CardDescription>{module.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditModuleDialog(module)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDuplicateModule(module.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteModule(module.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {module.expanded && (
                        <CardContent className="p-4 pt-0">
                          <Droppable droppableId={`module-items-${module.id}`} type="ITEM">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2 ml-7 pl-2 border-l"
                              >
                                {module.items.map((item, itemIndex) => (
                                  <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center p-2 rounded-md bg-muted/50 hover:bg-muted group"
                                      >
                                        <div {...provided.dragHandleProps} className="mr-2">
                                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        {getItemIcon(item.type)}
                                        <span className="ml-2 flex-1">{item.title}</span>
                                        <span className="text-xs text-muted-foreground mr-2">{item.duration} min</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => {
                                              // Edit item functionality would go here
                                              toast({
                                                title: "Edit item",
                                                description: "Item editing would open here",
                                              })
                                            }}
                                          >
                                            <Settings className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
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
                onChange={(e) => setNewItemData({ ...newItemData, type: e.target.value })}
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
                onChange={(e) => setNewItemData({ ...newItemData, duration: Number.parseInt(e.target.value) || 10 })}
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

