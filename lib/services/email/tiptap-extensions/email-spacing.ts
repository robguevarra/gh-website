/**
 * Email Spacing Extension for TipTap
 * 
 * This extension adds support for consistent vertical spacing
 * between email content sections. This is critical for maintaining
 * consistent layout across email clients.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailSpacingOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailSpacing: {
      /**
       * Add vertical spacing in the email
       */
      setEmailSpacing: (options?: { height?: string }) => ReturnType;
    };
  }
}

export const EmailSpacing = Node.create<EmailSpacingOptions>({
  name: 'emailSpacing',
  
  group: 'block',
  
  // Spacing elements are empty nodes
  content: '',
  
  // Define default attributes
  addAttributes() {
    return {
      height: {
        default: '20px',
      },
    };
  },
  
  // Add command to insert spacing
  addCommands() {
    return {
      setEmailSpacing:
        (options = {}) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              height: options.height || '20px',
            },
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-spacing"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { height } = HTMLAttributes;
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-spacing',
        'class': 'email-spacing',
        style: `height: ${height}; display: block; line-height: ${height}; font-size: 1px;`,
      }),
      '\u00A0' // Non-breaking space to ensure height is respected
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-spacing',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const height = attrs.height || '20px';
        
        // Using multiple methods to ensure spacing works across email clients
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td height="${height}" style="font-size: 1px; line-height: ${height};">&nbsp;</td>
          </tr>
        </table>`;
      }
    };
  },
});

export default EmailSpacing;
