/**
 * Email Footer Extension for TipTap
 * 
 * This extension adds a reusable branded footer component for emails
 * that maintains consistent branding and information across all email templates.
 * It implements a table-based approach for maximum email client compatibility.
 */

import { mergeAttributes, Node } from '@tiptap/core';

export interface EmailFooterOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emailFooter: {
      /**
       * Add a branded email footer
       */
      setEmailFooter: (options?: { 
        companyName?: string;
        year?: string;
        backgroundColor?: string; 
        textColor?: string;
        includeUnsubscribe?: boolean;
        additionalText?: string;
      }) => ReturnType;
    };
  }
}

export const EmailFooter = Node.create<EmailFooterOptions>({
  name: 'emailFooter',
  
  group: 'block',
  
  // Footers are empty nodes
  content: '',
  
  // Define default attributes
  addAttributes() {
    return {
      companyName: {
        default: 'Graceful Homeschooling',
      },
      year: {
        default: new Date().getFullYear().toString(),
      },
      backgroundColor: {
        default: '#f8f8f8', // Light gray background
      },
      textColor: {
        default: '#666666', // Gray text
      },
      includeUnsubscribe: {
        default: true,
      },
      additionalText: {
        default: 'For security reasons, please do not reply to this email.',
      },
    };
  },
  
  // Add command to insert a footer
  addCommands() {
    return {
      setEmailFooter:
        (options = {}) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              companyName: options.companyName || 'Graceful Homeschooling',
              year: options.year || new Date().getFullYear().toString(),
              backgroundColor: options.backgroundColor || '#f8f8f8',
              textColor: options.textColor || '#666666',
              includeUnsubscribe: options.includeUnsubscribe !== undefined ? options.includeUnsubscribe : true,
              additionalText: options.additionalText || 'For security reasons, please do not reply to this email.',
            },
          });
        },
    };
  },
  
  // Define how this looks in the editor
  parseHTML() {
    return [
      {
        tag: 'div[data-type="email-footer"]',
      },
    ];
  },
  
  // Define how to render in HTML
  renderHTML({ HTMLAttributes }) {
    const { companyName, year, backgroundColor, textColor, includeUnsubscribe, additionalText } = HTMLAttributes;
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'email-footer',
        'class': 'email-footer',
        style: `
          background-color: ${backgroundColor};
          color: ${textColor};
          padding: 20px;
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
        `,
      }),
      [
        'p',
        { style: 'margin: 5px 0;' },
        `© ${year} ${companyName}. All rights reserved.`
      ],
      additionalText ? [
        'p',
        { style: 'margin: 5px 0;' },
        additionalText
      ] : null,
      includeUnsubscribe ? [
        'p',
        { style: 'margin: 5px 0;' },
        [
          'a',
          { 
            href: '{{unsubscribeUrl}}',
            style: `color: ${textColor}; text-decoration: underline;` 
          },
          'Unsubscribe'
        ],
        ' or ',
        [
          'a',
          { 
            href: '{{managePreferencesUrl}}',
            style: `color: ${textColor}; text-decoration: underline;` 
          },
          'manage your email preferences'
        ],
      ] : null,
    ];
  },
  
  // Storage property to define conversion to email-friendly HTML
  addStorage() {
    return {
      // Unique identifier for our HTML processor
      emailComponent: 'email-footer',
      // Method to generate clean HTML for email
      toEmailHTML: (node: any) => {
        const attrs = node.attrs || {};
        const companyName = attrs.companyName || 'Graceful Homeschooling';
        const year = attrs.year || new Date().getFullYear().toString();
        const backgroundColor = attrs.backgroundColor || '#f8f8f8';
        const textColor = attrs.textColor || '#666666';
        const includeUnsubscribe = attrs.includeUnsubscribe !== undefined ? attrs.includeUnsubscribe : true;
        const additionalText = attrs.additionalText || 'For security reasons, please do not reply to this email.';
        
        // Build the footer content
        let footerContent = `<p style="margin: 5px 0; font-size: 12px; color: ${textColor};">© ${year} ${companyName}. All rights reserved.</p>`;
        
        if (additionalText) {
          footerContent += `<p style="margin: 5px 0; font-size: 12px; color: ${textColor};">${additionalText}</p>`;
        }
        
        if (includeUnsubscribe) {
          footerContent += `<p style="margin: 5px 0; font-size: 12px; color: ${textColor};">
            <a href="{{unsubscribeUrl}}" style="color: ${textColor}; text-decoration: underline;">Unsubscribe</a> or 
            <a href="{{managePreferencesUrl}}" style="color: ${textColor}; text-decoration: underline;">manage your email preferences</a>
          </p>`;
        }
        
        // Table-based footer for maximum compatibility
        return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px;">
              ${footerContent}
            </td>
          </tr>
        </table>`;
      }
    };
  },
});

export default EmailFooter;
