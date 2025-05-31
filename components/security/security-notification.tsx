/**
 * Security Notification Component
 * Displays security-related notifications and alerts to users
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, X, Info, AlertCircle } from 'lucide-react';

// Types of security notifications
export enum SecurityNotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

// Interface for security notification
export interface SecurityNotification {
  id: string;
  type: SecurityNotificationType;
  title: string;
  message: string;
  timestamp: Date;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Props for the SecurityNotification component
interface SecurityNotificationProps {
  notification: SecurityNotification;
  onDismiss?: (id: string) => void;
}

/**
 * Security Notification Component
 */
export function SecurityNotificationItem({ notification, onDismiss }: SecurityNotificationProps) {
  // Get the appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case SecurityNotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case SecurityNotificationType.ERROR:
        return <AlertCircle className="h-4 w-4" />;
      case SecurityNotificationType.SUCCESS:
        return <Shield className="h-4 w-4" />;
      case SecurityNotificationType.INFO:
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  // Get the appropriate variant based on notification type
  const getVariant = () => {
    switch (notification.type) {
      case SecurityNotificationType.WARNING:
        return 'warning';
      case SecurityNotificationType.ERROR:
        return 'destructive';
      case SecurityNotificationType.SUCCESS:
        return 'default';
      case SecurityNotificationType.INFO:
      default:
        return 'info';
    }
  };
  
  return (
    <Alert 
      variant={getVariant() as any} 
      className="mb-4 relative"
    >
      {notification.dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center gap-2">
        {getIcon()}
        <AlertTitle className="flex items-center gap-2">
          {notification.title}
          <Badge variant="outline" className="ml-2">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </Badge>
        </AlertTitle>
      </div>
      <AlertDescription className="mt-2">
        {notification.message}
        {notification.action && (
          <Button
            variant="link"
            className="p-0 h-auto ml-2"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Props for the SecurityNotificationList component
interface SecurityNotificationListProps {
  notifications: SecurityNotification[];
  onDismiss?: (id: string) => void;
  maxNotifications?: number;
}

/**
 * Security Notification List Component
 */
export function SecurityNotificationList({ 
  notifications, 
  onDismiss,
  maxNotifications = 3
}: SecurityNotificationListProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<SecurityNotification[]>([]);
  
  // Update visible notifications when the notifications prop changes
  useEffect(() => {
    // Sort notifications by timestamp (newest first) and limit to maxNotifications
    const sorted = [...notifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxNotifications);
    
    setVisibleNotifications(sorted);
  }, [notifications, maxNotifications]);
  
  // If there are no notifications, don't render anything
  if (visibleNotifications.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-3">
      {visibleNotifications.map((notification) => (
        <SecurityNotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
      {notifications.length > maxNotifications && (
        <Button variant="link" className="text-sm">
          View all {notifications.length} notifications
        </Button>
      )}
    </div>
  );
}

// Hook for managing security notifications
export function useSecurityNotifications() {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  
  // Add a new notification
  const addNotification = (notification: Omit<SecurityNotification, 'id' | 'timestamp'>) => {
    const newNotification: SecurityNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
    };
    
    setNotifications((prev) => [...prev, newNotification]);
    return newNotification.id;
  };
  
  // Dismiss a notification by ID
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  // Convenience methods for different notification types
  const addInfoNotification = (title: string, message: string, options?: Partial<SecurityNotification>) => {
    return addNotification({
      type: SecurityNotificationType.INFO,
      title,
      message,
      dismissible: true,
      ...options,
    });
  };
  
  const addWarningNotification = (title: string, message: string, options?: Partial<SecurityNotification>) => {
    return addNotification({
      type: SecurityNotificationType.WARNING,
      title,
      message,
      dismissible: true,
      ...options,
    });
  };
  
  const addErrorNotification = (title: string, message: string, options?: Partial<SecurityNotification>) => {
    return addNotification({
      type: SecurityNotificationType.ERROR,
      title,
      message,
      dismissible: true,
      ...options,
    });
  };
  
  const addSuccessNotification = (title: string, message: string, options?: Partial<SecurityNotification>) => {
    return addNotification({
      type: SecurityNotificationType.SUCCESS,
      title,
      message,
      dismissible: true,
      ...options,
    });
  };
  
  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    addInfoNotification,
    addWarningNotification,
    addErrorNotification,
    addSuccessNotification,
  };
}

// Security notification provider component
interface SecurityNotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

/**
 * Security Notification Provider Component
 * This is a demo component that shows how to use the security notification system
 */
export function SecurityNotificationDemo() {
  const {
    notifications,
    addInfoNotification,
    addWarningNotification,
    addErrorNotification,
    addSuccessNotification,
    dismissNotification,
  } = useSecurityNotifications();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addInfoNotification(
            'Information', 
            'This is an informational security notification.'
          )}
        >
          Add Info
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addWarningNotification(
            'Warning', 
            'This is a warning security notification.'
          )}
        >
          Add Warning
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addErrorNotification(
            'Error', 
            'This is an error security notification.'
          )}
        >
          Add Error
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSuccessNotification(
            'Success', 
            'This is a success security notification.'
          )}
        >
          Add Success
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addWarningNotification(
            'CSRF Token Missing', 
            'A form submission was detected without a CSRF token. This could indicate a potential CSRF attack.',
            {
              action: {
                label: 'Learn More',
                onClick: () => alert('This would link to CSRF documentation'),
              },
            }
          )}
        >
          Add CSRF Warning
        </Button>
      </div>
      
      <SecurityNotificationList
        notifications={notifications}
        onDismiss={dismissNotification}
        maxNotifications={3}
      />
    </div>
  );
}
