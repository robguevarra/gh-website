"use client"

import type React from "react"
import { useState, createContext, useContext } from "react"
import { CheckCircle2, AlertCircle, X } from "lucide-react"

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

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  const isDestructive = toast.variant === "destructive"
  
  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-md w-full
      animate-in slide-in-from-top-5 duration-300
      ${isDestructive 
        ? 'bg-red-50 border-red-200 text-red-900' 
        : 'bg-green-50 border-green-200 text-green-900'
      }
    `}>
      <div className="flex-shrink-0 mt-0.5">
        {isDestructive ? (
          <AlertCircle className="h-5 w-5 text-red-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{toast.title}</h4>
        {toast.description && (
          <p className="text-sm opacity-90 mt-1">{toast.description}</p>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(toast.id)}
        className={`
          flex-shrink-0 rounded-full p-1 hover:bg-opacity-20 transition-colors
          ${isDestructive ? 'hover:bg-red-600' : 'hover:bg-green-600'}
        `}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = ({ title, description, variant = "default" }: Omit<ToastType, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant }
    setToasts((prevToasts) => [...prevToasts, newToast])

    // Auto dismiss after 5 seconds for success, 7 seconds for errors
    const dismissTime = variant === "destructive" ? 7000 : 5000
    setTimeout(() => {
      dismiss(id)
    }, dismissTime)

    // Also log to console for debugging
    console.log(`Toast: ${title}${description ? ` - ${description}` : ""}`)
  }

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toastItem) => (
            <ToastItem 
              key={toastItem.id} 
              toast={toastItem} 
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}
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

