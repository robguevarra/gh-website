'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Mail, TrendingUp, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: Array<{
    timestamp: string;
    type: string;
    severity: string;
    message: string;
  }>;
}

interface MonitoringConfig {
  emailNotificationThreshold: {
    critical: number;
    high: number;
    medium: number;
  };
  timeWindow: number;
  maxEmailsPerHour: number;
  developerEmails: string[];
  enableRealTimeAlerts: boolean;
}

interface MonitoringData {
  stats: ErrorStats;
  config: MonitoringConfig;
  message: string;
}

export function AuthErrorMonitoringPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [selectedErrorType, setSelectedErrorType] = useState<string>('unknown_error');

  const errorTypes = [
    'login_failure',
    'signup_failure',
    'password_reset_failure',
    'password_update_failure',
    'session_expired',
    'session_invalid',
    'token_invalid',
    'permission_denied',
    'account_locked',
    'rate_limit_exceeded',
    'provider_error',
    'database_error',
    'network_error',
    'validation_error',
    'unknown_error',
  ];

  const loadMonitoringData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/test-error-monitoring');
      const data = await response.json();
      
      if (data.success) {
        setMonitoringData(data);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBuiltInTest = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/test-error-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMode: true }),
      });
      
      const result = await response.json();
      setLastTestResult(result);
      
      // Reload monitoring data to show updated stats
      await loadMonitoringData();
    } catch (error) {
      console.error('Test failed:', error);
      setLastTestResult({ 
        success: false, 
        error: 'Failed to run test',
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSpecificError = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/test-error-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          errorType: selectedErrorType,
          severity: selectedErrorType === 'database_error' ? 'critical' : 'medium'
        }),
      });
      
      const result = await response.json();
      setLastTestResult(result);
      
      // Reload monitoring data to show updated stats
      await loadMonitoringData();
    } catch (error) {
      console.error('Test failed:', error);
      setLastTestResult({ 
        success: false, 
        error: 'Failed to trigger error',
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getErrorTypeColor = (type: string) => {
    if (type.includes('database') || type.includes('provider')) return 'destructive';
    if (type.includes('login') || type.includes('signup')) return 'secondary';
    if (type.includes('session') || type.includes('token')) return 'outline';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Auth Error Monitoring System
          </CardTitle>
          <CardDescription>
            Monitor authentication errors and test email notifications to developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={loadMonitoringData} 
              disabled={isLoading}
              variant="outline"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Load Current Stats
            </Button>
            <Button 
              onClick={runBuiltInTest} 
              disabled={isLoading}
              variant="default"
            >
              <Mail className="h-4 w-4 mr-2" />
              Run Built-in Test
            </Button>
          </div>

          {/* Custom Error Testing */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Test Specific Error Type:</label>
              <Select value={selectedErrorType} onValueChange={setSelectedErrorType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {errorTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={triggerSpecificError} 
              disabled={isLoading}
              variant="secondary"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Trigger Error
            </Button>
          </div>

          {/* Test Results */}
          {lastTestResult && (
            <Alert className={lastTestResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start gap-2">
                {lastTestResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <strong>{lastTestResult.success ? 'Success:' : 'Error:'}</strong> {lastTestResult.message}
                    {lastTestResult.emailSentTo && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Email sent to: {Array.isArray(lastTestResult.emailSentTo) 
                          ? lastTestResult.emailSentTo.join(', ') 
                          : lastTestResult.emailSentTo}
                      </div>
                    )}
                    {lastTestResult.errorType && (
                      <div className="mt-1">
                        <Badge variant={getErrorTypeColor(lastTestResult.errorType)}>
                          {lastTestResult.errorType}
                        </Badge>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Statistics */}
      {monitoringData && (
        <Card>
          <CardHeader>
            <CardTitle>Current Monitoring Statistics</CardTitle>
            <CardDescription>
              Error statistics from the last 60 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{monitoringData.stats.totalErrors}</div>
                <div className="text-sm text-muted-foreground">Total Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{monitoringData.config.maxEmailsPerHour}</div>
                <div className="text-sm text-muted-foreground">Max Emails/Hour</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{monitoringData.config.timeWindow}m</div>
                <div className="text-sm text-muted-foreground">Time Window</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{monitoringData.config.developerEmails.length}</div>
                <div className="text-sm text-muted-foreground">Dev Emails</div>
              </div>
            </div>

            {/* Error Types */}
            {Object.keys(monitoringData.stats.errorsByType).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Errors by Type:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(monitoringData.stats.errorsByType).map(([type, count]) => (
                    <Badge key={type} variant={getErrorTypeColor(type)}>
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Error Severities */}
            {Object.keys(monitoringData.stats.errorsBySeverity).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Errors by Severity:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(monitoringData.stats.errorsBySeverity).map(([severity, count]) => (
                    <Badge key={severity} variant={getSeverityColor(severity)}>
                      {severity}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Email Thresholds */}
            <div>
              <h4 className="font-medium mb-2">Email Notification Thresholds:</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Badge variant="destructive">{monitoringData.config.emailNotificationThreshold.critical}</Badge>
                  <div className="text-sm text-muted-foreground mt-1">Critical</div>
                </div>
                <div className="text-center">
                  <Badge variant="secondary">{monitoringData.config.emailNotificationThreshold.high}</Badge>
                  <div className="text-sm text-muted-foreground mt-1">High</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline">{monitoringData.config.emailNotificationThreshold.medium}</Badge>
                  <div className="text-sm text-muted-foreground mt-1">Medium</div>
                </div>
              </div>
            </div>

            {/* Developer Emails */}
            <div>
              <h4 className="font-medium mb-2">Developer Email Recipients:</h4>
              <div className="text-sm text-muted-foreground">
                {monitoringData.config.developerEmails.join(', ')}
              </div>
            </div>

            {/* Recent Errors */}
            {monitoringData.stats.recentErrors?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Errors:</h4>
                <div className="space-y-2">
                  {monitoringData.stats.recentErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <Badge variant={getErrorTypeColor(error.type)}>
                          {error.type}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 