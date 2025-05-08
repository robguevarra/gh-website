/**
 * Email Card Extension for TipTap
 * 
 * This extension adds support for styled content boxes/cards
 * that are optimized for email templates. These will be rendered
 * using table-based HTML for maximum email client compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailCardOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailCard: {
      /**
       * Add an email card/content box
       */
      setEmailCard: (options?: { 
        backgroundColor?: string; 
        borderColor?: string;
        borderRadius?: string;
        padding?: string;
      }) => ReturnType;
    };
  }
}

export const EmailCard = Node.create<EmailCardOptions>({
  name: 'emailCard',
  
  group: 'block',
  
  // A card can contain block content
  content: 'block+',
  
  // Define default attributes
  addAttributes() {
    return {
      backgroundColor: {
        default: '#f8f8f8', // Light gray background
      },
      borderColor: {
        default: '#f1b5bc', // Graceful Homeschooling pink
      },
      borderRadius: {
        default: '4px',
      },
      padding: {
        default: '20px',
      },
    };
  },
  
  // Add command to insert a card
  addCommands() {
    return {
      setEmailCard:
        (options = {}) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              backgroundColor: options.backgroundColor || '#f8f8f8',
              borderColor: options.borderColor || '#f1b5bc',
              borderRadius: options.borderRadius || '4px',
              padding: options.padding || '20px',
            },
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Add your content here...',
                  },
                ],
              },
            ],
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-card"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { backgroundColor, borderColor, borderRadius, padding } = HTMLAttributes;
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-card',
        'class': 'email-card',
        style: `
          background-color: ${backgroundColor};
          border: 1px solid ${borderColor};
          border-radius: ${borderRadius};
          padding: ${padding};
          margin: 20px 0;
        `,
      }),
      0, // This will be replaced with actual content
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-card',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const backgroundColor = attrs.backgroundColor || '#f8f8f8';
        const borderColor = attrs.borderColor || '#f1b5bc';
        const borderRadius = attrs.borderRadius || '4px';
        const padding = attrs.padding || '20px';
        
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: ${borderRadius}; padding: ${padding};">
              ${node.content || ''}
            </td>
          </tr>
        </table>`;
      }
    };
  },
});

export default EmailCard;
