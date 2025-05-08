/**
 * Email HTML Processor
 * 
 * This service processes HTML from the TipTap editor to ensure it's
 * optimized for email clients. It applies best practices for HTML emails
 * and processes any custom email components.
 */

import { parse, HTMLElement } from 'node-html-parser';

interface ProcessingOptions {
  inlineCss?: boolean;
  processCustomComponents?: boolean;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

const defaultOptions: ProcessingOptions = {
  inlineCss: true,
  processCustomComponents: true,
  brandColors: {
    primary: '#b08ba5',    // Purple
    secondary: '#f1b5bc',  // Pink
    accent: '#9ac5d9',     // Blue
    background: '#ffffff', // White
  }
};

/**
 * Process HTML content to make it email-friendly
 * 
 * @param htmlContent The HTML content from TipTap
 * @param options Processing options
 * @returns Email-optimized HTML
 */
export function processHtmlForEmail(
  htmlContent: string,
  options: ProcessingOptions = {}
): string {
  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    // Parse HTML
    const root = parse(htmlContent);
    
    // Process custom components if needed
    if (mergedOptions.processCustomComponents) {
      processCustomEmailComponents(root, mergedOptions.brandColors);
    }
    
    // Add email-specific styling if needed
    if (mergedOptions.inlineCss) {
      addEmailSpecificStyles(root);
    }
    
    return root.toString();
  } catch (error) {
    console.error('Error processing HTML for email:', error);
    return htmlContent; // Return original content if processing fails
  }
}

/**
 * Process any custom email components from our TipTap extensions
 */
