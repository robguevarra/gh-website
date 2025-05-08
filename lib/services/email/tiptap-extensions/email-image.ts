/**
 * Email Image Extension for TipTap
 * 
 * This extension adds support for email-optimized responsive images
 * that will render properly across email clients. Images will have
 * proper attributes and styling for maximum compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailImage: {
      /**
       * Add an email-optimized image
       */
      setEmailImage: (options: { 
        src: string; 
        alt?: string;
        width?: string;
        align?: 'left' | 'center' | 'right';
      }) => ReturnType;
    };
  }
}

export const EmailImage = Node.create<EmailImageOptions>({
  name: 'emailImage',
  
  group: 'block',
  
  // Images are empty nodes
  content: '',
  
  // Define default attributes
  addAttributes() {
    return {
      src: {
        default: '',
      },
      alt: {
        default: '',
      },
      width: {
        default: '100%',
      },
      align: {
        default: 'center',
      },
    };
  },
  
  // Add command to insert an image
  addCommands() {
    return {
      setEmailImage:
        (options) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt || '',
              width: options.width || '100%',
              align: options.align || 'center',
            },
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-image"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { src, alt, width, align } = HTMLAttributes;
    
    let alignStyle = 'margin: 0 auto;'; // Center (default)
    if (align === 'left') {
      alignStyle = 'margin-right: auto;';
    } else if (align === 'right') {
      alignStyle = 'margin-left: auto;';
    }
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-image',
        'class': 'email-image',
        style: `text-align: ${align}; margin: 20px 0;`,
      }),
      [
        'img',
        {
          src,
          alt,
          style: `
            max-width: ${width};
            height: auto;
            display: block;
            border: 0;
            ${alignStyle}
          `,
        },
      ],
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-image',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const src = attrs.src || '';
        const alt = attrs.alt || '';
        const width = attrs.width || '100%';
        const align = attrs.align || 'center';
        
        // Set text-align based on alignment
        const textAlign = align;
        
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td align="${textAlign}">
              <img src="${src}" alt="${alt}" width="${width}" style="max-width: 100%; height: auto; display: block; border: 0; ${align === 'center' ? 'margin: 0 auto;' : ''}" />
            </td>
          </tr>
        </table>`;
      }
    };
  },
});

export default EmailImage;
