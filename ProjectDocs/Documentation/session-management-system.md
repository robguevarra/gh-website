# Session Management System Documentation

## Overview

The session management system provides robust authentication state control, including role-based access, session timeouts, automatic refreshes, and comprehensive error handling. This system is designed to enhance security, provide a better user experience, and ensure detailed activity logging for auditing and compliance.

## Key Components

### 1. Auth Context

Location: `/context/auth-context.tsx`

The main authentication context handles user authentication state and session management, including comprehensive session activity logging.

#### Features

- **Basic authentication state**: Manages user login/logout and session state
- **Session activity logging**: Tracks login, logout, and token refresh events
- **Error handling**: Provides consistent error handling for auth operations

### 2. Enhanced Auth Context

Location: `/context/enhanced-auth-context.tsx`

The enhanced auth context extends Supabase's basic authentication with additional session management features. It is used specifically in the session management example page.

#### Features

- **Role-based access control**: Stores and manages user roles
- **Session timeout management**: Configurable timeouts with warnings
- **Auto-refresh capability**: Keeps active sessions alive
- **Comprehensive error handling**: Normalized errors with user-friendly messages
- **Security logging**: Tracks all session activities

#### Usage

```tsx
// Wrap components that need authentication
<EnhancedAuthProvider 
  sessionTimeoutSeconds={1800} // 30 minutes
  sessionTimeoutWarningSeconds={300} // 5 minutes warning
>
  <YourComponent />
</EnhancedAuthProvider>

// Access authentication in client components
function ClientComponent() {
  const { 
    user,
    session, 
    roles, 
    hasRole, 
    refreshSession, 
    logout 
  } = useEnhancedAuth();
  
  // Check if user has a specific role
  if (hasRole('admin')) {
    // Show admin features
  }
  
  // Get remaining session time
  const remainingTime = getRemainingSessionTime();
  
  // Manual refresh
  const handleRefresh = () => refreshSession();
  
  // Logout
  const handleLogout = () => logout();
}
```

### 2. Session Manager

Location: `/lib/session/session-manager.ts`

Handles low-level session operations, timeout tracking, and role determination.

#### Key Features

- **Session initialization**: Sets up session with proper role information
- **Timeout tracking**: Monitors session activity and triggers timeouts
- **Session refresh**: Extends session lifetime for active users
- **Role determination**: Maps user metadata to appropriate roles

### 3. Auth Error Handler

Location: `/lib/session/auth-error-handler.ts`

Provides standardized error handling for all authentication-related errors.

#### Features

- **Error normalization**: Converts various error formats to a consistent structure
- **User-friendly messages**: Translates technical errors to understandable messages
- **Recovery steps**: Provides actionable steps for users to resolve issues
- **Error categorization**: Identifies retryable vs. non-retryable errors

#### Usage

```typescript
import { handleAuthError, normalizeAuthError } from '@/lib/session/auth-error-handler';

try {
  // Authentication code
} catch (error) {
  // Handle and normalize the error
  const normalizedError = handleAuthError(error, { 
    context: 'signin',
    // Additional metadata
    email: userEmail
  });
  
  // Access user-friendly information
  console.log(normalizedError.userMessage); // "Your login session has expired"
  console.log(normalizedError.recoverySteps); // "Please sign in again to continue"
}
```

### 4. Session Activity Logger

Location: `/lib/session/session-activity-logger.ts`

Tracks and stores all session-related activities for security auditing and compliance.

#### Activity Types

- `SESSION_LOGIN`: User login events
- `SESSION_LOGOUT`: User logout events
- `SESSION_REFRESH`: Session refresh events
- `SESSION_TIMEOUT_WARNING`: Timeout warning events
- `SESSION_TIMEOUT`: Session timeout events
- `AUTH_ERROR`: Authentication error events

#### Usage

```typescript
import { 
  logSessionActivity, 
  SESSION_ACTIVITY_TYPES 
} from '@/lib/session/session-activity-logger';

// Log a login activity
await logSessionActivity({
  userId: user.id,
  activityType: SESSION_ACTIVITY_TYPES.LOGIN,
  sessionId: session.access_token,
  userAgent: navigator.userAgent,
  metadata: {
    platform: 'web',
    loginMethod: 'email_password'
  }
});
```

## Security Considerations

1. **Session Timeouts**: Configured to automatically log users out after periods of inactivity
2. **Activity Logging**: All authentication events are logged with metadata for auditing
3. **IP Tracking**: User IP addresses are logged with activities for security monitoring
4. **Error Protection**: Authentication errors are handled gracefully with user guidance

## Security Logging

### Overview

The system logs all session-related activities for security auditing and debugging purposes. This includes:

- Login attempts (successful and failed)
- Logout events
- Session timeouts
- Session refreshes
- Authentication errors

### Implementation

The session activity logger is implemented in `/lib/session/session-activity-logger.ts` and interacts with the Supabase `user_activity_log` table.

### Integration

Session activity logging is integrated at multiple levels of the authentication system:

1. **Main Auth Context (`auth-context.tsx`)**: 
   - Logs login attempts when `signIn()` is called
   - Logs logout events when `logout()` is called
   - Logs token refresh events via the auth state change handler
   - Includes comprehensive error handling to ensure logs are created even during failures

2. **Enhanced Auth Context (`enhanced-auth-context.tsx`)**:
   - Used in specialized pages that require advanced session management
   - Provides additional logging for session timeout warnings and timeouts
   - Available for specialized session management features but not required for basic auth

## Database Integration

Session activities are logged to the `user_activity_log` table in Supabase with the following schema:

- `user_id`: The user's ID
- `activity_type`: Type of session activity
- `resource_type`: Always "session" for session activities
- `resource_id`: Optional UUID, not used for sessions
- `metadata`: JSON object with context-specific information
- `ip_address`: User's IP address when available
- `user_agent`: User's browser/device information
- `session_id`: The session identifier

## Best Practices

1. **Use the standard AuthProvider** for basic authentication flows
2. **Use EnhancedAuthProvider only for specialized pages** that require advanced session management features
3. **Use hasRole()** for role-based feature toggling
4. **Implement proper error handling** using the auth error handler
5. **Log security-relevant events** using the session activity logger
6. **Adjust timeout settings** based on security requirements in pages using EnhancedAuthProvider

## Testing

The session management system includes comprehensive tests for:

1. Session timeout behavior
2. Role-based access control
3. Error handling scenarios
4. Activity logging accuracy

## Maintenance and Monitoring

Admin users can monitor session activities through the admin dashboard, which provides:

1. Login/logout patterns
2. Error frequency analysis
3. Session duration metrics
4. Potential security anomalies
