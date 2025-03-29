"use client"

import type React from "react"

import { useState, createContext, useContext } from "react"

type ToastType = {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toasts: ToastType[]
  toast: (props: Omit<ToastType, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = ({ title, description, variant = "default" }: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant }
    setToasts((prevToasts) => [...prevToasts, newToast])

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      dismiss(id)
    }, 3000)

    // Show toast in console for demo purposes
    console.log(`Toast: ${title}${description ? ` - ${description}` : ""}`)
  }

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* In a real implementation, we would render toast UI here */}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

