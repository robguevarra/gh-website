# Email Template System & Service - Developer Handoff Guide

## Overview

This document provides comprehensive guidance for developers working with our email template system, covering template creation using Unlayer editor, email service integration with Postmark, variable mapping, and webhook integration patterns.

## System Architecture

### Core Components

1. **Template Creation UI** - Admin interface for creating/editing email templates
2. **Template Storage** - Supabase database storage for templates
3. **Variable System** - Dynamic content substitution system
4. **Email Service** - Postmark integration for sending emails
5. **Webhook Integration** - Automatic email triggers from payment events

### Technology Stack

- **Frontend**: Next.js 15+ with React Server Components
- **Email Editor**: Unlayer (unlayer.com) for WYSIWYG template editing
- **Database**: Supabase PostgreSQL for template storage
- **Email Provider**: Postmark for email delivery
- **Styling**: Tailwind CSS + Shadcn UI components

## Template Creation System

### 1. Database Schema

Templates are stored in the `email_templates` table:

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  design JSONB, -- Unlayer design JSON
  category TEXT, -- e.g., 'transactional', 'marketing'
  subcategory TEXT, -- e.g., 'affiliate-conversion', 'welcome'
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Template Categories & Types

Templates are organized by category and subcategory:

```typescript
// From lib/services/email/template-utils.ts
export const TEMPLATE_CATEGORIES = {
  transactional: {
    label: 'Transactional',
    subcategories: {
      'welcome': 'Welcome Emails',
      'affiliate-conversion': 'Affiliate Notifications',
      'order-confirmation': 'Order Confirmations',
      'password-reset': 'Password Reset',
      'account-verification': 'Account Verification'
    }
  },
  marketing: {
    label: 'Marketing',
    subcategories: {
      'newsletter': 'Newsletter',
      'promotional': 'Promotional',
      'announcement': 'Announcements'
    }
  },
  system: {
    label: 'System',
    subcategories: {
      'admin-notification': 'Admin Notifications',
      'error-alert': 'Error Alerts'
    }
  }
};
```

### 3. Admin Interface

#### Location
- **File**: `app/admin/email-templates/email-templates-manager.tsx`
- **Route**: `/admin/email-templates`

#### Key Features
- List all templates with filtering by category/status
- Create new templates using Unlayer editor
- Edit existing templates
- Preview templates with variable substitution
- Variable management system

#### Important Implementation Notes

**Template Creation Dialog Fix:**
```typescript
// CRITICAL: Must manage showCreateDialog state properly
const [showCreateDialog, setShowCreateDialog] = useState(false);

// Button to open dialog
<Button onClick={() => setShowCreateDialog(true)}>
  Create Template
</Button>

// Dialog component
<CreateTemplateDialog 
  open={showCreateDialog} 
  onOpenChange={setShowCreateDialog}
/>
```

**API Integration:**
```typescript
// Templates are stored in Supabase, NOT filesystem
const response = await fetch('/api/admin/email-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: templateName,
    category: selectedCategory,
    subcategory: selectedSubcategory,
    design: unlayerDesign, // From Unlayer editor
    html_content: exportedHtml,
    text_content: generateTextVersion(exportedHtml),
    variables: extractedVariables
  })
});
```

### 4. Brand Design Guidelines

#### Brand Colors
- **Primary Blue**: `#9ac5d9`
- **Purple**: `#b08ba5` 
- **Pink**: `#f1b5bc`
- **Light Background**: `#f0f9fc`

#### Logo
- **URL**: `https://a.mailmunch.co/user_data/landing_pages/1746790032623-logo.png`
- **Usage**: Always include in header section
- **Size**: Max width 180px for email compatibility

#### Typography
- **Primary Font**: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Fallback**: Standard web-safe fonts
- **Headers**: Bold weights, proper hierarchy

