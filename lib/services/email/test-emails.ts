/**
 * Postmark Email Testing Utility
 * 
 * This script provides a simple way to test various email types
 * implemented in our Postmark integration.
 * 
 * Usage:
 * npx tsx lib/services/email/test-emails.ts [email-type] [recipient-email]
 * 
 * Email types:
 * - welcome: Test the welcome email
 * - reset: Test password reset email
 * - reminder: Test class reminder email
 * - promo: Test promotional email
 * - verify: Test email verification
 * 
 * Example:
 * npx tsx lib/services/email/test-emails.ts welcome robneil@gmail.com
 */

// We're hardcoding the token here instead of using .env to ensure it works in standalone execution
const POSTMARK_TOKEN = '83ed42e9-a379-47d1-8996-047bb6a0a6db';

import { ServerClient } from 'postmark';
import fs from 'fs';
import path from 'path';

// Create a direct Postmark client without relying on environment variables
const postmarkClient = new ServerClient(POSTMARK_TOKEN);

// Read HTML template files
const getTemplate = (name: string) => {
  try {
    // Find category (subdirectory) for the template
    const categories = ['authentication', 'transactional', 'marketing', 'educational'];
    let templatePath = '';
    
    for (const category of categories) {
      const templatePath = path.join(process.cwd(), 'lib/services/email/templates', category, `${name}.html`);
      if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf-8');
      }
    }
    
    console.error(`Template not found: ${name}`);
    return null;
  } catch (error) {
    console.error(`Error reading template ${name}:`, error);
    return null;
  }
};

// Process HTML template with variables
const processHtmlTemplate = async (htmlContent: string, variables: Record<string, string>) => {
  try {
    // Replace variables in the template
    let result = htmlContent;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
      result = result.replace(regex, value);
    });
    
    return result;
  } catch (error) {
    console.error('Failed to process HTML template:', error);
    return '';
  }
};

// Send a test email
const sendTestEmail = async (
  type: string,
  recipientEmail: string,
  recipientName: string = 'Test User'
) => {
  try {
    console.log(`Sending ${type} email to ${recipientEmail}...`);
    
    let templateName = '';
    let subject = '';
    let variables: Record<string, string> = {};
    
    switch (type) {
      case 'welcome':
        templateName = 'welcome';
        subject = 'Welcome to Graceful Homeschooling!';
        variables = {
          firstName: recipientName,
          loginUrl: 'https://gracefulhomeschooling.com/login',
        };
        break;
        
      case 'reset':
        templateName = 'password-reset';
        subject = 'Reset Your Graceful Homeschooling Password';
        variables = {
          firstName: recipientName,
          resetUrl: 'https://gracefulhomeschooling.com/reset-password?token=test-token',
          expiresInMinutes: '60',
        };
        break;
        
      case 'reminder':
        templateName = 'class-reminder';
        subject = 'Your Upcoming Class Reminder';
        variables = {
          firstName: recipientName,
          className: 'Homeschooling Essentials',
          classDate: 'May 10, 2025',
          classTime: '10:00 AM (PHT)',
          zoomLink: 'https://zoom.us/j/123456789',
          preparationMaterials: 'Please review the chapter on curriculum planning before the class.',
        };
        break;
        
      case 'verify':
        templateName = 'email-verification';
        subject = 'Verify Your Email Address';
        variables = {
          firstName: recipientName,
          verificationUrl: 'https://gracefulhomeschooling.com/verify-email?token=test-token',
        };
        break;
        
      default:
        console.error(`Unknown email type: ${type}`);
        process.exit(1);
    }
    
    // Read the template file
    const htmlTemplate = getTemplate(templateName);
    if (!htmlTemplate) {
      console.error(`Template not found: ${templateName}`);
      throw new Error(`Template not found: ${templateName}`);
    }

    // Process HTML template with variables
    const htmlContent = await processHtmlTemplate(htmlTemplate, variables);
    
    // Send the email using Postmark
    const result = await postmarkClient.sendEmail({
      From: 'noreply@gracefulhomeschooling.com',
      To: recipientEmail,
      Subject: subject,
      HtmlBody: htmlContent,
      TextBody: `This is a test email for ${type}. Please view in an HTML-capable email client.`,
      MessageStream: 'outbound',
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', result.MessageID);
    console.log('To:', result.To);
    console.log('Submission ID:', result.SubmittedAt);
    
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Please provide an email type and recipient email');
    console.error('Usage: npx tsx lib/services/email/test-emails.ts [email-type] [recipient-email]');
    console.error('Available email types: welcome, reset, reminder, verify');
    process.exit(1);
  }
  
  const [emailType, recipientEmail] = args;
  
  try {
    await sendTestEmail(emailType, recipientEmail);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
