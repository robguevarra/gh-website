/**
 * Security logger for tracking security-related events
 * This provides a centralized way to log security events
 */

import { NextRequest } from 'next/server';

// Log levels for security events
export enum SecurityLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Interface for security log entry
export interface SecurityLogEntry {
  // Timestamp of the event
  timestamp: string;
  // Log level
  level: SecurityLogLevel;
  // Event type
  eventType: string;
  // User ID if available
  userId?: string;
  // IP address if available
  ipAddress?: string;
  // User agent if available
  userAgent?: string;
  // Request path if available
  path?: string;
  // Request method if available
  method?: string;
  // Additional details
  details?: Record<string, any>;
  // Error if available
  error?: Error | unknown;
}

// Interface for security logger configuration
export interface SecurityLoggerConfig {
  // Whether to enable console logging
  enableConsoleLogging?: boolean;
  // Minimum log level to log
  minLogLevel?: SecurityLogLevel;
  // Whether to include stack traces in error logs
  includeStackTraces?: boolean;
  // Custom log handler
  logHandler?: (entry: SecurityLogEntry) => Promise<void> | void;
}

// Default security logger configuration
const DEFAULT_CONFIG: SecurityLoggerConfig = {
  enableConsoleLogging: true,
  minLogLevel: SecurityLogLevel.INFO,
  includeStackTraces: process.env.NODE_ENV !== 'production',
};

/**
 * Create a security logger with the given configuration
 */
export function createSecurityLogger(config: SecurityLoggerConfig = {}) {
  // Merge default config with provided config
  const mergedConfig: SecurityLoggerConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  // Log a security event
  async function log(
    level: SecurityLogLevel,
    eventType: string,
    details?: Record<string, any>,
    error?: Error | unknown
  ): Promise<void> {
    // Skip if below minimum log level
    if (shouldSkipLog(level, mergedConfig.minLogLevel)) {
      return;
    }
    
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      details,
      error,
    };
    
    // Log to console if enabled
    if (mergedConfig.enableConsoleLogging) {
      logToConsole(entry, mergedConfig.includeStackTraces);
    }
    
    // Call custom log handler if provided
    if (mergedConfig.logHandler) {
      try {
        await mergedConfig.logHandler(entry);
      } catch (handlerError) {
        console.error('Error in security log handler:', handlerError);
      }
    }
  }
  
  // Log a security event with request context
  async function logWithRequest(
    level: SecurityLogLevel,
    eventType: string,
    request: NextRequest,
    details?: Record<string, any>,
    error?: Error | unknown
  ): Promise<void> {
    // Skip if below minimum log level
    if (shouldSkipLog(level, mergedConfig.minLogLevel)) {
      return;
    }
    
    // Extract information from the request
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    const path = request.nextUrl.pathname;
    const method = request.method;
    
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      ipAddress,
      userAgent,
      path,
      method,
      details,
      error,
    };
    
    // Log to console if enabled
    if (mergedConfig.enableConsoleLogging) {
      logToConsole(entry, mergedConfig.includeStackTraces);
    }
    
    // Call custom log handler if provided
    if (mergedConfig.logHandler) {
      try {
        await mergedConfig.logHandler(entry);
      } catch (handlerError) {
        console.error('Error in security log handler:', handlerError);
      }
    }
  }
  
  return {
    // Log methods
    log,
    logWithRequest,
    
    // Convenience methods for different log levels
    info: (eventType: string, details?: Record<string, any>) => 
      log(SecurityLogLevel.INFO, eventType, details),
    
    warn: (eventType: string, details?: Record<string, any>) => 
      log(SecurityLogLevel.WARN, eventType, details),
    
    error: (eventType: string, details?: Record<string, any>, error?: Error | unknown) => 
      log(SecurityLogLevel.ERROR, eventType, details, error),
    
    critical: (eventType: string, details?: Record<string, any>, error?: Error | unknown) => 
      log(SecurityLogLevel.CRITICAL, eventType, details, error),
    
    // Convenience methods with request context
    infoWithRequest: (eventType: string, request: NextRequest, details?: Record<string, any>) => 
      logWithRequest(SecurityLogLevel.INFO, eventType, request, details),
    
    warnWithRequest: (eventType: string, request: NextRequest, details?: Record<string, any>) => 
      logWithRequest(SecurityLogLevel.WARN, eventType, request, details),
    
    errorWithRequest: (eventType: string, request: NextRequest, details?: Record<string, any>, error?: Error | unknown) => 
      logWithRequest(SecurityLogLevel.ERROR, eventType, request, details, error),
    
    criticalWithRequest: (eventType: string, request: NextRequest, details?: Record<string, any>, error?: Error | unknown) => 
      logWithRequest(SecurityLogLevel.CRITICAL, eventType, request, details, error),
  };
}

// Helper function to determine if a log should be skipped based on level
function shouldSkipLog(
  level: SecurityLogLevel,
  minLevel: SecurityLogLevel = SecurityLogLevel.INFO
): boolean {
  const levels = {
    [SecurityLogLevel.INFO]: 0,
    [SecurityLogLevel.WARN]: 1,
    [SecurityLogLevel.ERROR]: 2,
    [SecurityLogLevel.CRITICAL]: 3,
  };
  
  return levels[level] < levels[minLevel];
}

// Helper function to log to console
function logToConsole(entry: SecurityLogEntry, includeStackTraces: boolean = false): void {
  const { level, eventType, userId, ipAddress, path, method, details, error } = entry;
  
  // Format the log message
  const message = [
    `[SECURITY ${level.toUpperCase()}]`,
    eventType,
    userId ? `User: ${userId}` : '',
    ipAddress ? `IP: ${ipAddress}` : '',
    path ? `Path: ${path}` : '',
    method ? `Method: ${method}` : '',
  ].filter(Boolean).join(' | ');
  
  // Choose the appropriate console method
  let consoleMethod: (...args: any[]) => void;
  switch (level) {
    case SecurityLogLevel.INFO:
      consoleMethod = console.info;
      break;
    case SecurityLogLevel.WARN:
      consoleMethod = console.warn;
      break;
    case SecurityLogLevel.ERROR:
    case SecurityLogLevel.CRITICAL:
      consoleMethod = console.error;
      break;
    default:
      consoleMethod = console.log;
  }
  
  // Log the message
  if (details || error) {
    consoleMethod(message, {
      details,
      ...(error && includeStackTraces ? { error } : {}),
    });
  } else {
    consoleMethod(message);
  }
}

// Create a default security logger
export const securityLogger = createSecurityLogger();

// Export convenience functions from the default logger
export const logSecurityInfo = securityLogger.info;
export const logSecurityWarn = securityLogger.warn;
export const logSecurityError = securityLogger.error;
export const logSecurityCritical = securityLogger.critical;
