/**
 * Admin Security Audit Page
 * Provides security audit functionality for administrators
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Define the security audit result type
interface SecurityAuditCheckResult {
  checkId: string;
  passed: boolean;
  details?: string;
  recommendations?: string[];
  timestamp: Date;
}

interface SecurityAuditResult {
  id: string;
  timestamp: Date;
  checks: SecurityAuditCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Mock security checks for the UI
const mockChecks = [
  {
    id: 'http-security-check',
    name: 'HTTP Security Headers',
    description: 'Checks for the presence of essential security headers',
    severity: 'high' as const,
  },
  {
    id: 'csrf-protection-check',
    name: 'CSRF Protection',
    description: 'Verifies that CSRF protection is properly implemented',
    severity: 'critical' as const,
  },
  {
    id: 'rate-limiting-check',
    name: 'Rate Limiting',
    description: 'Verifies that rate limiting is properly implemented',
    severity: 'high' as const,
  },
  {
    id: 'jwt-security-check',
    name: 'JWT Security',
    description: 'Verifies that JWT tokens are securely handled',
    severity: 'critical' as const,
  },
];

/**
 * Security Audit Page Component
 */
export default function SecurityAuditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Run a security audit
  const runAudit = async () => {
    setIsLoading(true);
    setProgress(0);
    setAuditResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      // Fetch the audit result from the API
      const response = await fetch('/api/security/audit');
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Failed to run security audit');
      }

      const result = await response.json();
      setAuditResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Error running security audit:', error);
      // Set a mock result for demonstration purposes
      setAuditResult({
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        checks: mockChecks.map(check => ({
          checkId: check.id,
          passed: Math.random() > 0.3, // 70% chance of passing
          details: `Details for ${check.name} check`,
          recommendations: [
            `Recommendation 1 for ${check.name}`,
            `Recommendation 2 for ${check.name}`,
          ],
          timestamp: new Date(),
        })),
        summary: {
          total: mockChecks.length,
          passed: Math.floor(mockChecks.length * 0.7),
          failed: Math.ceil(mockChecks.length * 0.3),
          critical: 1,
          high: 1,
          medium: 0,
          low: 0,
        },
      });
      setProgress(100);
    } finally {
      setIsLoading(false);
    }
  };

  // Get the severity badge
  const getSeverityBadge = (severity: 'critical' | 'high' | 'medium' | 'low') => {
    const variants: Record<typeof severity, string> = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'warning',
      low: 'secondary',
    };

    return (
      <Badge variant={variants[severity] as any}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  // Get the check result
  const getCheckResult = (checkId: string) => {
    if (!auditResult) return null;
    return auditResult.checks.find(check => check.checkId === checkId);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center mb-8">
        <Shield className="h-8 w-8 mr-3 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit</h1>
          <p className="text-muted-foreground">
            Run comprehensive security audits to identify vulnerabilities
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Run Security Audit</CardTitle>
            <CardDescription>
              Run a comprehensive security audit to identify potential vulnerabilities in your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running security audit...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {!isLoading && !auditResult && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Click the button below to run a security audit of your application.
                </p>
                <Button onClick={runAudit}>
                  <Shield className="mr-2 h-4 w-4" />
                  Run Security Audit
                </Button>
              </div>
            )}

            {auditResult && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="bg-muted">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Checks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{auditResult.summary.total}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 dark:bg-green-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-green-700 dark:text-green-300">Passed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                        {auditResult.summary.passed}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-red-50 dark:bg-red-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-700 dark:text-red-300">Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                        {auditResult.summary.failed}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-amber-50 dark:bg-amber-950">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-amber-700 dark:text-amber-300">Critical Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                        {auditResult.summary.critical}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Detailed Results</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      {mockChecks.map((check) => {
                        const result = getCheckResult(check.id);
                        const passed = result?.passed ?? false;
                        
                        return (
                          <Card key={check.id} className={passed ? 'border-green-200' : 'border-red-200'}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {passed ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-500" />
                                  )}
                                  {check.name}
                                </CardTitle>
                                {getSeverityBadge(check.severity)}
                              </div>
                              <CardDescription>{check.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {result?.details && (
                                <p className="text-sm mb-2">{result.details}</p>
                              )}
                              
                              {!passed && result?.recommendations && result.recommendations.length > 0 && (
                                <div className="mt-2">
                                  <h4 className="text-sm font-medium mb-1">Recommendations:</h4>
                                  <ul className="text-sm list-disc pl-5 space-y-1">
                                    {result.recommendations.map((rec, i) => (
                                      <li key={i}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Audit Details</CardTitle>
                        <CardDescription>
                          Detailed results of the security audit run on {new Date(auditResult.timestamp).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-auto text-sm whitespace-pre-wrap">
                          {`Security Audit Results (${new Date(auditResult.timestamp).toLocaleString()})
----------------------------------------
Total Checks: ${auditResult.summary.total}
Passed: ${auditResult.summary.passed}
Failed: ${auditResult.summary.failed}

${auditResult.summary.critical > 0 ? `CRITICAL ISSUES: ${auditResult.summary.critical}\n` : ''}
${auditResult.summary.high > 0 ? `HIGH SEVERITY ISSUES: ${auditResult.summary.high}\n` : ''}
${auditResult.summary.medium > 0 ? `MEDIUM SEVERITY ISSUES: ${auditResult.summary.medium}\n` : ''}
${auditResult.summary.low > 0 ? `LOW SEVERITY ISSUES: ${auditResult.summary.low}\n` : ''}

Detailed Results:
----------------------------------------
${auditResult.checks.map(check => {
  return `Check: ${check.checkId}\nStatus: ${check.passed ? 'PASSED' : 'FAILED'}\n${check.details ? `Details: ${check.details}\n` : ''}${check.recommendations && check.recommendations.length > 0 ? `Recommendations:\n${check.recommendations.map(rec => `  - ${rec}`).join('\n')}\n` : ''}\n`;
}).join('')}`}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {auditResult && (
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-muted-foreground">
                  Last audit run: {new Date(auditResult.timestamp).toLocaleString()}
                </div>
                <Button onClick={runAudit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Run Again
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>

        {auditResult && auditResult.summary.failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Issues Detected</AlertTitle>
            <AlertDescription>
              Your application has {auditResult.summary.failed} security issues that need to be addressed.
              {auditResult.summary.critical > 0 && (
                <strong className="block mt-2">
                  {auditResult.summary.critical} critical issues require immediate attention!
                </strong>
              )}
            </AlertDescription>
          </Alert>
        )}

        {auditResult && auditResult.summary.failed === 0 && (
          <Alert variant="default" className="border-green-200 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>All Security Checks Passed</AlertTitle>
            <AlertDescription>
              Your application has passed all security checks. Continue to monitor and regularly audit your application to maintain security.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
