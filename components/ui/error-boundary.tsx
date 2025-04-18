"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * ErrorBoundary - A reusable error boundary for robust UI.
 * Props:
 * - children: ReactNode
 * - fallback?: ReactNode (optional fallback UI)
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (development only)
    console.error(`Error in ${this.props.componentName || "component"}:`, error, errorInfo)
    
    // Log error to a service (in production)
    this.logErrorToService(error, errorInfo)
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // We could use a service like Sentry, LogRocket, etc.
    // For now, we'll create a simple logging utility that could be expanded later
    
    if (process.env.NODE_ENV === "production") {
      // In a real implementation, we would call a service like:
      // Sentry.captureException(error, { extra: { componentName: this.props.componentName, ...errorInfo } })
      
      // For now, let's log to localStorage for debugging (this would be replaced with a real service)
      try {
        const errorLog = JSON.parse(localStorage.getItem("error_log") || "[]") 
        const newError = {
          timestamp: new Date().toISOString(),
          componentName: this.props.componentName,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        }
        errorLog.push(newError)
        localStorage.setItem("error_log", JSON.stringify(errorLog.slice(-20))) // Keep only the last 20 errors
      } catch (e) {
        // Fail silently if localStorage is not available
      }
    }
  }

  resetErrorBoundary = (): void => {
    if (this.props.onReset) {
      this.props.onReset()
    }
    this.setState({
      hasError: false,
      error: null
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Show a more graceful UI for production, more detailed for development
      const isProduction = process.env.NODE_ENV === "production"
      
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isProduction 
              ? "Something went wrong" 
              : `Error in ${this.props.componentName || "component"}`
            }
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="text-sm mb-4">
              {isProduction
                ? "We've encountered an issue loading this section." 
                : this.state.error?.message || "Something went wrong."}
            </div>
            <Button 
              size="sm" 
              onClick={this.resetErrorBoundary}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}
