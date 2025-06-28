"use client"

import { Toaster } from "@/components/ui/sonner"

// This component exists to solve the "Cannot update a component while rendering a different component" error
// By isolating the Toaster in its own client component, we prevent state updates during parent component rendering
export function ToasterProvider() {
  return <Toaster />
}
