"use client"

import { useEffect, useRef } from "react"

interface VimeoContentRendererProps {
  content: string
}

export function VimeoContentRenderer({ content }: VimeoContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Set the HTML content
    containerRef.current.innerHTML = content

    // Find all script tags in the content
    const scripts = containerRef.current.querySelectorAll('script')
    
    // Execute each script
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script')
      
      // Copy all attributes from the old script to the new one
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value)
      })
      
      // Copy the content of the script
      newScript.appendChild(document.createTextNode(oldScript.innerHTML))
      
      // Replace the old script with the new one
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })
  }, [content])

  return <div ref={containerRef} />
}
