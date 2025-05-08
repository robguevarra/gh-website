/**
 * Email Button Extension for TipTap
 * 
 * This extension adds support for styled CTA buttons that are
 * optimized for email templates. The buttons will be rendered
 * properly in the email with responsive HTML styling.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailButtonOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailButton: {
      /**
       * Add an email button
       */
      setEmailButton: (options: { href: string; label: string; color?: string; textColor?: string }) => ReturnType;
    };
  }
}

export const EmailButton = Node.create<EmailButtonOptions>({
  name: 'emailButton',
  
  group: 'block',
  
  // The button is rendered as a paragraph with custom styling
  content: 'inline*',
  
  // Define the default attributes for the button
  addAttributes() {
    return {
      href: {
        default: '#',
      },
      color: {
        default: '#b08ba5', // Graceful Homeschooling purple
      },
      textColor: {
        default: 'white',
      },
    };
  },
  
  // This extension adds a new command to create buttons
  addCommands() {
    return {
      setEmailButton:
        (options) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              href: options.href,
              color: options.color || '#b08ba5',
              textColor: options.textColor || 'white',
            },
            content: [
              {
                type: 'text',
                text: options.label || 'Click Here',
              },
            ],
          });
        },
    };
  },
  
  // Define how the button renders in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-button"]',
      },
    ];
  },
  
  // Define how to render the button in HTML
  renderHTML({ HTMLAttributes }) {
    const { href, color, textColor } = HTMLAttributes;
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-button',
        'class': 'email-button',
        style: `
          display: inline-block; 
          background-color: ${color}; 
          color: ${textColor}; 
          padding: 10px 20px; 
          border-radius: 4px; 
          text-align: center; 
          font-weight: bold; 
          text-decoration: none; 
          margin: 10px 0;
          cursor: pointer;
        `,
      }),
      [
        'a',
        { 
          href,
          style: `color: ${textColor}; text-decoration: none;` 
        },
        0, // This will be replaced with the actual content
      ],
    ];
  },
  
  // How to convert to clean HTML for email
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-button',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        
        return `<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
          <tr>
            <td align="center" bgcolor="${attrs.backgroundColor || '#b08ba5'}" role="presentation" style="border:none;border-radius:${attrs.borderRadius || '4px'};cursor:pointer;padding:10px 25px;" valign="middle">
              <a href="${attrs.href || '#'}" style="background:${attrs.backgroundColor || '#b08ba5'};color:${attrs.textColor || 'white'};font-family:Inter, Arial, sans-serif;font-size:16px;font-weight:600;line-height:120%;text-decoration:none;text-transform:none;padding:10px 25px;display:inline-block;">
                ${node.content || 'Click me'}
              </a>
            </td>
          </tr>
        </table>`;
      }
    };
  }
});

export default EmailButton;
