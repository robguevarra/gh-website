/**
 * Email Header Extension for TipTap
 * 
 * This extension adds a reusable branded header component for emails
 * that maintains consistent branding across all email templates.
 * It implements a table-based approach for maximum email client compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailHeaderOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailHeader: {
      /**
       * Add a branded email header
       */
      setEmailHeader: (options?: { 
        title?: string;
        backgroundColor?: string; 
        textColor?: string;
        logoUrl?: string;
      }) => ReturnType;
    };
  }
}

export const EmailHeader = Node.create<EmailHeaderOptions>({
  name: 'emailHeader',
  
  group: 'block',
  
  // Headers are empty nodes
  content: '',
  
  // Define default attributes
  addAttributes() {
    return {
      title: {
        default: 'Graceful Homeschooling',
      },
      backgroundColor: {
        default: '#f1b5bc', // Graceful Homeschooling pink
      },
      textColor: {
        default: 'white',
      },
      logoUrl: {
        default: '',
      },
    };
  },
  
  // Add command to insert a header
  addCommands() {
    return {
      setEmailHeader:
        (options = {}) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              title: options.title || 'Graceful Homeschooling',
              backgroundColor: options.backgroundColor || '#f1b5bc',
              textColor: options.textColor || 'white',
              logoUrl: options.logoUrl || '',
            },
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-header"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { title, backgroundColor, textColor, logoUrl } = HTMLAttributes;
    
    // Rendering depends on whether we have a logo or just text
    const hasLogo = logoUrl && logoUrl.trim() !== '';
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-header',
        'class': 'email-header',
        style: `
          background-color: ${backgroundColor};
          color: ${textColor};
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        `,
      }),
      hasLogo ? [
        'img',
        {
          src: logoUrl,
          alt: title,
          style: 'max-width: 200px; height: auto; margin: 0 auto; display: block;',
        }
      ] : [
        'h1',
        {
          style: `
            font-family: 'Playfair Display', Georgia, serif;
            color: ${textColor};
            font-size: 28px;
            margin: 0;
            line-height: 1.2;
          `,
        },
        title
      ],
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-header',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const title = attrs.title || 'Graceful Homeschooling';
        const backgroundColor = attrs.backgroundColor || '#f1b5bc';
        const textColor = attrs.textColor || 'white';
        const logoUrl = attrs.logoUrl || '';
        
        // Table-based header for maximum compatibility
        if (logoUrl && logoUrl.trim() !== '') {
          // Header with logo
          return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-bottom: 20px;">
            <tr>
              <td align="center" style="padding: 20px;">
                <img src="${logoUrl}" alt="${title}" width="200" style="max-width: 200px; height: auto; display: block; border: 0;" />
              </td>
            </tr>
          </table>`;
        } else {
          // Text-only header
          return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-bottom: 20px;">
            <tr>
              <td align="center" style="padding: 20px;">
                <h1 style="font-family: 'Playfair Display', Georgia, serif; color: ${textColor}; font-size: 28px; margin: 0; line-height: 1.2;">${title}</h1>
              </td>
            </tr>
          </table>`;
        }
      }
    };
  },
});

export default EmailHeader;
