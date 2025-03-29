import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { useCourseContext } from "."
import { cn } from "@/lib/utils"

export default function EditorSidebar() {
  const {
    modules,
    setModules,
    activeModuleId,
    setActiveModuleId,
    activeItemId,
    setActiveItemId,
  } = useCourseContext()

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

  const toggleModule = (moduleId: string) => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            expanded: !module.expanded,
          }
        }
        return module
      })
    )
  }

  return (
    <div className="border-r">
      <div className="p-4 border-b">
        <Button onClick={handleAddModule} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4">
          {modules.map((module) => (
            <div key={module.id} className="mb-4">
              <div
                className={cn(
                  "flex items-center p-2 rounded cursor-pointer hover:bg-accent",
                  activeModuleId === module.id && "bg-accent"
                )}
              >
                <button
                  onClick={() => toggleModule(module.id)}
                  className="mr-2"
                >
                  {module.expanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setActiveModuleId(module.id)}
                  className="flex-1 text-left"
                >
                  {module.title}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddItem(module.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {module.expanded && (
                <div className="ml-6 mt-2">
                  {module.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2 rounded cursor-pointer hover:bg-accent",
                        activeItemId === item.id && "bg-accent"
                      )}
                      onClick={() => setActiveItemId(item.id)}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
} 