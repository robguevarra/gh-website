# Email Marketing System

This document outlines the implementation details for the email marketing system that will replace the functionality currently provided by systeme.io.

## Overview

The email marketing system will enable administrators to create, manage, and automate emails to users based on various triggers and workflows. It will support transactional emails, marketing campaigns, and automated sequences tied to user behaviors and course progress.

## Core Components

### 1. Email Template System

The template system will allow for the creation and management of reusable email templates:

- **Template Editor**
  - WYSIWYG editing interface
  - HTML/CSS template creation
  - Variable insertion for personalization
  - Mobile preview and testing

- **Template Categories**
  - Transactional (welcome, password reset, receipts)
  - Marketing (newsletters, promotions)
  - Course-related (lesson reminders, completion congratulations)
  - Onboarding sequences

- **Template Storage**
  - Version history and rollback capabilities
  - Template duplication and sharing
  - Template analytics (open rates, click rates)

### 2. Campaign Management

Tools for creating and sending one-off or recurring email campaigns:

- **Campaign Builder**
  - Campaign creation with subject line testing
  - Recipient segmentation and targeting
  - Scheduling and throttling options
  - Preview and testing capabilities

- **Analytics Dashboard**
  - Open and click tracking
  - Conversion attribution
  - Unsubscribe monitoring
  - Deliverability reporting

### 3. Automation Workflows

Visual workflow builder for creating triggered email sequences:

- **Trigger Types**
  - User registration
  - Course enrollment
  - Lesson completion
  - Purchase events
  - Inactivity triggers
  - Date-based triggers

- **Action Types**
  - Send email
  - Apply tag to user
  - Change membership tier
  - Add/remove from segment
  - Webhook to external system

- **Conditional Logic**
  - If/then branching based on user behavior
  - Time delays and wait conditions
  - Enrollment/exit conditions

## Technical Implementation

### Email Service Provider Integration

We will integrate with a modern email service provider (ESP) to handle delivery and tracking:

```typescript
// Example email service integration (using Resend as the provider)

import { Resend } from 'resend';

// Initialize with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Function to send transactional email
export async function sendTransactionalEmail({
  templateId,
  recipientEmail,
  recipientName,
  variables,
  tags,
}) {
  try {
    // Get template from database
    const template = await getEmailTemplate(templateId);
    
    if (!template) {
      throw new Error(`Email template not found: ${templateId}`);
    }
    
    // Process template with variables
    const { subject, htmlContent, textContent } = processTemplate(template, variables);
    
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
      tags: tags.map(tag => ({ name: tag })),
    });
    
    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    
    // Log email in database
    await logEmailSent({
      templateId,
      recipientEmail,
      subject,
      status: 'sent',
      providerMessageId: data.id,
      variables,
      tags,
    });
    
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log failed email attempt
    await logEmailError({
      templateId,
      recipientEmail,
      error: error.message,
      variables,
      tags,
    });
    
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Template Processing System

```typescript
// Example template processing system

import Handlebars from 'handlebars';
import mjml2html from 'mjml';

// Process template with variables
function processTemplate(template, variables) {
  // Compile subject line
  const subjectTemplate = Handlebars.compile(template.subject);
  const subject = subjectTemplate(variables);
  
  // Process HTML content (if using MJML)
  let htmlContent;
  if (template.isMjml) {
    const mjmlResult = mjml2html(template.htmlContent);
    const htmlTemplate = Handlebars.compile(mjmlResult.html);
    htmlContent = htmlTemplate(variables);
  } else {
    const htmlTemplate = Handlebars.compile(template.htmlContent);
    htmlContent = htmlTemplate(variables);
  }
  
  // Process text content
  const textTemplate = Handlebars.compile(template.textContent || '');
  const textContent = textTemplate(variables);
  
  return {
    subject,
    htmlContent,
    textContent,
  };
}
```

### Visual Workflow Builder

The visual workflow builder will be implemented with a React-based interface using libraries like ReactFlow:

```typescript
// Example workflow execution engine

