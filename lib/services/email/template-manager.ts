/**
 * Email Template Manager
 * 
 * This service manages email templates for the application, including:
 * - Loading templates from file system or database
 * - Managing HTML email templates
 * - Providing templates for various email types
 * 
 * Templates follow the Graceful Homeschooling design system:
 * - Colors: Purple (#b08ba5), Pink (#f1b5bc), Blue (#9ac5d9)
 * - Typography: Inter for body text, Playfair Display for headings
 */

import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import emailHtmlProcessor from './email-html-processor';

// Types for template handling
export type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  category: 'transactional' | 'marketing' | 'educational' | 'authentication';
};

// Base template paths relative to project root
const TEMPLATE_DIR = path.join(process.cwd(), 'lib/services/email/templates');

/**
 * Email Template Manager for handling all template-related operations
 */
export class TemplateManager {
  private templates: Map<string, EmailTemplate> = new Map();
  private initialized: boolean = false;
  
  /**
   * Initialize the template manager by loading templates
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure template directory exists
      if (!fs.existsSync(TEMPLATE_DIR)) {
        fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
        await this.createDefaultTemplates();
      }
      
      // Load templates from the file system
      await this.loadTemplatesFromFileSystem();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TemplateManager:', error);
      throw error;
    }
  }

  /**
   * Create basic default templates if none exist
   */
  private async createDefaultTemplates() {
    // Ensure the templates directory exists
    if (!fs.existsSync(TEMPLATE_DIR)) {
      fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
    }
    
    // Create base template directory structure
    const categories = ['transactional', 'marketing', 'educational', 'authentication'];
    categories.forEach(category => {
      const categoryDir = path.join(TEMPLATE_DIR, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
    });

    // Create authentication templates if they don't exist
    const welcomeTemplatePath = path.join(TEMPLATE_DIR, 'authentication', 'welcome.html');
    if (!fs.existsSync(welcomeTemplatePath)) {
      console.log('Creating default welcome template...');
      fs.mkdirSync(path.dirname(welcomeTemplatePath), { recursive: true });
      fs.writeFileSync(welcomeTemplatePath, this.getDefaultWelcomeTemplate(), 'utf-8');
    }
    
    const passwordResetPath = path.join(TEMPLATE_DIR, 'authentication', 'password-reset.html');
    if (!fs.existsSync(passwordResetPath)) {
      console.log('Creating default password reset template...');
      fs.writeFileSync(passwordResetPath, this.getDefaultPasswordResetTemplate(), 'utf-8');
    }
    
    // Create transactional templates if they don't exist
    const reminderPath = path.join(TEMPLATE_DIR, 'transactional', 'class-reminder.html');
    if (!fs.existsSync(reminderPath)) {
      console.log('Creating default class reminder template...');
      fs.mkdirSync(path.dirname(reminderPath), { recursive: true });
      fs.writeFileSync(reminderPath, this.getDefaultClassReminderTemplate(), 'utf-8');
    }
  }

  /**
   * Load all templates from the file system
   */
  private async loadTemplatesFromFileSystem() {
    // Check if template directory exists
    if (!fs.existsSync(TEMPLATE_DIR)) {
      return;
    }
    
    // Get all subdirectories (categories)
    const categories = fs.readdirSync(TEMPLATE_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Load templates from each category
    for (const category of categories) {
      const categoryPath = path.join(TEMPLATE_DIR, category);
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.html'));
      
      for (const file of files) {
        const templateId = path.basename(file, '.html');
        const templatePath = path.join(categoryPath, file);
        
        try {
          const htmlContent = fs.readFileSync(templatePath, 'utf-8');
          
          this.templates.set(templateId, {
            id: templateId,
            name: this.formatTemplateName(templateId),
            subject: this.getDefaultSubject(templateId),
            htmlContent,
            category: category as any,
          });
          
          console.log(`Loaded template: ${templateId} (${category})`);
        } catch (error) {
          console.error(`Failed to load template ${templateId}:`, error);
        }
      }
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.templates.get(templateId) || null;
  }

  /**
   * Render a template with variables
   * 
   * @param templateId Template identifier
   * @param variables Variables to replace in template
   * @returns Rendered HTML
   */
  async renderTemplate(templateId: string, variables: TemplateVariables = {}): Promise<string> {
    // Get template
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Replace variables in the template
    let html = template.htmlContent;
    
    // Replace variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      html = html.replace(regex, value?.toString() || '');
    });
    
    return html;
  }
  
  /**
   * Process rich text content from TipTap editor to ensure it's email-compatible
   * 
   * @param htmlContent Rich HTML content from TipTap
   * @returns Email-compatible HTML content
   */
  processRichTextForEmail(htmlContent: string): string {
    // Use our new email HTML processor to ensure compatibility
    return emailHtmlProcessor.processHtmlForEmail(htmlContent, {
      inlineCss: true,
      processCustomComponents: true,
      brandColors: {
        primary: '#b08ba5',   // Purple
        secondary: '#f1b5bc', // Pink
        accent: '#9ac5d9',    // Blue
        background: '#ffffff' // White
      }
    });
  }
  
  /**
   * Save a template with content from the TipTap editor
   * 
   * @param templateId Template identifier
   * @param name Template name
   * @param htmlContent Rich HTML content from TipTap
   * @returns Updated template
   */
  async saveTemplateFromRichText(
    templateId: string,
    name: string,
    htmlContent: string
  ): Promise<EmailTemplate> {
    // Process HTML for email compatibility
    const processedHtml = this.processRichTextForEmail(htmlContent);
    
    // Get existing template
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Update template
    const updatedTemplate: EmailTemplate = {
      ...template,
      name,
      htmlContent: processedHtml
    };
    
    // Save to file system
    const templatePath = path.join(TEMPLATE_DIR, template.category, `${templateId}.html`);
    await fsPromises.writeFile(templatePath, processedHtml, 'utf-8');
    
    // Update in-memory template cache
    this.templates.set(templateId, updatedTemplate);
    
    return updatedTemplate;
  }

  /**
   * Create a formatted name from template ID
   */
  private formatTemplateName(templateId: string): string {
    return templateId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get a default subject based on template ID
   */
  private getDefaultSubject(templateId: string): string {
    const subjectMap: Record<string, string> = {
      'welcome': 'Welcome to Graceful Homeschooling!',
      'password-reset': 'Reset Your Graceful Homeschooling Password',
      'class-reminder': 'Your Upcoming Class Reminder',
      'course-enrollment': 'Thank You for Enrolling!',
      'promotion': 'Special Offer from Graceful Homeschooling',
    };
    
    return subjectMap[templateId] || this.formatTemplateName(templateId);
  }

  /**
   * Get default welcome template
   */
  private getDefaultWelcomeTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Graceful Homeschooling</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', Arial, sans-serif;
      line-height: 1.5;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
    }
    .header {
      background-color: #b08ba5;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      font-size: 28px;
      margin: 0;
    }
    .content {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
    }
    .welcome-heading {
      color: #b08ba5;
      font-size: 22px;
    }
    .button {
      display: inline-block;
      background-color: #b08ba5;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 4px;
      margin: 15px 0;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 10px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Graceful Homeschooling</h1>
  </div>
  
  <div class="content">
    <h2 class="welcome-heading">Welcome to Graceful Homeschooling!</h2>
    <p>Hello {{ firstName }},</p>
    <p>We're thrilled to welcome you to the Graceful Homeschooling community! Your account has been successfully created, and you're on your way to accessing our resources and courses.</p>
    <p>You can access your account using the button below:</p>
    <a href="{{ loginUrl }}" class="button">Access Your Account</a>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
  </div>
  
  <div class="footer">
    <p>&copy; 2025 Graceful Homeschooling. All rights reserved.</p>
    <p>If you received this email by mistake, please disregard it.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Get default password reset template
   */
  private getDefaultPasswordResetTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', Arial, sans-serif;
      line-height: 1.5;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
    }
    .header {
      background-color: #b08ba5;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      font-size: 28px;
      margin: 0;
    }
    .content {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
    }
    .title {
      color: #b08ba5;
      font-size: 22px;
    }
    .button {
      display: inline-block;
      background-color: #b08ba5;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 4px;
      margin: 15px 0;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 10px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Graceful Homeschooling</h1>
  </div>
  
  <div class="content">
    <h2 class="title">Password Reset Request</h2>
    <p>Hello {{ firstName }},</p>
    <p>We received a request to reset your password for your Graceful Homeschooling account.</p>
    <p>To reset your password, please click the button below. This link will expire in {{ expiresInMinutes }} minutes.</p>
    <a href="{{ resetUrl }}" class="button">Reset Password</a>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  </div>
  
  <div class="footer">
    <p>&copy; 2025 Graceful Homeschooling. All rights reserved.</p>
    <p>For security reasons, please do not reply to this email.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Get default class reminder template
   */
  private getDefaultClassReminderTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Reminder: {{ className }}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', Arial, sans-serif;
      line-height: 1.5;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
    }
    .header {
      background-color: #9ac5d9;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      font-size: 28px;
      margin: 0;
    }
    .content {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
    }
    .title {
      color: #9ac5d9;
      font-size: 22px;
    }
    .divider {
      border-top: 1px solid #f1b5bc;
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      background-color: #9ac5d9;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 4px;
      margin: 15px 0;
    }
    .class-details {
      margin: 15px 0;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 10px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Graceful Homeschooling</h1>
  </div>
  
  <div class="content">
    <h2 class="title">Class Reminder: {{ className }}</h2>
    <p>Hello {{ firstName }},</p>
    <p>This is a friendly reminder about your upcoming class:</p>
    
    <div class="divider"></div>
    
    <div class="class-details">
      <p><strong>Class:</strong> {{ className }}<br>
      <strong>Date:</strong> {{ classDate }}<br>
      <strong>Time:</strong> {{ classTime }}</p>
    </div>
    
    <a href="{{ zoomLink }}" class="button">Join Class via Zoom</a>
    
    <p>{{ preparationMaterials }}</p>
    <p>We look forward to seeing you in class!</p>
  </div>
  
  <div class="footer">
    <p>&copy; 2025 Graceful Homeschooling. All rights reserved.</p>
    <p>If you have any questions, please contact support.</p>
  </div>
</body>
</html>`;
  }
}

// Export a singleton instance
export default new TemplateManager();
