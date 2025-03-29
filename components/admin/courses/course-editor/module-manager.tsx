import { useCourseContext } from "."
import { Module, ModuleItem } from "."
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash } from "lucide-react"

export default function ModuleManager() {
  const {
    modules,
    setModules,
    activeModuleId,
    setActiveModuleId,
    activeItemId,
    setActiveItemId,
  } = useCourseContext()

  const handleUpdateModule = (moduleId: string, updates: Partial<Module>) => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          return { ...module, ...updates }
        }
        return module
      })
    )
  }

  const handleUpdateItem = (moduleId: string, itemId: string, updates: Partial<ModuleItem>) => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            items: module.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, ...updates }
              }
              return item
            }),
          }
        }
        return module
      })
    )
  }

  const handleDeleteModule = (moduleId: string) => {
    setModules(modules.filter((module) => module.id !== moduleId))
    if (activeModuleId === moduleId) {
      setActiveModuleId(null)
      setActiveItemId(null)
    }
  }

  const handleDeleteItem = (moduleId: string, itemId: string) => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            items: module.items.filter((item) => item.id !== itemId),
          }
        }
        return module
      })
    )
    if (activeItemId === itemId) {
      setActiveItemId(null)
    }
  }

  const handleAddModule = () => {
    const newModule = {
      id: `module-${modules.length + 1}`,
      title: `New Module ${modules.length + 1}`,
      description: "Module description",
      expanded: true,
      items: [],
    }
    setModules([...modules, newModule])
  }

  const handleAddItem = (moduleId: string) => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            items: [
              ...module.items,
              {
                id: `item-${module.items.length + 1}`,
                title: `New Item ${module.items.length + 1}`,
                type: "lesson",
                duration: 0,
              },
            ],
          }
        }
        return module
      })
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button onClick={handleAddModule} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      </div>
      <div className="space-y-8">
        {modules.map((module) => (
          <div key={module.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2 flex-1 mr-4">
                <Label htmlFor={`module-title-${module.id}`}>Module Title</Label>
                <Input
                  id={`module-title-${module.id}`}
                  value={module.title}
                  onChange={(e) =>
                    handleUpdateModule(module.id, { title: e.target.value })
                  }
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDeleteModule(module.id)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
            <div className="mb-4">
              <Label htmlFor={`module-desc-${module.id}`}>Description</Label>
              <Textarea
                id={`module-desc-${module.id}`}
                value={module.description}
                onChange={(e) =>
                  handleUpdateModule(module.id, { description: e.target.value })
                }
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Items</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddItem(module.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              {module.items.map((item) => (
                <div key={item.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Input
                      value={item.title}
                      onChange={(e) =>
                        handleUpdateItem(module.id, item.id, {
                          title: e.target.value,
                        })
                      }
                      className="flex-1 mr-2"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteItem(module.id, item.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={item.type}
                      onChange={(e) =>
                        handleUpdateItem(module.id, item.id, {
                          type: e.target.value as ModuleItem["type"],
                        })
                      }
                      className="flex-1 border rounded p-1"
                    >
                      <option value="lesson">Lesson</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                    </select>
                    <Input
                      type="number"
                      value={item.duration}
                      onChange={(e) =>
                        handleUpdateItem(module.id, item.id, {
                          duration: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24"
                      placeholder="Duration"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 