"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash, RefreshCw, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VideoEmbedFieldProps {
  value: string
  onChange: (value: string) => void
  onVideoIdChange?: (videoId: string | null) => void
}

export function VideoEmbedField({ value, onChange, onVideoIdChange }: VideoEmbedFieldProps) {
  const [inputValue, setInputValue] = useState(value)
  const [videoId, setVideoId] = useState<string | null>(extractVimeoId(value))
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Update internal state when prop value changes
  useEffect(() => {
    setInputValue(value)
    setVideoId(extractVimeoId(value))
  }, [value])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    if (!newValue) {
      setVideoId(null)
      setError(null)
      onChange("")
      if (onVideoIdChange) onVideoIdChange(null)
      return
    }
    
    // Don't validate on every keystroke
    onChange(newValue)
  }
  
  // Validate the input
  const validateInput = () => {
    setIsValidating(true)
    
    // Extract Vimeo ID
    const id = extractVimeoId(inputValue)
    setVideoId(id)
    
    if (inputValue && !id) {
      setError("Please enter a valid Vimeo URL or embed code")
      if (onVideoIdChange) onVideoIdChange(null)
    } else {
      setError(null)
      if (onVideoIdChange) onVideoIdChange(id)
    }
    
    setIsValidating(false)
  }
  
  // Clear video
  const handleClear = () => {
    setInputValue("")
    setVideoId(null)
    setError(null)
    onChange("")
    if (onVideoIdChange) onVideoIdChange(null)
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="video-embed">Vimeo Video URL or Embed Code</Label>
        <div className="flex gap-2">
          <Input
            id="video-embed"
            placeholder="https://vimeo.com/123456789 or paste embed code"
            value={inputValue}
            onChange={handleChange}
            onBlur={validateInput}
            className={error ? "border-red-500" : ""}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            onClick={validateInput}
            disabled={isValidating}
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <p className="text-xs text-muted-foreground mt-1">
          Enter a Vimeo URL (e.g., https://vimeo.com/123456789) or paste the full embed code.
          For private videos, use the embed code from Vimeo's share dialog.
        </p>
      </div>
      
      {videoId && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="aspect-video rounded-md overflow-hidden border bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo Video"
            ></iframe>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Vimeo ID: {videoId}
            </p>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash className="h-4 w-4 mr-2" />
              Remove Video
            </Button>
          </div>
        </div>
      )}
      
      {!videoId && inputValue && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertDescription>
            No valid Vimeo video detected. Please enter a valid Vimeo URL or embed code.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Function to extract Vimeo ID from various URL formats or embed codes
export function extractVimeoId(input: string): string | null {
  if (!input) return null
  
  // If input is just a number, assume it's a Vimeo ID
  if (/^\d+$/.test(input)) {
    return input
  }
  
  // Try to extract from URL
  const urlPatterns = [
    /vimeo\.com\/(\d+)/,                          // vimeo.com/123456789
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/,        // vimeo.com/channels/channel/123456789
    /vimeo\.com\/groups\/[^\/]+\/videos\/(\d+)/,  // vimeo.com/groups/group/videos/123456789
    /player\.vimeo\.com\/video\/(\d+)/            // player.vimeo.com/video/123456789
  ]
  
  for (const pattern of urlPatterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  // Try to extract from embed code
  const embedMatch = input.match(/player\.vimeo\.com\/video\/(\d+)/)
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1]
  }
  
  return null
}
