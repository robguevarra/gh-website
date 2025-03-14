"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { MousePointer } from "lucide-react"

export function CustomCursorToggle() {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isEnabled) {
        document.body.classList.add("custom-cursor")
      } else {
        document.body.classList.remove("custom-cursor")
      }
    }
  }, [isEnabled])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsEnabled(!isEnabled)}
      className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90"
      title={isEnabled ? "Disable custom cursor" : "Enable custom cursor"}
    >
      <MousePointer className={`h-4 w-4 ${isEnabled ? "text-[#ad8174]" : "text-gray-500"}`} />
    </Button>
  )
}

