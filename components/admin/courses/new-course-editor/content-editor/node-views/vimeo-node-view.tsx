"use client"

import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { Trash2 } from 'lucide-react'

export function VimeoNodeView({
  node,
  editor,
  getPos,
  selected,
}: NodeViewProps) {
  const { videoId } = node.attrs
  
  const handleDelete = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize })
    }
  }
  
  return (
    <NodeViewWrapper className="vimeo-node-view">
      <div 
        className={`vimeo-container relative ${selected ? 'selected' : ''}`}
        style={{ padding: '56.25% 0 0 0', position: 'relative' }}
      >
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          title="Vimeo Video"
        />
        
        {selected && (
          <div className="absolute top-2 right-2 flex gap-2 bg-black/50 p-2 rounded">
            <button
              type="button"
              className="text-white hover:text-red-500 transition-colors"
              onClick={handleDelete}
              title="Delete video"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .vimeo-container.selected {
          outline: 2px solid #3182ce;
          border-radius: 0.25rem;
        }
      `}</style>
    </NodeViewWrapper>
  )
}
