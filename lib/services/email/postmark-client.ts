/**
 * Postmark Email Client Service
 * 
 * This service provides a clean interface for sending emails via Postmark.
 * It handles various email types (transactional, marketing, etc.) and provides
 * robust error handling and logging.
 */

import { ServerClient } from 'postmark';

// Email templates and types
export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailAttachment = {
  name: string;
  content: string;
  contentType: string;
};

export type EmailOptions = {
  from?: EmailRecipient;
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: EmailRecipient;
  cc?: EmailRecipient | EmailRecipient[];
  bcc?: EmailRecipient | EmailRecipient[];
  tag?: string;
  trackOpens?: boolean;
  trackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
  metadata?: Record<string, string>;
  attachments?: EmailAttachment[];
  messageStream?: string;
};

// Email template data for template rendering
export type EmailTemplateData = Record<string, string | number | boolean | null>;

/**
 * The PostmarkClient class handles all email sending operations through Postmark.
 * It provides methods for sending various types of emails and template-based emails.
 */
export class PostmarkClient {
  private client: ServerClient;
  private defaultFrom: EmailRecipient;
  private defaultMessageStream: string;
  
  /**
   * Creates a new PostmarkClient instance
   * 
   * @param serverToken - The Postmark server token for API authentication
   * @param defaultFrom - The default sender information to use if not specified
   * @param defaultMessageStream - The default message stream to use if not specified
   */
  constructor(
    serverToken: string,
    defaultFrom: EmailRecipient = { email: 'noreply@gracefulhomeschooling.com', name: 'Graceful Homeschooling' },
    defaultMessageStream: string = 'outbound'
  ) {
    this.client = new ServerClient(serverToken);
    this.defaultFrom = defaultFrom;
    this.defaultMessageStream = defaultMessageStream;
  }

  /**
   * Send an email using the provided options
   * 
   * @param options - Email sending options
   * @returns A promise resolving to the Postmark send result
   */
  async sendEmail(options: EmailOptions) {
    try {
      // Prepare the email data with defaults
      const emailData = {
        From: this.formatEmailRecipient(options.from || this.defaultFrom),
        To: this.formatEmailRecipients(options.to),
        Subject: options.subject,
        HtmlBody: options.htmlBody,
        TextBody: options.textBody || '',
        MessageStream: options.messageStream || this.defaultMessageStream,
        TrackOpens: options.trackOpens ?? true,
        TrackLinks: options.trackLinks || 'HtmlAndText',
      };

      // Add optional fields if they exist
      if (options.replyTo) {
        emailData['ReplyTo'] = this.formatEmailRecipient(options.replyTo);
      }

      if (options.cc) {
        emailData['Cc'] = this.formatEmailRecipients(options.cc);
      }

      if (options.bcc) {
        emailData['Bcc'] = this.formatEmailRecipients(options.bcc);
      }

      if (options.tag) {
        emailData['Tag'] = options.tag;
      }

      if (options.metadata) {
        emailData['Metadata'] = options.metadata;
      }

      if (options.attachments) {
        emailData['Attachments'] = options.attachments.map(attachment => ({
          Name: attachment.name,
          Content: attachment.content,
          ContentType: attachment.contentType,
        }));
      }

      // Send the email
      const result = await this.client.sendEmail(emailData);
      console.log(`Email sent successfully: ${result.MessageID}`);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send an email using a Postmark template
   * 
   * @param templateId - The ID of the template to use
   * @param templateData - The data to use for template variable substitution
   * @param options - Additional email sending options
   * @returns A promise resolving to the Postmark send result
   */
  async sendTemplateEmail(
    templateId: string, 
    templateData: EmailTemplateData,
    options: Omit<EmailOptions, 'htmlBody' | 'textBody'>
  ) {
    try {
      // Prepare the email data with defaults
      const emailData = {
        From: this.formatEmailRecipient(options.from || this.defaultFrom),
        To: this.formatEmailRecipients(options.to),
        TemplateId: templateId,
        TemplateModel: templateData,
        MessageStream: options.messageStream || this.defaultMessageStream,
        TrackOpens: options.trackOpens ?? true,
        TrackLinks: options.trackLinks || 'HtmlAndText',
      };

      // Add optional fields if they exist
      if (options.replyTo) {
        emailData['ReplyTo'] = this.formatEmailRecipient(options.replyTo);
      }

      if (options.cc) {
        emailData['Cc'] = this.formatEmailRecipients(options.cc);
      }

      if (options.bcc) {
        emailData['Bcc'] = this.formatEmailRecipients(options.bcc);
      }

      if (options.tag) {
        emailData['Tag'] = options.tag;
      }

      if (options.metadata) {
        emailData['Metadata'] = options.metadata;
      }

      if (options.attachments) {
        emailData['Attachments'] = options.attachments.map(attachment => ({
          Name: attachment.name,
          Content: attachment.content,
          ContentType: attachment.contentType,
        }));
      }

      // Send the template email
      const result = await this.client.sendEmailWithTemplate(emailData);
      console.log(`Template email sent successfully: ${result.MessageID}`);
      return result;
    } catch (error) {
      console.error('Failed to send template email:', error);
      throw error;
    }
  }

  /**
   * Helper method to format a single email recipient
   */
  private formatEmailRecipient(recipient: EmailRecipient): string {
    return recipient.name 
      ? `${recipient.name} <${recipient.email}>`
      : recipient.email;
  }

  /**
   * Helper method to format multiple email recipients
   */
  private formatEmailRecipients(recipients: EmailRecipient | EmailRecipient[]): string {
    if (Array.isArray(recipients)) {
      return recipients.map(r => this.formatEmailRecipient(r)).join(',');
    }
    return this.formatEmailRecipient(recipients);
  }
}

/**
 * Create a singleton instance of PostmarkClient using environment variables
 */
export const createPostmarkClient = () => {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  
  if (!serverToken) {
    throw new Error('POSTMARK_SERVER_TOKEN is not defined. Please check your environment setup.');
  }
  
  return new PostmarkClient(serverToken);
};

// Export the factory function instead of a singleton instance
// This ensures fresh token reading on each use
export default createPostmarkClient;