// Function to process automation workflow
export async function processWorkflowTrigger({
  workflowId,
  triggerId,
  triggerType,
  userId,
  eventData,
}) {
  try {
    // Get workflow from database
    const workflow = await getWorkflow(workflowId);
    
    if (!workflow || workflow.status !== 'active') {
      return { success: false, reason: 'Workflow not active' };
    }
    
    // Check if user should enter this workflow
    const shouldEnter = await evaluateEntryConditions(workflow, userId, eventData);
    
    if (!shouldEnter) {
      return { success: true, result: 'skipped' };
    }
    
    // Create workflow instance for this user
    const workflowInstance = await createWorkflowInstance({
      workflowId,
      userId,
      triggerType,
      eventData,
      status: 'active',
      currentStepId: workflow.startStepId,
    });
    
    // Process the first step immediately
    await processWorkflowStep({
      workflowInstanceId: workflowInstance.id,
      stepId: workflow.startStepId,
      userId,
      eventData,
    });
    
    return {
      success: true,
      workflowInstanceId: workflowInstance.id,
    };
  } catch (error) {
    console.error('Error processing workflow trigger:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Function to process a workflow step
async function processWorkflowStep({
  workflowInstanceId,
  stepId,
  userId,
  eventData,
}) {
  try {
    // Get workflow instance and details
    const instance = await getWorkflowInstance(workflowInstanceId);
    const workflow = await getWorkflow(instance.workflowId);
    const step = workflow.steps.find(s => s.id === stepId);
    
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }
    
    // Log step execution start
    await logWorkflowStep({
      workflowInstanceId,
      stepId,
      status: 'processing',
      startedAt: new Date(),
    });
    
    // Get user data for personalization
    const user = await getUserById(userId);
    
    // Execute step based on type
    let result;
    switch (step.type) {
      case 'send_email':
        result = await executeEmailStep(step, user, eventData);
        break;
        
      case 'apply_tag':
        result = await executeTagStep(step, user);
        break;
        
      case 'wait':
        result = await executeWaitStep(step, workflowInstanceId);
        return; // Early return as next step will be scheduled
        
      case 'condition':
        result = await executeConditionStep(step, user, eventData);
        break;
        
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
    
    // Log step completion
    await logWorkflowStepCompletion({
      workflowInstanceId,
      stepId,
      status: 'completed',
      result,
      completedAt: new Date(),
    });
    
    // Find and execute next step
    const nextStepId = getNextStepId(workflow, step, result);
    
    if (nextStepId) {
      // Process next step
      await processWorkflowStep({
        workflowInstanceId,
        stepId: nextStepId,
        userId,
        eventData,
      });
    } else {
      // End of workflow
      await completeWorkflowInstance(workflowInstanceId);
    }
  } catch (error) {
    console.error('Error processing workflow step:', error);
    
    // Log step error
    await logWorkflowStepError({
      workflowInstanceId,
      stepId,
      error: error.message,
    });
  }
}
```

### Email Analytics Tracking

```typescript
// Example email analytics tracking

// Track email open
export async function trackEmailOpen(req, res) {
  try {
    const { trackingId } = req.query;
    
    if (!trackingId) {
      return res.status(400).end();
    }
    
    // Decode tracking ID
    const { messageId, userId } = decodeTrackingId(trackingId);
    
    // Update email log with open event
    await updateEmailLogWithOpen({
      providerMessageId: messageId,
      openedAt: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIp(req),
    });
    
    // Return transparent 1x1 pixel
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Error tracking email open:', error);
    res.status(500).end();
  }
}

// Track email click
export async function trackEmailClick(req, res) {
  try {
    const { trackingId, url } = req.query;
    
    if (!trackingId || !url) {
      return res.status(400).end();
    }
    
    // Decode tracking ID
    const { messageId, userId } = decodeTrackingId(trackingId);
    
    // Update email log with click event
    await updateEmailLogWithClick({
      providerMessageId: messageId,
      clickedAt: new Date(),
      url: decodeURIComponent(url),
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIp(req),
    });
    
    // Redirect to actual URL
    res.redirect(decodeURIComponent(url));
  } catch (error) {
    console.error('Error tracking email click:', error);
    res.status(500).end();
  }
}
```

## User Interface Components

### 1. Template Editor

The template editor will be implemented using a modern WYSIWYG editor with a focus on email compatibility:

- React-based editor with drag-and-drop functionality
- MJML integration for responsive email support
- Real-time preview with device simulation
- Variable insertion UI for personalization
- Template categories and organization

### 2. Campaign Builder

The campaign builder will provide a step-by-step interface for creating email campaigns:

- Multi-step wizard interface
- Recipient segment selection
- A/B testing capabilities
- Scheduling options with time zone support
- Detailed analytics dashboard

### 3. Visual Workflow Builder

The workflow builder will use a visual canvas for designing automation flows:

- Drag-and-drop interface for steps and connections
- Step configuration panels
- Conditional branching visualization
- Testing and preview functionality
- Version history and sharing

## Database Schema

The email system will utilize the following database tables (defined in Supabase schema):

- `email_templates`: Stores template content and metadata
- `email_campaigns`: Tracks campaign configurations and results
- `email_workflows`: Defines automation workflows and triggers
- `email_logs`: Records all sent emails and interactions
- `workflow_instances`: Tracks users progressing through workflows
- `workflow_steps`: Logs individual step executions within workflows

## API Endpoints

The system will expose the following API endpoints for internal use:

### Template Management
- `GET /api/email/templates`: List templates
- `GET /api/email/templates/:id`: Get template details
- `POST /api/email/templates`: Create new template
- `PUT /api/email/templates/:id`: Update template
- `DELETE /api/email/templates/:id`: Delete template
- `POST /api/email/templates/:id/preview`: Generate preview

### Campaign Management
- `GET /api/email/campaigns`: List campaigns
- `GET /api/email/campaigns/:id`: Get campaign details
- `POST /api/email/campaigns`: Create new campaign
- `PUT /api/email/campaigns/:id`: Update campaign
- `POST /api/email/campaigns/:id/send`: Send campaign
- `POST /api/email/campaigns/:id/schedule`: Schedule campaign
- `POST /api/email/campaigns/:id/cancel`: Cancel scheduled campaign

### Workflow Management
- `GET /api/email/workflows`: List workflows
- `GET /api/email/workflows/:id`: Get workflow details
- `POST /api/email/workflows`: Create new workflow
- `PUT /api/email/workflows/:id`: Update workflow
- `POST /api/email/workflows/:id/activate`: Activate workflow
- `POST /api/email/workflows/:id/deactivate`: Deactivate workflow
- `GET /api/email/workflows/:id/analytics`: Get workflow analytics

### Subscriber Management
- `GET /api/email/subscribers`: List subscribers
- `GET /api/email/subscribers/:id`: Get subscriber details
- `POST /api/email/subscribers`: Add new subscriber
- `PUT /api/email/subscribers/:id`: Update subscriber
- `DELETE /api/email/subscribers/:id`: Delete subscriber
- `POST /api/email/subscribers/import`: Bulk import subscribers

## Integration with Other Platform Components

### User Management Integration
- Synchronize user profile updates with email subscriber data
- Manage opt-in/opt-out preferences
- Track email engagement in user profiles

### Course/LMS Integration
- Trigger emails based on course enrollment
- Send lesson completion notifications
- Create targeted segments based on course progress
- Provide personalized course recommendations

### E-commerce Integration
- Send order confirmations and receipts
- Trigger abandoned cart workflows
- Create targeted promotions based on purchase history
- Implement post-purchase follow-up sequences

## Implementation Phases

### Phase 1: Core Email Infrastructure
1. Set up email service provider integration
2. Implement transactional email sending
3. Create basic email templates for system notifications
4. Set up email tracking and analytics

### Phase 2: Template Management
1. Build template editor interface
2. Implement template storage and versioning
3. Add personalization variable system
4. Create template preview and testing

### Phase 3: Campaign Management
1. Develop campaign creation interface
2. Implement subscriber segmentation
3. Create campaign scheduling system
4. Set up campaign analytics

### Phase 4: Visual Workflow Builder
1. Build workflow editor interface
2. Implement workflow execution engine
3. Create trigger and condition system
4. Set up workflow analytics and monitoring

## Testing Strategy

### Functional Testing
- Verify template rendering across email clients
- Test personalization variable replacement
- Validate campaign sending and scheduling
- Test workflow trigger conditions and actions

### Performance Testing
- Assess system performance under load
- Test batch sending capabilities
- Measure workflow processing times
- Evaluate analytics data aggregation

### User Acceptance Testing
- Test template editor usability
- Validate workflow builder intuitiveness
- Assess campaign management functionality
- Test subscriber management features

## Migration Strategy

### Data Migration
- Export templates from systeme.io
- Export subscriber lists and segments
- Export campaign history and performance data
- Map workflows and automation rules

### Process Migration
- Document current email marketing processes
- Identify gaps in new system
- Create training materials for admin users
- Establish transition timeline

## Security Considerations

- Implement proper authentication for admin access
- Encrypt subscriber data at rest
- Secure API endpoints with rate limiting
- Comply with email marketing regulations (CAN-SPAM, GDPR)
- Implement unsubscribe and preference management

## Monitoring and Maintenance

- Track email delivery rates and bounces
- Monitor spam complaints and unsubscribes
- Analyze open and click rates over time
- Regularly review automation workflows for effectiveness
- Clean subscriber lists to maintain engagement

## Appendix

### Key Email Marketing Metrics
- Open Rate: Percentage of recipients who open the email
- Click Rate: Percentage of recipients who click links in the email
- Conversion Rate: Percentage of recipients who complete a desired action
- Bounce Rate: Percentage of emails that weren't delivered
- Unsubscribe Rate: Percentage of recipients who opt out
- Complaint Rate: Percentage of recipients who mark as spam

### Email Design Best Practices
- Mobile-first responsive design
- Clear call-to-action buttons
- Optimized images with alt text
- Balanced text-to-image ratio
- Consistent branding and styling
- Accessible design principles 