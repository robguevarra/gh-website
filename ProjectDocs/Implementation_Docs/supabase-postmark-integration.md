# Supabase Auth + Postmark Integration Guide

## Overview

This document explains how to configure Supabase Auth to use our custom Postmark email service for authentication emails. This hybrid approach gives us:

1. Full control over email templates with our MJML design system
2. Consistent branding across all email communications
3. Enhanced delivery and tracking through Postmark
4. Proper fallback to Supabase's built-in emails if needed

## Implementation Details

We've created a webhook-based solution that:

1. Intercepts Supabase Auth email events (password reset, verification, etc.)
2. Processes these events through our custom handlers
3. Sends branded, responsive emails using Postmark
4. Maintains analytics and tracking

## Configuration Steps

### 1. Supabase Dashboard Configuration

1. Log into the [Supabase Dashboard](https://app.supabase.io/)
2. Navigate to your project → Authentication → Email Templates
3. Configure the Webhook URL:
   ```
   https://gracefulhomeschooling.com/api/auth/email-handler
   ```
4. Set Email Delivery Method to "Custom SMTP"
5. Configure the fallback SMTP settings (you can use Postmark's SMTP credentials as backup)
6. Test the webhook to confirm it's working

### 2. Email Templates

Our system uses custom MJML templates located in:
```
lib/services/email/templates/authentication/
```

The templates include:
- `welcome.mjml` - Sent after successful registration
- `password-reset.mjml` - Sent for password recovery
- `email-verification.mjml` - Sent for email address verification

All templates follow our brand guidelines with:
- Primary purple (#b08ba5)
- Accent pink (#f1b5bc)
- Secondary blue (#9ac5d9)
- Inter font for body text
- Playfair Display for headings

### 3. Custom Email Handlers

The implementation consists of:

1. `lib/services/email/supabase-auth-email-handler.ts`
   - Processes auth events
   - Retrieves user information
   - Formats and sends emails

2. `app/api/auth/email-handler/route.ts`
   - Webhook endpoint that receives events from Supabase
   - Routes events to appropriate handlers
   - Returns proper responses to Supabase

### 4. Testing the Integration

To test the complete flow:

1. **Password Reset Test:**
   - Navigate to sign-in page
   - Click "Forgot Password"
   - Enter test email address
   - Verify custom Postmark email is received
   - Complete password reset process

2. **Sign-up Test:**
   - Create a new account
   - Verify welcome email is received
   - Verify email verification process works

3. **Email Change Test:**
   - Log in to an existing account
   - Change email address
   - Verify confirmation email is sent to new address

## Troubleshooting

### Common Issues:

1. **Webhook Not Receiving Events:**
   - Verify the webhook URL is correctly configured in Supabase
   - Check network rules/firewalls are allowing Supabase IPs
   - Inspect server logs for incoming requests

2. **Emails Not Being Sent:**
   - Verify Postmark API key is valid
   - Check template rendering errors in logs
   - Ensure user email is valid and not bouncing

3. **Template Rendering Issues:**
   - Verify MJML templates are valid
   - Check for missing template variables
   - Test template rendering with sample data

## Maintenance

### Adding New Email Types:

1. Create a new MJML template in the appropriate directory
2. Add a new handler method in `supabase-auth-email-handler.ts`
3. Update the event mapping in the webhook route if needed

### Updating Templates:

1. Edit the MJML file directly
2. The template manager will automatically reload templates
3. Test with real events to verify changes

## Security Considerations

- The webhook endpoint is public but expects specific event format
- Consider adding JWT verification for added security
- Monitor for suspicious activity or high volumes of auth events

## References

- [Supabase Auth Hooks Documentation](https://supabase.com/docs/guides/auth/auth-hooks)
- [Postmark API Documentation](https://postmarkapp.com/developer/api/overview)
- [MJML Documentation](https://mjml.io/documentation/)
