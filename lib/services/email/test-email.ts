/**
 * Test Email Utility
 * 
 * This file provides a simple way to test the email service
 * by sending a test email. Can be run from the terminal.
 * 
 * Usage: 
 * npx tsx lib/services/email/test-email.ts your-email@example.com
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import emailService from './email-service';

async function main() {
  // Get recipient email from command line args
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a recipient email address');
    console.error('Usage: npx tsx lib/services/email/test-email.ts your-email@example.com');
    process.exit(1);
  }

  const recipientEmail = args[0];
  console.log(`Sending test email to ${recipientEmail}...`);

  try {
    // Send a test welcome email
    const result = await emailService.sendWelcomeEmail(
      { email: recipientEmail, name: 'Test User' },
      {
        firstName: 'Test User',
        loginUrl: 'https://gracefulhomeschooling.com/login',
        passwordSetUrl: 'https://gracefulhomeschooling.com/set-password?token=test-token',
      }
    );

    console.log('Email sent successfully!');
    console.log('Message ID:', result.MessageID);
    console.log('To:', result.To);
    console.log('Submission ID:', result.SubmittedAt);
  } catch (error) {
    console.error('Failed to send email:');
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
