/**
 * Unlayer Email Templates Index
 * 
 * This file exports all the Unlayer email templates for easy access.
 * Each template is modular and can be imported individually or all together.
 */

import emailVerificationTemplate from './email-verification';
import passwordResetTemplate from './password-reset';
import welcomeTemplate from './welcome';

// Export individual templates
export {
  emailVerificationTemplate,
  passwordResetTemplate,
  welcomeTemplate,
};

// Export templates by key for easy lookup
export const unlayerTemplates = {
  'email-verification': emailVerificationTemplate,
  'password-reset': passwordResetTemplate,
  'welcome': welcomeTemplate,
};

// Export templates grouped by category
export const templatesByCategory = {
  authentication: {
    'email-verification': emailVerificationTemplate,
    'password-reset': passwordResetTemplate,
    'welcome': welcomeTemplate,
  },
};
