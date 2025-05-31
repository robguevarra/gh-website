/**
 * Security Status Component
 * Displays security-related information and status
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw } from 'lucide-react';

// Interface for security test result
interface SecurityTestResult {
  name: string;
  passed: boolean;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recommendations?: string[];
}

// Interface for security test suite result
interface SecurityTestSuiteResult {
  name: string;
  results: SecurityTestResult[];
  passedCount: number;
  failedCount: number;
  status: 'passed' | 'failed';
  timestamp: string;
  formattedResults?: string;
}

/**
 * Security Status Component
 */
export function SecurityStatus() {
  const [testResults, setTestResults] = useState<SecurityTestSuiteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to run security tests
  const runSecurityTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/test');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Run tests on component mount
  useEffect(() => {
    runSecurityTests();
  }, []);
  
  // Function to get badge color based on severity
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5" /> Security Status
            </CardTitle>
            <CardDescription>
              Security test results and recommendations
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runSecurityTests}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {testResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last Test: {new Date(testResults.timestamp).toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <Badge 
                    variant={testResults.status === 'passed' ? 'default' : 'destructive'}
                    className="mr-2"
                  >
                    {testResults.status === 'passed' ? 'PASSED' : 'FAILED'}
                  </Badge>
                  <span className="text-sm">
                    {testResults.passedCount} of {testResults.passedCount + testResults.failedCount} tests passed
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {testResults.results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-md ${result.passed ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}
                >
                  <div className="flex items-start">
                    <div className="mr-2 mt-0.5">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{result.name}</h4>
                        {!result.passed && result.severity && (
                          <Badge className={getSeverityColor(result.severity)}>
                            {result.severity.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">{result.details}</p>
                      
                      {!result.passed && result.recommendations && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Recommendations:</p>
                          <ul className="list-disc list-inside text-sm pl-2 mt-1 space-y-1">
                            {result.recommendations.map((rec, recIndex) => (
                              <li key={recIndex}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!testResults && !error && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No test results available</p>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Running security tests...</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500">
          Security tests check for proper implementation of security headers, CSRF protection, secure cookies, and more.
        </p>
      </CardFooter>
    </Card>
  );
}

/**
 * Admin Security Dashboard Component
 * More comprehensive version for admin users
 */
export function AdminSecurityDashboard() {
  const [testResults, setTestResults] = useState<SecurityTestSuiteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfTestResult, setCsrfTestResult] = useState<any | null>(null);
  const [csrfTestLoading, setCsrfTestLoading] = useState(false);
  const [csrfTestError, setCsrfTestError] = useState<string | null>(null);
  
  // Function to run security tests
  const runSecurityTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/test');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test CSRF protection
  const testCsrfProtection = async () => {
    setCsrfTestLoading(true);
    setCsrfTestError(null);
    
    try {
      // First get a CSRF token
      const getResponse = await fetch('/api/security/test');
      
      if (!getResponse.ok) {
        throw new Error(`Error getting CSRF token: ${getResponse.status} ${getResponse.statusText}`);
      }
      
      // Get the CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token=') || row.startsWith('__Host-csrf-token=') || row.startsWith('__Secure-csrf-token='))
        ?.split('=')[1];
      
      // Now make a POST request with the CSRF token
      const postResponse = await fetch('/api/security/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ test: 'csrf-test' }),
      });
      
      if (!postResponse.ok) {
        throw new Error(`Error testing CSRF protection: ${postResponse.status} ${postResponse.statusText}`);
      }
      
      const data = await postResponse.json();
      setCsrfTestResult(data);
    } catch (err) {
      setCsrfTestError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setCsrfTestLoading(false);
    }
  };
  
  // Run tests on component mount
  useEffect(() => {
    runSecurityTests();
  }, []);
  
  return (
    <div className="space-y-6">
      <SecurityStatus />
      
      <Card className="w-full shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">CSRF Protection Test</CardTitle>
              <CardDescription>
                Test Cross-Site Request Forgery (CSRF) protection
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testCsrfProtection}
              disabled={csrfTestLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${csrfTestLoading ? 'animate-spin' : ''}`} />
              {csrfTestLoading ? 'Testing...' : 'Test CSRF Protection'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {csrfTestError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{csrfTestError}</AlertDescription>
            </Alert>
          )}
          
          {csrfTestResult && (
            <div className="space-y-4">
              <Alert variant={csrfTestResult.status === 'passed' ? 'default' : 'destructive'}>
                <div className="flex items-center gap-2">
                  {csrfTestResult.status === 'passed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    CSRF Test {csrfTestResult.status === 'passed' ? 'Passed' : 'Failed'}
                  </AlertTitle>
                </div>
                <AlertDescription>
                  {csrfTestResult.message}
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Test Details</h4>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(csrfTestResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {!csrfTestResult && !csrfTestError && !csrfTestLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">Click the button to test CSRF protection</p>
            </div>
          )}
          
          {csrfTestLoading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Testing CSRF protection...</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500">
            CSRF protection prevents attackers from making unauthorized requests on behalf of authenticated users.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
