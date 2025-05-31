/**
 * Security Notifications API Route
 * Provides endpoints for managing security notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from '@/lib/security/security-logger';
import { createRouteHandlerClient, handleUnauthorized, handleServerError } from '@/lib/supabase/route-handler';
import { v4 as uuidv4 } from 'uuid';

// Define the notification type
interface SecurityNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  actionRequired: boolean;
  actionLink?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

// Mock notifications storage (in a real app, this would be in a database)
let notifications: SecurityNotification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Suspicious Login Attempt',
    message: 'Multiple failed login attempts detected from IP 192.168.1.1',
    source: 'auth-system',
    timestamp: new Date().toISOString(),
    read: false,
    dismissed: false,
    actionRequired: true,
    actionLink: '/admin/security/audit',
    actionText: 'Review Activity',
  },
  {
    id: '2',
    type: 'info',
    title: 'Security Audit Completed',
    message: 'Weekly security audit completed with 2 warnings',
    source: 'security-audit',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    read: true,
    dismissed: false,
    actionRequired: false,
  },
  {
    id: '3',
    type: 'error',
    title: 'Rate Limit Exceeded',
    message: 'API rate limit exceeded for endpoint /api/users',
    source: 'rate-limiter',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    read: false,
    dismissed: false,
    actionRequired: true,
    actionLink: '/admin/security',
    actionText: 'View Details',
  },
];

/**
 * GET handler for retrieving security notifications
 */
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, we would fetch notifications from a database
    // and filter based on user permissions
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to security notifications', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Log the request
    securityLogger.info('Security notifications requested', {
      userId: user.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    // Filter notifications based on query parameters
    let filteredNotifications = [...notifications];
    
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }
    
    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }
    
    // Sort notifications by timestamp (newest first)
    filteredNotifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Return the notifications
    return NextResponse.json(filteredNotifications, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error retrieving security notifications', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to retrieve security notifications', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new security notification
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { type, title, message, source, actionRequired, actionLink, actionText, metadata } = body;
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to create security notification', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Validate required fields
    if (!type || !title || !message || !source) {
      return NextResponse.json(
        { error: 'Missing required fields', requiredFields: ['type', 'title', 'message', 'source'] },
        { status: 400 }
      );
    }
    
    // Create a new notification
    const newNotification: SecurityNotification = {
      id: uuidv4(),
      type: type as 'info' | 'warning' | 'error' | 'success',
      title,
      message,
      source,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
      actionRequired: actionRequired || false,
      actionLink,
      actionText,
      metadata,
    };
    
    // In a real implementation, we would save the notification to a database
    notifications.unshift(newNotification);
    
    // Log the creation
    securityLogger.info('Security notification created', {
      userId: user.id,
      notificationId: newNotification.id,
      type: newNotification.type,
      title: newNotification.title,
    });
    
    // Return the created notification
    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error creating security notification', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to create security notification', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for updating a security notification (mark as read/dismissed)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { id, read, dismissed } = body;
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to update security notification', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required fields', requiredFields: ['id'] },
        { status: 400 }
      );
    }
    
    // Find the notification to update
    const notificationIndex = notifications.findIndex(n => n.id === id);
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Update the notification
    if (read !== undefined) {
      notifications[notificationIndex].read = read;
    }
    
    if (dismissed !== undefined) {
      notifications[notificationIndex].dismissed = dismissed;
    }
    
    // Log the update
    securityLogger.info('Security notification updated', {
      userId: user.id,
      notificationId: id,
      read: notifications[notificationIndex].read,
      dismissed: notifications[notificationIndex].dismissed,
    });
    
    // Return the updated notification
    return NextResponse.json(notifications[notificationIndex], { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error updating security notification', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to update security notification', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a security notification
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get the notification ID from the URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      securityLogger.warn('Unauthorized access attempt to delete security notification', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return handleUnauthorized();
    }
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required fields', requiredFields: ['id'] },
        { status: 400 }
      );
    }
    
    // Find the notification to delete
    const notificationIndex = notifications.findIndex(n => n.id === id);
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Delete the notification
    const deletedNotification = notifications[notificationIndex];
    notifications.splice(notificationIndex, 1);
    
    // Log the deletion
    securityLogger.info('Security notification deleted', {
      userId: user.id,
      notificationId: id,
    });
    
    // Return success
    return NextResponse.json({ success: true, deletedNotification }, { status: 200 });
  } catch (error) {
    // Log the error
    securityLogger.error('Error deleting security notification', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return an error response
    return NextResponse.json(
      { error: 'Failed to delete security notification', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
