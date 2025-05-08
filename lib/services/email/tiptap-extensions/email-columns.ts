/**
 * Email Columns Extension for TipTap
 * 
 * This extension adds support for responsive multi-column layouts
 * that are optimized for email templates. These will be rendered
 * using table-based HTML layout for maximum
 * email client compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailColumnsOptions {
  HTMLAttributes: Record<string, any>;
}

// Define the types for our commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailColumns: {
      /**
       * Add a two-column layout section
       */
      setTwoColumnLayout: () => ReturnType;
    };
  }
}

// Column container node
export const EmailColumns = Node.create<EmailColumnsOptions>({
  name: 'emailColumns',
  
  group: 'block',
  
  // A column container can only contain column nodes
  content: 'emailColumn{2}',
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-columns"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-columns',
        'class': 'email-columns',
        style: 'display: flex; gap: 20px; margin: 20px 0;',
      }),
      0, // This will be replaced with the actual content (columns)
    ];
  },
  
  // Add command to insert a two-column layout
  addCommands() {
    return {
      setTwoColumnLayout:
        () => ({ commands, state }) => {
          // Create two empty columns with placeholder content
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'emailColumn',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Left column content...',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'emailColumn',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'Right column content...',
                      },
                    ],
                  },
                ],
              },
            ],
          });
        },
    };
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-columns',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const columns = node.content || [];
        const columnCount = columns.length || 2;
        const width = Math.floor(100 / columnCount);
        const backgroundColor = attrs.backgroundColor || 'transparent';
        const padding = attrs.padding || '10px';
        
        let columnsHtml = '';
        columns.forEach((column: any) => {
          columnsHtml += `<td valign="top" width="${width}%" style="padding: ${padding};">
            ${column.content || ''}
          </td>`;
        });
        
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};">
          <tr>
            ${columnsHtml}
          </tr>
        </table>`;
      }
    };
  },
});

// Individual column node
export const EmailColumn = Node.create({
  name: 'emailColumn',
  
  // A column can only be a child of a columns container
  group: 'emailColumn',
  
  // A column can contain block content (paragraphs, lists, etc.)
  content: 'block+',
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-column"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'email-column',
        'class': 'email-column',
        style: 'flex: 1; min-width: 0;',
      }),
      0, // This will be replaced with actual content
    ];
  },
});

export default { EmailColumns, EmailColumn };
