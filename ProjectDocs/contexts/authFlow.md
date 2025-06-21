# Authentication Flow Context

## Overview
This document outlines the authentication flows implemented in the Graceful Homeschooling platform. The authentication system is built using Supabase Auth and focuses on email/password authentication, with special handling for post-payment account creation.

## Authentication Methods
- **Email/Password Authentication**: Primary authentication method
- ~~**Social Authentication**~~: Removed as per requirements

## Authentication Flows


### Standard Sign In Flow
1. User navigates to `/auth/signin`
2. User enters email and password
3. On successful authentication, user is redirected to the dashboard
4. If authentication fails, appropriate error messages are displayed

### Password Reset Flow
1. User navigates to `/auth/signin` and clicks "Forgot Password"
2. User enters their email address
3. A password reset email is sent with a secure link
4. User clicks the link in the email
5. User is redirected to password reset page
6. User enters a new password
7. On successful password update, user is redirected to dashboard

### Post-Payment Account Setup Flow
1. User completes payment through the payment gateway
2. Payment success page captures user details (email, name, etc.)
3. System automatically:
   - Creates an account with a secure random temporary password
   - Marks the email as confirmed
   - Creates a user profile with payment information
   - Assigns the appropriate membership tier
   - Sends an account setup email
4. User receives an email with a secure setup link
5. User clicks the link and is redirected to `/auth/setup-account`
6. User creates a password for their account
7. On successful setup, user is redirected to the dashboard

## Protected Routes
- All routes under `/dashboard/*` are protected and require authentication
- Unauthenticated users are redirected to the sign-in page
- Authentication status is checked both client-side and server-side

## Technical Implementation

### Authentication Components
- `SignInForm`: Handles user login
- `UpdatePasswordForm`: Handles password reset and account setup
- `ResetPasswordForm`: Handles requesting password reset emails

### Authentication Pages
- `/auth/signin`: User login
- `/auth/reset-password`: Request password reset
- `/auth/setup-account`: Complete account setup after payment

### Backend Utilities
- `createServerSupabaseClient`: Creates a Supabase client for server components
- `createAccountAfterPayment`: Handles account creation after successful payment
- `sendAccountSetupEmail`: Sends account setup links to users

### API Endpoints
- `/api/payment-webhooks/create-account`: Creates user accounts after successful payment

## Security Considerations

### Password Requirements
- Minimum 8 characters
- Mix of uppercase and lowercase letters, numbers, and special characters recommended

### Email Verification
- Email verification is required for standard sign-up
- Accounts created after payment have pre-verified email status

### Authentication Tokens
- Authentication tokens are stored in HTTP-only cookies for security
- Session management follows Supabase's secure practices

### Payment Integration Security
- Payment webhook endpoints include validation to ensure legitimate requests
- Sensitive user information is handled securely according to best practices

## User Experience Guidelines

### Error Handling
- Clear, user-friendly error messages for all authentication issues
- Guided recovery paths for common authentication problems

### Loading States
- All authentication actions show appropriate loading states
- Feedback is provided for long-running operations

### Responsive Design
- All authentication interfaces are fully responsive
- Mobile-first design ensures usability on all devices

## Maintenance Considerations

### Email Template Updates
- Email templates for verification and setup links can be updated through Supabase dashboard
- Custom branding should be applied to all email templates

### Security Audits
- Regular security audits should be conducted on authentication flows
- Password policies should be reviewed periodically

### Analytics
- Authentication success/failure rates should be monitored
- Conversion rates for post-payment account setup should be tracked
