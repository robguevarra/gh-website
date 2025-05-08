/**
 * Email Divider Extension for TipTap
 * 
 * This extension adds support for styled dividers (horizontal rules)
 * that are optimized for email templates. These will be rendered
 * using table-based HTML for maximum email client compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailDividerOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailDivider: {
      /**
       * Add an email divider
       */
      setEmailDivider: (options?: { color?: string; width?: string }) => ReturnType;
    };
  }
}

export const EmailDivider = Node.create<EmailDividerOptions>({
  name: 'emailDivider',
  
  group: 'block',
  
  // Dividers are empty nodes
  content: '',
  
  // Cannot be selected
  selectable: false,
  
  // Define default attributes
  addAttributes() {
    return {
      color: {
        default: '#f1b5bc', // Graceful Homeschooling pink
      },
      width: {
        default: '100%',
      },
      borderWidth: {
        default: '1px',
      },
    };
  },
  
  // Add command to insert a divider
  addCommands() {
    return {
      setEmailDivider:
        (options = {}) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              color: options.color || '#f1b5bc',
              width: options.width || '100%',
            },
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'hr[data-type="email-divider"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { color, width, borderWidth } = HTMLAttributes;
    
    return [
      'hr',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-divider',
        'class': 'email-divider',
        style: `
          border: none;
          border-top: ${borderWidth} solid ${color};
          width: ${width};
          margin: 20px auto;
        `,
      }),
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-divider',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const color = attrs.color || '#f1b5bc';
        const width = attrs.width || '1px';
        const style = attrs.style || 'solid';
        const padding = attrs.padding || '10px 0';
        
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin:${padding};">
          <tr>
            <td>
              <hr style="border:0;border-top:${width} ${style} ${color};margin:0;" />
            </td>
          </tr>
        </table>`;
      }
    };
  },
});

export default EmailDivider;
