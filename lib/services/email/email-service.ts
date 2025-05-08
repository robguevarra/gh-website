/**
 * Email Service
 * 
 * This service provides high-level methods for sending different types of emails
 * using the Postmark client. It abstracts away the details of email construction
 * and provides simple interfaces for common email scenarios.
 */

import postmarkClient, { 
  EmailRecipient, 
  EmailTemplateData, 
  EmailOptions 
} from './postmark-client';

// Types for different email purposes
export type WelcomeEmailData = {
  firstName: string;
  loginUrl: string;
  passwordSetUrl?: string;
};

export type PasswordResetEmailData = {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export type ClassReminderEmailData = {
  firstName: string;
  className: string;
  classDate: string;
  classTime: string;
  zoomLink: string;
  preparationMaterials?: string;
};

export type PromotionalEmailData = {
  firstName: string;
  promotionTitle: string;
  promotionDescription: string;
  promotionUrl: string;
  expirationDate?: string;
  couponCode?: string;
};

/**
 * Email service for sending various types of emails
 */
export class EmailService {
  /**
   * Send a welcome email to a new user
   * 
   * @param recipient - The recipient's email and name
   * @param data - The data needed for the welcome email
   * @returns Promise with the send result
   */
  async sendWelcomeEmail(recipient: EmailRecipient, data: WelcomeEmailData) {
    // This will use a template once we create them in the Postmark account
    // For now, we'll construct the email directly
    
    const subject = 'Welcome to Graceful Homeschooling!';
    const htmlBody = `
      <div>
        <h1>Welcome to Graceful Homeschooling, ${data.firstName}!</h1>
        <p>We're excited to have you join our community.</p>
        <p>You can access your account at <a href="${data.loginUrl}">${data.loginUrl}</a></p>
        ${data.passwordSetUrl ? `<p>Please set your password at <a href="${data.passwordSetUrl}">this link</a>.</p>` : ''}
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Warm regards,<br>The Graceful Homeschooling Team</p>
      </div>
    `;
    
    return await postmarkClient.sendEmail({
      to: recipient,
      subject,
      htmlBody,
      tag: 'welcome',
      messageStream: 'outbound', // Default stream for transactional emails
    });
  }

  /**
   * Send a password reset email
   * 
   * @param recipient - The recipient's email and name
   * @param data - The data needed for the password reset email
   * @returns Promise with the send result
   */
  async sendPasswordResetEmail(recipient: EmailRecipient, data: PasswordResetEmailData) {
    const subject = 'Reset Your Graceful Homeschooling Password';
    const htmlBody = `
      <div>
        <h1>Password Reset Request</h1>
        <p>Hello ${data.firstName},</p>
        <p>We received a request to reset your password for your Graceful Homeschooling account.</p>
        <p>To reset your password, please click the link below:</p>
        <p><a href="${data.resetUrl}">Reset Password</a></p>
        <p>This link will expire in ${data.expiresInMinutes} minutes.</p>
        <p>If you did not request a password reset, please ignore this email or contact support.</p>
        <p>Warm regards,<br>The Graceful Homeschooling Team</p>
      </div>
    `;
    
    return await postmarkClient.sendEmail({
      to: recipient,
      subject,
      htmlBody,
      tag: 'password-reset',
      messageStream: 'outbound',
    });
  }

  /**
   * Send a class reminder email
   * 
   * @param recipient - The recipient's email and name
   * @param data - The data needed for the class reminder email
   * @returns Promise with the send result
   */
  async sendClassReminderEmail(recipient: EmailRecipient, data: ClassReminderEmailData) {
    const subject = `Reminder: ${data.className} Class on ${data.classDate}`;
    const htmlBody = `
      <div>
        <h1>Class Reminder: ${data.className}</h1>
        <p>Hello ${data.firstName},</p>
        <p>This is a reminder that your ${data.className} class is scheduled for:</p>
        <p><strong>Date:</strong> ${data.classDate}</p>
        <p><strong>Time:</strong> ${data.classTime}</p>
        <p><strong>Zoom Link:</strong> <a href="${data.zoomLink}">${data.zoomLink}</a></p>
        ${data.preparationMaterials ? `
          <h2>Preparation Materials</h2>
          <p>${data.preparationMaterials}</p>
        ` : ''}
        <p>We look forward to seeing you in class!</p>
        <p>Warm regards,<br>The Graceful Homeschooling Team</p>
      </div>
    `;
    
    return await postmarkClient.sendEmail({
      to: recipient,
      subject,
      htmlBody,
      tag: 'class-reminder',
      messageStream: 'outbound',
    });
  }

  /**
   * Send a promotional email
   * 
   * @param recipient - The recipient's email and name
   * @param data - The data needed for the promotional email
   * @returns Promise with the send result
   */
  async sendPromotionalEmail(recipient: EmailRecipient, data: PromotionalEmailData) {
    const subject = data.promotionTitle;
    const htmlBody = `
      <div>
        <h1>${data.promotionTitle}</h1>
        <p>Hello ${data.firstName},</p>
        <p>${data.promotionDescription}</p>
        ${data.couponCode ? `<p><strong>Use coupon code:</strong> ${data.couponCode}</p>` : ''}
        ${data.expirationDate ? `<p><strong>Offer expires:</strong> ${data.expirationDate}</p>` : ''}
        <p><a href="${data.promotionUrl}">Learn More</a></p>
        <p>Warm regards,<br>The Graceful Homeschooling Team</p>
        <p style="font-size: 12px; color: #666;">
          If you no longer wish to receive promotional emails, 
          <a href="{{unsubscribe_url}}">unsubscribe here</a>.
        </p>
      </div>
    `;
    
    return await postmarkClient.sendEmail({
      to: recipient,
      subject,
      htmlBody,
      tag: 'promotional',
      messageStream: 'broadcast', // Use broadcast stream for marketing emails
    });
  }

  /**
   * Send a bulk email to multiple recipients
   * 
   * @param recipients - Array of recipient objects with email and name
   * @param subject - Email subject
   * @param htmlBody - Email HTML content
   * @param options - Additional email options
   * @returns Promise with an array of send results
   */
  async sendBulkEmail(
    recipients: EmailRecipient[],
    subject: string,
    htmlBody: string,
    options: Partial<EmailOptions> = {}
  ) {
    // Send emails in batches to avoid rate limits
    const batchSize = 20;
    const results = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const promises = batch.map(recipient => {
        return postmarkClient.sendEmail({
          to: recipient,
          subject,
          htmlBody,
          ...options,
        });
      });
      
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);
      
      // Simple rate limiting - wait between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// Export a singleton instance
export default new EmailService();
