import { Node, mergeAttributes } from '@tiptap/core'

export interface IframeOptions {
  allowFullscreen: boolean
  HTMLAttributes: {
    [key: string]: any
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      /**
       * Add an iframe
       */
      setIframe: (options: { src: string, title?: string }) => ReturnType
    }
  }
}

export const Iframe = Node.create<IframeOptions>({
  name: 'iframe',

  group: 'block',

  // Set atom to false to make it selectable and deletable
  atom: false,

  addOptions() {
    return {
      allowFullscreen: true,
      HTMLAttributes: {
        class: 'iframe-wrapper',
      },
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      frameborder: {
        default: '0',
      },
      allowfullscreen: {
        default: this.options.allowFullscreen,
        parseHTML: () => this.options.allowFullscreen,
      },
      allow: {
        default: 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media',
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: '100%',
      },
      style: {
        default: 'position:absolute;top:0;left:0;width:100%;height:100%;',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setIframe: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})
