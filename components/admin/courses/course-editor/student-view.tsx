import { useCourseContext } from "."
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function StudentView() {
  const { modules, activeModuleId, setActiveModuleId, activeItemId, setActiveItemId } =
    useCourseContext()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set([activeModuleId || ""]))

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const activeModule = modules.find((m) => m.id === activeModuleId)
  const activeItem = activeModule?.items.find((i) => i.id === activeItemId)

  return (
    <div className="grid h-full grid-cols-[300px_1fr]">
      {/* Course Navigation */}
      <div className="border-r">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-4">
            {modules.map((module) => (
              <div key={module.id}>
                <div
                  className={cn(
                    "flex items-center p-2 rounded hover:bg-accent cursor-pointer",
                    activeModuleId === module.id && "bg-accent"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto mr-2"
                    onClick={() => toggleModule(module.id)}
                  >
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <button
                    onClick={() => setActiveModuleId(module.id)}
                    className="flex-1 text-left"
                  >
                    {module.title}
                  </button>
                </div>
                {expandedModules.has(module.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {module.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-2 rounded cursor-pointer hover:bg-accent",
                          activeItemId === item.id && "bg-accent"
                        )}
                        onClick={() => {
                          setActiveModuleId(module.id)
                          setActiveItemId(item.id)
                        }}
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

      {/* Content Display */}
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-6">
          {activeItem ? (
            <div className="prose max-w-none">
              <h1>{activeItem.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: activeItem.content || "" }} />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Select a lesson to start learning
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 