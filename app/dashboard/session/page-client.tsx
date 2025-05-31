'use client';

import React, { useState } from 'react';
import { useEnhancedAuth } from '@/context/enhanced-auth-context';
import { SessionStatusDisplay } from '@/components/auth/session-status-display';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SessionTimeoutAlert } from '@/components/auth/session-timeout-alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import {
  AUTH_ERROR_CODES,
  AuthErrorCode,
  AuthErrorWithMetadata,
  handleAuthError
} from '@/lib/session/auth-error-handler';
import { testActivityLogging } from '@/lib/session/test-logger';

export default function SessionManagementExamplePage() {
  const { refreshSession, logout } = useEnhancedAuth();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [currentTab, setCurrentTab] = useState('session');
  const [lastError, setLastError] = useState<AuthErrorWithMetadata | null>(null);

  // Simulate an error for demonstration purposes
  const simulateError = (errorCode: AuthErrorCode) => {
    try {
      // Create a synthetic error
      const error = new Error(`Simulated error: ${errorCode}`);
      (error as any).code = errorCode;

      // Handle the error through our error handler
      const normalizedError = handleAuthError(error, {
        context: 'demo',
        demo: true
      });

      // Store the error for display
      setLastError(normalizedError);

      // Show toast
      toast.error(normalizedError.userMessage);
    } catch (e) {
      console.error('Error in simulation:', e);
      toast.error('Failed to simulate error');
    }
  };

  // Reset the error state
  const clearError = () => {
    setLastError(null);
    toast.success('Error state cleared');
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Session Management & Error Handling</h1>
        <p className="text-muted-foreground">
          This page demonstrates our enhanced session management and error handling features.
        </p>
      </div>

      <Tabs
        defaultValue="session"
        value={currentTab}
        onValueChange={setCurrentTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">Session Management</TabsTrigger>
          <TabsTrigger value="error">Error Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="space-y-6 mt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Session Management Demo</AlertTitle>
            <AlertDescription>
              View your current session status and test session management features.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <SessionStatusDisplay />

            <Card>
              <CardHeader>
                <CardTitle>Session Controls</CardTitle>
                <CardDescription>
                  Test various session management features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button 
                    onClick={() => setShowTimeoutWarning(true)}
                    className="w-full"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Simulate Session Timeout Warning
                  </Button>
                </div>
                <div>
                  <Button 
                    onClick={async () => {
                      try {
                        const success = await refreshSession();
                        if (success) {
                          toast.success('Session refreshed successfully');
                        } else {
                          toast.error('Failed to refresh session');
                        }
                      } catch (error) {
                        toast.error('Error refreshing session');
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Force Session Refresh
                  </Button>
                </div>
                <div>
                  <Button 
                    onClick={async () => {
                      try {
                        await logout();
                        toast.success('Logged out successfully');
                      } catch (error) {
                        toast.error('Error during logout');
                      }
                    }}
                    variant="destructive"
                    className="w-full"
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Force Logout
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Diagnostic Tools</h3>
                  <Button 
                    onClick={() => {
                      testActivityLogging();
                      toast.info('Running logger diagnostics - check browser console');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    Test Activity Logger
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Session timeout warning dialog */}
          {showTimeoutWarning && (
            <SessionTimeoutAlert
              timeoutMinutes={1}
              onContinue={async () => {
                const result = await refreshSession();
                setShowTimeoutWarning(false);
                return result;
              }}
              onLogout={async () => {
                await logout();
                setShowTimeoutWarning(false);
              }}
              isOpen={showTimeoutWarning}
            />
          )}
        </TabsContent>

        <TabsContent value="error" className="space-y-6 mt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Handling Demo</AlertTitle>
            <AlertDescription>
              Test how our error handling system normalizes and presents authentication errors.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulate Errors</CardTitle>
                <CardDescription>
                  Test how different error types are handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => simulateError(AUTH_ERROR_CODES.INVALID_CREDENTIALS)}
                  className="w-full mb-2"
                >
                  Simulate Invalid Credentials
                </Button>
                <Button 
                  onClick={() => simulateError(AUTH_ERROR_CODES.SESSION_EXPIRED)}
                  className="w-full mb-2"
                >
                  Simulate Session Expired
                </Button>
                <Button 
                  onClick={() => simulateError(AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED)}
                  className="w-full mb-2" 
                  variant="outline"
                >
                  Simulate Rate Limit
                </Button>
                <Button 
                  onClick={() => simulateError(AUTH_ERROR_CODES.NETWORK_ERROR)}
                  className="w-full" 
                  variant="outline"
                >
                  Simulate Network Error
                </Button>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={clearError}
                  variant="ghost" 
                  className="w-full"
                >
                  Clear Error State
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Details</CardTitle>
                <CardDescription>
                  How errors are normalized and presented
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lastError ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-1">Error Code:</p>
                      <Alert variant="destructive" className="py-2">
                        <code>{lastError.code || 'UNKNOWN'}</code>
                      </Alert>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">User Message:</p>
                      <p className="text-sm p-2 bg-muted rounded-md">
                        {lastError.userMessage || 'No user message provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Technical Details:</p>
                      <p className="text-xs text-muted-foreground p-2 bg-muted rounded-md overflow-auto max-h-32">
                        {lastError.message || 'No technical message available'}
                      </p>
                    </div>
                    {lastError.recoverySteps && lastError.recoverySteps.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-1">Recovery Steps:</p>
                        <ul className="list-disc list-inside text-sm pl-2">
                          {lastError.recoverySteps.map((step: string, i: number) => (
                            <li key={i} className="text-sm">{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Info className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      No errors simulated yet. Click one of the error simulation buttons to see 
                      how errors are processed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
