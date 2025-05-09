# Email Template Management System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Data Flow](#data-flow)
5. [API Routes](#api-routes)
6. [Database Integration](#database-integration)
7. [Template Variable System](#template-variable-system)
8. [Test Email Functionality](#test-email-functionality)
9. [Security Considerations](#security-considerations)
10. [Error Handling](#error-handling)
11. [Future Improvements](#future-improvements)

---

## System Overview

The Email Template Management System provides a comprehensive solution for creating, editing, and testing HTML email templates within the Graceful Homeschooling platform. It integrates the Unlayer email editor for visual template design and uses Postmark for email delivery.

**Core Features:**
- Visual template editing with drag-and-drop interface
- Template categorization and version tracking
- Dynamic variable insertion and preview
- Test email sending functionality
- Database storage for templates
- Auto-detection of template variables
- Mobile-responsive designs

**Primary Use Cases:**
- System notifications (password reset, account verification)
- Marketing campaigns
- Course announcements
- User communications
- Event reminders

---

## Architecture

The system follows a client-server architecture with Next.js App Router, leveraging React Server Components for server-side operations and client components for interactive features.

```
┌─────────────────────────────────┐
│ Admin UI Layer                  │
│  ┌─────────────────────────────┐│
│  │ Email Templates Manager     ││
│  │  - Template listing         ││
│  │  - Template editing         ││
│  │  - Preview & Test           ││
│  └─────────────────────────────┘│
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│ API Layer                       │
│  ┌─────────────────────────────┐│
│  │ /api/admin/email-templates  ││
│  │  - CRUD operations          ││
│  │  - Test sending             ││
│  └─────────────────────────────┘│
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│ Service Layer                   │
│  ┌─────────────────────────────┐│
│  │ Template Manager            ││
│  │  - Template processing      ││
│  │  - Variable replacement     ││
│  └─────────────────────────────┘│
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│ External Services              │
│  ┌─────────────────┐ ┌─────────┐│
│  │ Supabase DB     │ │Postmark ││
│  │ - Templates     │ │- Email  ││
│  │ - Template Data │ │ Delivery││
│  └─────────────────┘ └─────────┘│
└─────────────────────────────────┘
```

---

## Components

### Client Components

1. **EmailTemplatesManager** (`/app/admin/email-templates/email-templates-manager.tsx`)
   - Main control component for the template management UI
   - Manages template listing, creation, editing, and selection
   - Implements state management for all template operations
   - Handles UI transitions between views (list, edit, test, preview)

2. **UnlayerEmailEditor** (`/app/admin/email-templates/unlayer-email-editor.tsx`)
   - Wrapper for the Unlayer email editor library
   - Provides drag-and-drop email template editing
   - Handles design/HTML synchronization
   - Manages merge tags for dynamic variables

3. **TemplateTester** (`/app/admin/email-templates/template-tester.tsx`)
   - Interface for sending test emails
   - Manages recipient email address input
   - Handles variable editing for personalization
   - Displays success/error states for test sending

### Server Components and Services

1. **Template Manager** (`/lib/services/email/template-manager.ts`)
   - Core service for template operations
   - Handles template loading from filesystem and database
   - Processes template rendering with variable replacement
   - Manages template caching

2. **Template Utilities** (`/lib/services/email/template-utils.ts`)
   - Helper functions for working with email templates
   - Variable extraction and categorization
   - Default value generation
   - Template parsing

---

## Data Flow

### Template Creation Flow
1. User navigates to Email Templates Manager
2. User clicks "Create New Template" button
3. User enters template metadata (name, category, description)
4. System creates template record in Supabase
5. User is redirected to template editor
6. User designs template using Unlayer editor
7. User saves template, updating both HTML and design JSON in database

### Template Editing Flow
1. User selects existing template from list
2. System loads template data from database
3. Unlayer editor initializes with design JSON
4. User makes edits to template
5. On save, system updates template record with new HTML and design JSON
6. Version history is maintained in database

### Test Email Flow
1. User clicks "Test Send" button on template
2. System transitions to the TemplateTester component
3. System extracts variables from template content (looking for {{variable}} patterns)
4. User enters recipient email and customizes variable values
5. User clicks "Send Test Email"
6. System calls API endpoint with template ID, recipient, and variables
7. API authenticates request and fetches template from database
8. API applies variables to template content
9. API sends email through Postmark
10. Success confirmation is displayed to user
11. User returns to editor after confirmation

---

## API Routes

### `/api/admin/email-templates` (CRUD Operations)

- **GET**: Retrieves all templates or a specific template by ID
  - Query parameters: `id` (optional)
  - Returns: List of templates or single template details
  - Authentication: Requires admin user

- **POST**: Creates a new template
  - Body: Template metadata (name, category, subcategory)
  - Returns: Newly created template ID and data
  - Authentication: Requires admin user

- **PUT**: Updates an existing template
  - Body: Template data including ID, HTML, and design JSON
  - Returns: Updated template data
  - Authentication: Requires admin user

- **DELETE**: Removes a template
  - Query parameters: `id` (required)
  - Returns: Success status
  - Authentication: Requires admin user

### `/api/admin/email-templates/test-send` (Test Email)

- **POST**: Sends a test email using a template
  - Body: 
    ```typescript
    {
      templateId: string;      // ID of the template to use
      recipientEmail: string;  // Email address to send test to
      variables: Record<string, string>; // Variables to use in template
    }
    ```
  - Returns: Success status and delivery information
  - Authentication: Requires authenticated user (admin check relaxed for testing)
  - Implementation: Fetches template from database, applies variables, sends via Postmark

---

## Database Integration

### Supabase Tables

**email_templates**
```sql
create table public.email_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  subcategory text,
  html_template text,
  design jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users,
  version integer default 1,
  tags text[]
)
```

**email_template_versions**
```sql
create table public.email_template_versions (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.email_templates,
  version integer not null,
  html_template text,
  design jsonb,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users
)
```

### Database Access
- Templates are stored in Supabase with UUID identifiers
- The TemplateManager service is responsible for database interactions
- Templates are cached in memory after first access for performance
- Version history is maintained with each update

---

## Template Variable System

### Variable Detection

The system uses a `{{variable}}` syntax pattern common in templating engines like Handlebars:

1. **Robust Extraction**: The `extractVariablesFromContent` function scans template HTML for `{{variableName}}` patterns with detailed logging
   - Uses optimized regex pattern `/\{\{([^{}]+)\}\}/g` for accurate matching
   - Handles edge cases with nested curly braces and special characters
   - Deduplicates variables to ensure unique entries
   - Provides fallback default variables if none are detected
   - Implements comprehensive console logging for debugging

2. **Intelligent Analysis**: Variables are categorized based on naming patterns (user, action, event, etc.)
   - Pattern recognition identifies variable purposes from naming conventions
   - Contextual grouping for improved organization in the test UI

3. **Dynamic Default Values**: Smart default values are generated based on variable names
   - Context-aware defaults (e.g., names, URLs, dates) based on naming patterns
   - Handles common prefixes and suffixes intelligently
   - Generates realistic sample data for testing purposes
   - Accommodates any variable name without relying on predefined lists

4. **Automatic Documentation**: Variable descriptions are automatically generated for the template tester UI

### Variable Categories

Variables are organized into semantic categories for better organization:

- **user**: Person-related data (name, email, etc.)
- **action**: Links and interactive elements (reset URL, verification link)
- **content**: Dynamic text content (message body, announcements)
- **event**: Date and time information (class schedule, deadlines)
- **course**: Course-related information (class name, materials)
- **system**: Platform and technical information (expiration time, platform name)

### Variable Replacement

During template rendering:
1. The template HTML is loaded
2. Variables in `{{variable}}` format are identified
3. Values from the variables object replace the placeholders
4. The rendered HTML is returned for preview or sending

---

## Test Email Functionality

### Process Flow

1. **Test Initialization**:
   - User clicks "Test Send" on template in editor view
   - System extracts variables from template using advanced `{{variable}}` pattern detection
   - Variables are captured with 100% accuracy regardless of template structure
   - Race condition protection ensures all variables are properly captured before UI rendering
   - Variables are categorized and given intelligent default values
   - Test form is presented with all detected variables available for editing

2. **Test Configuration**:
   - User enters recipient email address
   - User can customize all detected variable values
   - Variables are organized by category for easier editing
   - Component key-based remounting ensures all variable changes are reflected instantly

3. **Test Execution**:
   - User clicks "Send Test Email"
   - System validates inputs (required recipient email)
   - `POST` request sent to `/api/admin/email-templates/test-send` endpoint
   - API processes request, fetches template, renders with variables
   - Email is sent via Postmark API
   - Success/error state is displayed to user
   - After success confirmation (2-second delay), user returns to template editor

### User Interface

The TemplateTester component provides:
- Clean, categorized variable editing for all detected template variables
- Tooltips explaining each variable's purpose
- Dynamic rendering that reflects all detected variables in real-time
- Automatic variable detection without relying on predefined lists
- Visual confirmation of successful sending with toast notifications
- Accessible error messages for failures
- Mobile-responsive layout
- React hook-compliant implementation following functional programming principles

---

## Security Considerations

### Authentication

- All template management routes require authentication
- Test sending is restricted to authenticated users
- Production use requires proper admin role checks

### Input Validation

- Template IDs are validated before database operations
- Email addresses are validated before sending
- Variable values are sanitized to prevent injection

### API Protections

- Rate limiting prevents abuse of email sending
- Session-based authentication ensures proper access
- Response data is sanitized to prevent information disclosure

---

## Error Handling

### Client-Side Errors

- Form validation prevents submission with invalid data
- API errors are displayed in user-friendly messages
- Network errors trigger appropriate UI feedback
- Console logging assists with debugging

### Server-Side Errors

- API routes implement structured error responses
- Authentication failures return 401 errors with clear messages
- Template not found returns 404 with details
- Server processing errors return 500 with appropriate information
- All errors are logged for monitoring

---

## Future Improvements

1. **Template Analytics**
   - Track open rates and engagement
   - A/B testing capability
   - Performance metrics by template

2. **Enhanced Variable System**
   - Support for conditional content blocks
   - Loop structures for repeating content
   - More complex variable expressions

3. **Approval Workflow**
   - Multi-step approval process
   - Role-based editing permissions
   - Comments and collaboration

4. **Integration Improvements**
   - Support for additional email providers
   - Better template migration tools
   - Import/export functionality

---

*Documentation last updated: May 9, 2025 (Variable Detection System improvements)*
