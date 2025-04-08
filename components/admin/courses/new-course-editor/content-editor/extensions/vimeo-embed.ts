import { Node, mergeAttributes } from '@tiptap/core'

export interface VimeoEmbedOptions {
  HTMLAttributes: {
    [key: string]: any
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeoEmbed: {
      /**
       * Add a Vimeo embed
       */
      setVimeoEmbed: (options: { html: string }) => ReturnType
    }
  }
}

export const VimeoEmbed = Node.create<VimeoEmbedOptions>({
  name: 'vimeoEmbed',
  
  group: 'block',
  
  content: 'inline*',
  
  parseHTML() {
    return [
      {
        tag: 'div.vimeo-embed',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'vimeo-embed' }), 0]
  },
  
  addCommands() {
    return {
      setVimeoEmbed: (options) => ({ commands, editor }) => {
        // This is a special case where we need to insert raw HTML
        // We'll use the editor's insertContent method directly
        return editor.commands.insertContent(options.html)
      },
    }
  },
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
})