function processCustomEmailComponents(root: HTMLElement, brandColors: ProcessingOptions['brandColors']) {
  // Find and process email-button components
  root.querySelectorAll('[data-type="email-button"]').forEach((node) => {
    const href = node.getAttribute('href') || '#';
    const label = node.textContent || 'Click me';
    const backgroundColor = node.getAttribute('background-color') || brandColors?.primary || '#b08ba5';
    const textColor = node.getAttribute('text-color') || 'white';
    
    // Replace with table-based button (email-friendly)
    node.replaceWith(`<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
      <tr>
        <td align="center" bgcolor="${backgroundColor}" role="presentation" style="border:none;border-radius:4px;cursor:pointer;padding:10px 25px;" valign="middle">
          <a href="${href}" style="background:${backgroundColor};color:${textColor};font-family:Inter, Arial, sans-serif;font-size:16px;font-weight:600;line-height:120%;text-decoration:none;text-transform:none;padding:10px 25px;display:inline-block;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`);
  });
  
  // Find and process email-divider components
  root.querySelectorAll('[data-type="email-divider"]').forEach((node) => {
    const color = node.getAttribute('color') || brandColors?.secondary || '#f1b5bc';
    
    // Replace with table-based divider (email-friendly)
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin:10px 0;">
      <tr>
        <td>
          <hr style="border:0;border-top:1px solid ${color};margin:0;" />
        </td>
      </tr>
    </table>`);
  });
  
  // Find and process email-card components
  root.querySelectorAll('[data-type="email-card"]').forEach((node) => {
    const backgroundColor = node.getAttribute('background-color') || '#f8f8f8';
    const borderColor = node.getAttribute('border-color') || brandColors?.secondary || '#f1b5bc';
    const borderRadius = node.getAttribute('border-radius') || '4px';
    const padding = node.getAttribute('padding') || '20px';
    const content = node.innerHTML;
    
    // Replace with table-based card (email-friendly)
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: ${borderRadius}; padding: ${padding};">
          ${content}
        </td>
      </tr>
    </table>`);
  });
  
  // Find and process email-image components
  root.querySelectorAll('[data-type="email-image"]').forEach((node) => {
    const src = node.querySelector('img')?.getAttribute('src') || '';
    const alt = node.querySelector('img')?.getAttribute('alt') || '';
    const width = node.querySelector('img')?.getAttribute('width') || '100%';
    const align = node.getAttribute('align') || 'center';
    
    // Replace with table-based image (email-friendly)
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td align="${align}">
          <img src="${src}" alt="${alt}" width="${width}" style="max-width: 100%; height: auto; display: block; border: 0; ${align === 'center' ? 'margin: 0 auto;' : ''}" />
        </td>
      </tr>
    </table>`);
  });
  
  // Find and process email-spacing components
  root.querySelectorAll('[data-type="email-spacing"]').forEach((node) => {
    const height = node.getAttribute('height') || '20px';
    
    // Replace with table-based spacing (email-friendly)
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td height="${height}" style="font-size: 1px; line-height: ${height};">&nbsp;</td>
      </tr>
    </table>`);
  });
  
  // Find and process email-header components
  root.querySelectorAll('[data-type="email-header"]').forEach((node) => {
    const title = node.textContent || 'Graceful Homeschooling';
    const backgroundColor = node.getAttribute('background-color') || brandColors?.secondary || '#f1b5bc';
    const textColor = node.getAttribute('text-color') || 'white';
    const logoUrl = node.querySelector('img')?.getAttribute('src') || '';
    
    // Create header HTML based on whether there's a logo
    let headerHtml = '';
    if (logoUrl) {
      headerHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding: 20px;">
            <img src="${logoUrl}" alt="${title}" width="200" style="max-width: 200px; height: auto; display: block; border: 0;" />
          </td>
        </tr>
      </table>`;
    } else {
      headerHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding: 20px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: ${textColor}; font-size: 28px; margin: 0; line-height: 1.2;">${title}</h1>
          </td>
        </tr>
      </table>`;
    }
    
    node.replaceWith(headerHtml);
  });
  
  // Find and process email-footer components
  root.querySelectorAll('[data-type="email-footer"]').forEach((node) => {
    const companyName = node.getAttribute('company-name') || 'Graceful Homeschooling';
    const year = node.getAttribute('year') || new Date().getFullYear().toString();
    const backgroundColor = node.getAttribute('background-color') || '#f8f8f8';
    const textColor = node.getAttribute('text-color') || '#666666';
    const includeUnsubscribe = node.getAttribute('include-unsubscribe') !== 'false';
    const additionalText = node.getAttribute('additional-text') || 'For security reasons, please do not reply to this email.';
    
    // Build footer content
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
    
    // Replace with table-based footer
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor}; margin-top: 20px;">
      <tr>
        <td align="center" style="padding: 20px;">
          ${footerContent}
        </td>
      </tr>
    </table>`);
  });
  
  // Process email-columns components
  root.querySelectorAll('[data-type="email-columns"]').forEach((node) => {
    const columns = node.querySelectorAll('[data-type="email-column"]');
    const columnCount = columns.length || 2;
    const width = Math.floor(100 / columnCount);
    const backgroundColor = node.getAttribute('background-color') || 'transparent';
    const padding = node.getAttribute('padding') || '10px';
    
    let columnsHtml = '';
    columns.forEach((column) => {
      columnsHtml += `<td valign="top" width="${width}%" style="padding: ${padding};">
        ${column.innerHTML}
      </td>`;
    });
    
    // Replace with table-based columns
    node.replaceWith(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${backgroundColor};">
      <tr>
        ${columnsHtml}
      </tr>
    </table>`);
  });
}

/**
 * Add email-specific styles to improve compatibility
 */
function addEmailSpecificStyles(root: HTMLElement) {
  // Add email-friendly styles to images
  root.querySelectorAll('img').forEach((img) => {
    img.setAttribute('style', 'max-width: 100%; height: auto; display: block;');
    img.setAttribute('border', '0');
  });
  
  // Make links more visible
  root.querySelectorAll('a').forEach((link) => {
    if (!link.getAttribute('style')?.includes('color')) {
      link.setAttribute('style', (link.getAttribute('style') || '') + 'color: #b08ba5; text-decoration: underline;');
    }
  });
  
  // Ensure paragraphs have proper spacing
  root.querySelectorAll('p').forEach((p) => {
    p.setAttribute('style', (p.getAttribute('style') || '') + 'margin: 16px 0;');
  });
}

// Export a default instance
export default {
  processHtmlForEmail
};
