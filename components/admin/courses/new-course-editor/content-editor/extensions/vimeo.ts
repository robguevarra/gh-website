import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VimeoNodeView } from '../node-views/vimeo-node-view'

export interface VimeoOptions {
  HTMLAttributes: {
    [key: string]: any
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeo: {
      /**
       * Add a Vimeo video
       */
      setVimeo: (options: { src: string, videoId: string }) => ReturnType
    }
  }
}

export const Vimeo = Node.create<VimeoOptions>({
  name: 'vimeo',
  
  group: 'block',
  
  atom: true, // Cannot be split or merged
  
  draggable: true,
  
  selectable: true,
  
  inline: false,
  
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'vimeo-embed',
      },
    }
  },
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      videoId: {
        default: null,
      },
      aspectRatio: {
        default: '56.25%', // 16:9 aspect ratio
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="vimeo"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    const { videoId } = HTMLAttributes
    
    // If we're just rendering HTML (not in the editor), create the full embed code
    if (!this.editor.isEditable) {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': 'vimeo',
          style: `padding:${HTMLAttributes.aspectRatio} 0 0 0;position:relative;`,
        }),
        [
          'iframe',
          {
            src: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`,
            frameborder: '0',
            allow: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
            allowfullscreen: 'true',
            style: 'position:absolute;top:0;left:0;width:100%;height:100%;',
            title: 'Vimeo Video',
          },
        ],
      ]
    }
    
    // In the editor, use our React component for better editing experience
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'vimeo',
      }),
    ]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(VimeoNodeView)
  },
  
  addCommands() {
    return {
      setVimeo: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})
