/**
 * Email Templates Admin Page
 * 
 * This page provides an interface for administrators to:
 * - View all email templates
 * - Edit templates using the MJML editor
 * - Preview rendered emails
 * - Test send emails
 */

import { Metadata } from 'next';
import EmailTemplatesManager from './email-templates-manager';

export const metadata: Metadata = {
  title: 'Email Templates | Admin Dashboard',
  description: 'Manage email templates for Graceful Homeschooling',
};

export default function EmailTemplatesPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
      </div>
      
      <div className="space-y-1">
        <p className="text-muted-foreground">
          Manage email templates used throughout the application. Templates use MJML for responsive design
          and support variable substitution for personalization.
        </p>
      </div>
      
      <EmailTemplatesManager />
    </div>
  );
}