#### Template Structure Pattern
1. **Header Section** - Purple background (#b08ba5) with logo
2. **Hero Banner** - Blue background (#9ac5d9) with main message
3. **Content Section** - White background with light blue accents
4. **Details Box** - Light background (#f9f5f8) with blue left border
5. **CTA Button** - Purple background (#b08ba5) with white text
6. **Footer** - Light gray background with legal links

#### Responsive Design
- **Max Width**: 600px container
- **Mobile Breakpoint**: 620px
- **Mobile Behavior**: Single column, full width
- **Image Scaling**: Max width 100% on mobile

## Variable System

### 1. Variable Categories

Variables are organized into categories for better UX:

```typescript
export interface EmailVariable {
  name: string; // Display name
  placeholder: string; // {{variable_name}}
  description: string;
  sampleValue: string;
  category: 'Recipient Details' | 'Company & Legal' | 'Utility Links' | 'Affiliate';
  dataKey?: string; // Backend identifier
  notes?: string;
}
```

### 2. Standard Variables

**Recipient Details:**
- `{{first_name}}` - Recipient's first name
- `{{last_name}}` - Recipient's last name  
- `{{full_name}}` - Full name
- `{{email_address}}` - Email address

**Company & Legal:**
- `{{company_name}}` - "Graceful Homeschooling"
- `{{company_address}}` - Full company address
- `{{current_year}}` - Current year
- `{{unsubscribe_url}}` - Unsubscribe link

**Utility Links:**
- `{{login_url}}` - Login page URL
- `{{dashboard_url}}` - User dashboard URL
- `{{support_email}}` - Support contact email

**Affiliate Variables:**
- `{{affiliate_name}}` - Affiliate's full name
- `{{customer_name}}` - Customer who purchased
- `{{product_name}}` - Product purchased
- `{{sale_amount}}` - Sale amount with currency
- `{{commission_rate}}` - Commission percentage
- `{{commission_amount}}` - Commission earned
- `{{dashboard_url}}` - Affiliate dashboard URL

### 3. Variable Substitution

#### Implementation
```typescript
// From lib/services/email/template-utils.ts
export function substituteVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}
```

#### Usage Pattern
```typescript
const emailVariables = {
  ...getStandardVariableDefaults(),
  affiliate_name: 'John Doe',
  commission_amount: '₱250.00',
  // ... other specific variables
};

const finalHtml = substituteVariables(template.html_content, emailVariables);
const finalSubject = substituteVariables(template.subject, emailVariables);
```

### 4. Variable Naming Convention

**CRITICAL: Use snake_case for all variables**

❌ **WRONG (camelCase):**
```html
{{customerName}}
{{saleAmount}}
{{dashboardUrl}}
```

✅ **CORRECT (snake_case):**
```html
{{customer_name}}
{{sale_amount}}
{{dashboard_url}}
```

**Reason**: Consistency with database column naming and easier template maintenance.

## Email Service System

### 1. Postmark Integration

#### Configuration
```typescript
// lib/services/email/postmark-client.ts
import { Client } from 'postmark';

export function createPostmarkClient(): Client {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  if (!serverToken) {
    throw new Error('POSTMARK_SERVER_TOKEN environment variable is required');
  }
  return new Client(serverToken);
}
```

#### Required Environment Variables
```bash
POSTMARK_SERVER_TOKEN=your_postmark_server_token
POSTMARK_FROM_EMAIL=noreply@gracefulhomeschooling.com
POSTMARK_FROM_NAME="Graceful Homeschooling"
```

### 2. Email Sending Service

#### Generic Email Service
```typescript
// Basic email sending
const postmarkClient = createPostmarkClient();
const result = await postmarkClient.sendEmail({
  to: { email: 'user@example.com', name: 'User Name' },
  subject: 'Email Subject',
  htmlBody: htmlContent,
  textBody: textContent,
  tag: 'email-category',
  metadata: {
    template_id: 'template-uuid',
    user_id: 'user-uuid'
  }
});
```

#### Specialized Services

**Affiliate Conversion Notifications:**
```typescript
// lib/services/email/affiliate-notification-service.ts
export async function sendAffiliateConversionNotification(
  conversionId: string, 
  templateName: string = 'Affiliate Conversion Notification'
) {
  // 1. Fetch conversion data from database
  const conversionData = await fetchAffiliateConversionData(conversionId);
  
  // 2. Get email template
  const template = await getEmailTemplate(templateName);
  
  // 3. Prepare variables
  const emailVariables = {
    ...getStandardVariableDefaults(),
    affiliate_name: conversionData.affiliateName,
    commission_amount: conversionData.commissionAmount,
    // ... other variables
  };
  
  // 4. Substitute variables
  const finalHtml = substituteVariables(template.html_content, emailVariables);
  const finalSubject = substituteVariables(template.subject, emailVariables);
  
  // 5. Send email
  const result = await postmarkClient.sendEmail({
    to: { email: conversionData.affiliateEmail, name: conversionData.affiliateName },
    subject: finalSubject,
    htmlBody: finalHtml,
    textBody: finalText,
    tag: 'affiliate-conversion',
    metadata: { conversion_id: conversionId }
  });
  
  return result;
}
```

### 3. Data Fetching Patterns

#### Database Relationships
```typescript
// Affiliate conversion data requires multiple table joins
const conversionData = await fetchAffiliateConversionData(conversionId);

// Internal implementation uses:
// - affiliate_conversions table (main data)
// - affiliates table (commission rate, user_id)  
// - unified_profiles table (affiliate name, email)
// - transactions table (customer data, sale amount)
```

#### Error Handling Pattern
```typescript
export async function fetchAffiliateConversionData(conversionId: string): Promise<AffiliateConversionData | null> {
  try {
    // Get conversion with affiliate data
    const { data: conversion, error } = await supabase
      .from('affiliate_conversions')
      .select(`
        id, gmv, commission_amount, order_id,
        affiliates!inner(
          commission_rate,
          unified_profiles!inner(first_name, last_name, email)
        )
      `)
      .eq('id', conversionId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    // Transform and return data
    return transformConversionData(conversion);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}
```

## Webhook Integration Patterns

### 1. Integration Points

#### Xendit Payment Webhook
```typescript
// app/api/webhooks/xendit/route.ts
// Integration occurs after successful conversion recording

if (success) {
  console.log(`[Webhook][P2P] Conversion recorded: ${conversionId}`);
  
  // --- Send Affiliate Conversion Email Notification ---
  try {
    console.log(`[Webhook][P2P] Sending affiliate conversion email for conversion: ${conversionId}`);
    await sendAffiliateConversionNotification(conversionId as string);
    console.log(`[Webhook][P2P] ✅ Affiliate conversion email sent successfully`);
  } catch (emailError) {
    console.error(`[Webhook][P2P] ❌ Failed to send affiliate conversion email:`, emailError);
    // Don't throw - email failure shouldn't break payment processing
  }
  // --- End Affiliate Email Notification ---
}
```

### 2. Error Handling Best Practices

#### Non-Breaking Integration
- **Email failures MUST NOT break payment processing**
- **Use try-catch blocks around email sending**
- **Log errors comprehensively for debugging**
- **Return appropriate error responses**

#### Logging Pattern
```typescript
try {
  console.log(`[Context] Starting email operation: ${operation}`);
  const result = await emailService(params);
  console.log(`[Context] ✅ Email operation successful: ${result.MessageID}`);
  return result;
} catch (error) {
  console.error(`[Context] ❌ Email operation failed:`, error);
  // Don't throw unless email is critical to the operation
}
```

## Creating New Email Templates

### Step-by-Step Process

#### 1. Plan the Template
- **Identify the use case** (transactional, marketing, etc.)
- **Define required variables** (what dynamic content is needed)
- **Choose appropriate category/subcategory**
- **Consider the user journey** (when/why they receive this email)

#### 2. Design the Template
- **Access the admin interface** at `/admin/email-templates`
- **Click "Create Template"** 
- **Choose category and subcategory**
- **Use Unlayer editor** to design the template
- **Follow brand guidelines** (colors, fonts, logo placement)
- **Include variable placeholders** using `{{variable_name}}` syntax

#### 3. Template Design Best Practices

**Structure:**
```html
<!-- Header with brand colors and logo -->
<div style="background-color: #b08ba5;">
  <img src="logo-url" alt="Graceful Homeschooling" />
</div>

<!-- Hero section with main message -->
<div style="background-color: #9ac5d9;">
  <h1>Main Headline with {{variable_name}}</h1>
</div>

<!-- Content section -->
<div style="background-color: #ffffff;">
  <!-- Details box -->
  <div style="background-color: #f9f5f8; border-left: 4px solid #9ac5d9;">
    <ul>
      <li><strong>Field:</strong> {{variable_value}}</li>
    </ul>
  </div>
  
  <!-- CTA Button -->
  <a href="{{action_url}}" style="background-color: #b08ba5; color: white;">
    Call to Action
  </a>
</div>

<!-- Footer -->
<div style="background-color: #f8f8f8;">
  <p>© {{current_year}} {{company_name}}</p>
</div>
```

#### 4. Variable Planning
- **Use snake_case naming**: `{{customer_name}}` not `{{customerName}}`
- **Include all necessary variables** in the template design
- **Add variables to template-utils.ts** if they're new
- **Test variable substitution** before going live

#### 5. Testing Process
- **Save template** in admin interface
- **Create test API endpoint** (follow pattern from test-affiliate-email-simple)
- **Test with real data** to verify variable substitution
- **Check email rendering** across different email clients
- **Verify responsive design** on mobile devices

#### 6. Integration
- **Create specialized service function** (follow affiliate-notification-service pattern)
- **Add webhook integration** if automatic triggering is needed
- **Implement proper error handling**
- **Add comprehensive logging**
- **Update documentation** with new template details

## Troubleshooting Common Issues

### Template Issues

**Template Creation Dialog Not Opening:**
- Check `showCreateDialog` state management
- Verify button onClick handler
- Check for JavaScript errors in console

**Variables Not Substituting:**
- Verify variable names match exactly (case-sensitive)
- Check for typos in variable placeholders
- Ensure variables are included in substitution data
- Use snake_case, not camelCase

**Template Not Saving:**
- Check API endpoint errors in network tab
- Verify Supabase connection and permissions
- Check required fields (html_content, text_content cannot be null)

### Email Sending Issues

**Postmark Authentication Errors:**
- Verify POSTMARK_SERVER_TOKEN environment variable
- Check token permissions in Postmark dashboard
- Ensure token is for correct Postmark server

**Email Not Sending:**
- Check network connectivity
- Verify recipient email address format
- Check Postmark sending limits and bounces
- Review Postmark activity dashboard

**Variable Data Missing:**
- Check database queries and relationships
- Verify user permissions for data access
- Check for null/undefined values in data
- Review database connection and timeout issues

### Integration Issues

**Webhook Email Failures:**
- Check webhook error logs
- Verify conversion data is available
- Test email service independently
- Check database transaction states

## Security Considerations

### Email Template Security
- **Sanitize user inputs** in variable data
- **Validate email addresses** before sending
- **Escape HTML content** in user-generated variables
- **Use secure API endpoints** for template management

### Environment Variables
- **Never commit API keys** to version control
- **Use different keys** for development/production
- **Rotate keys regularly**
- **Monitor API usage** for unusual activity

### Database Security
- **Use service client** for server-side operations
- **Validate permissions** before template creation/editing
- **Sanitize database queries**
- **Monitor for SQL injection attempts**

## Performance Optimization

### Email Sending
- **Use background jobs** for non-critical emails
- **Implement retry logic** for failed sends
- **Batch email operations** when possible
- **Monitor send rates** to avoid provider limits

### Template Management
- **Cache frequently used templates**
- **Minimize database queries**
- **Optimize image sizes** in templates
- **Use CDN for static assets**

### Database Optimization
- **Index commonly queried fields**
- **Use select specific columns** rather than SELECT *
- **Monitor query performance**
- **Implement connection pooling**

## Future Enhancements

### Planned Features
- **Template versioning** - Track template changes over time
- **A/B testing** - Test different template versions
- **Analytics dashboard** - Track email performance metrics
- **Template library** - Pre-built templates for common use cases
- **Multi-language support** - Internationalization for templates
- **Advanced personalization** - ML-powered content optimization

### Technical Improvements
- **Template validation** - Automated testing for template integrity
- **Performance monitoring** - Real-time email delivery tracking
- **Fallback systems** - Backup email providers
- **Template migration tools** - Easy template import/export

---

## Quick Reference

### Key Files
- **Template Manager**: `app/admin/email-templates/email-templates-manager.tsx`
- **Template API**: `app/api/admin/email-templates/route.ts`
- **Variable Utils**: `lib/services/email/template-utils.ts`
- **Postmark Client**: `lib/services/email/postmark-client.ts`
- **Affiliate Service**: `lib/services/email/affiliate-notification-service.ts`
- **Webhook Integration**: `app/api/webhooks/xendit/route.ts`

### Important URLs
- **Admin Interface**: `/admin/email-templates`
- **Unlayer Editor**: Embedded in admin interface
- **Test Endpoint**: `/api/test-affiliate-email-simple`

### Database Tables
- **email_templates** - Template storage
- **affiliate_conversions** - Conversion data
- **affiliates** - Affiliate information
- **unified_profiles** - User profile data

### Environment Variables
```bash
POSTMARK_SERVER_TOKEN=your_token
POSTMARK_FROM_EMAIL=noreply@gracefulhomeschooling.com
POSTMARK_FROM_NAME="Graceful Homeschooling"
```

---

*This document should be updated whenever new templates are created or email services are modified. Keep it as the single source of truth for email system development.* 