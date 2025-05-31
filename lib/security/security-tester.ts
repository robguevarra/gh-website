/**
 * Security testing utilities
 * These utilities help test and verify security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger, SecurityLogLevel } from './security-logger';

// Interface for security test result
export interface SecurityTestResult {
  // Name of the test
  name: string;
  // Whether the test passed
  passed: boolean;
  // Details about the test result
  details?: string;
  // Severity of the issue if the test failed
  severity?: 'low' | 'medium' | 'high' | 'critical';
  // Recommendations for fixing the issue
  recommendations?: string[];
}

// Interface for security test suite result
export interface SecurityTestSuiteResult {
  // Name of the test suite
  name: string;
  // Results of individual tests
  results: SecurityTestResult[];
  // Number of tests that passed
  passedCount: number;
  // Number of tests that failed
  failedCount: number;
  // Overall status of the test suite
  status: 'passed' | 'failed';
  // Timestamp of the test run
  timestamp: string;
}

/**
 * Run a security test suite on a request/response pair
 */
export async function runSecurityTests(
  request: NextRequest,
  response: NextResponse
): Promise<SecurityTestSuiteResult> {
  const results: SecurityTestResult[] = [];
  
  // Test 1: Check for security headers
  results.push(testSecurityHeaders(response));
  
  // Test 2: Check for secure cookies
  results.push(testSecureCookies(response));
  
  // Test 3: Check for CSRF tokens
  results.push(testCSRFTokens(request, response));
  
  // Test 4: Check for Content-Type header
  results.push(testContentTypeHeader(response));
  
  // Test 5: Check for X-Content-Type-Options header
  results.push(testXContentTypeOptions(response));
  
  // Calculate overall results
  const passedCount = results.filter(result => result.passed).length;
  const failedCount = results.length - passedCount;
  
  const testSuiteResult: SecurityTestSuiteResult = {
    name: 'Security Headers and Cookies Test Suite',
    results,
    passedCount,
    failedCount,
    status: failedCount === 0 ? 'passed' : 'failed',
    timestamp: new Date().toISOString(),
  };
  
  // Log the test results
  const logLevel = failedCount === 0 
    ? SecurityLogLevel.INFO 
    : SecurityLogLevel.WARN;
  
  securityLogger.log(logLevel, 'security_test_completed', {
    testSuite: testSuiteResult.name,
    passedCount,
    failedCount,
    status: testSuiteResult.status,
  });
  
  return testSuiteResult;
}

/**
 * Test for security headers
 */
function testSecurityHeaders(response: NextResponse): SecurityTestResult {
  const requiredHeaders = [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Frame-Options',
    'Referrer-Policy',
  ];
  
  const missingHeaders = requiredHeaders.filter(
    header => !response.headers.has(header)
  );
  
  const passed = missingHeaders.length === 0;
  
  return {
    name: 'Security Headers Test',
    passed,
    details: passed 
      ? 'All required security headers are present' 
      : `Missing security headers: ${missingHeaders.join(', ')}`,
    severity: passed ? undefined : 'high',
    recommendations: passed ? undefined : [
      'Ensure security headers middleware is applied to all responses',
      'Check that security headers are not being overridden',
    ],
  };
}

/**
 * Test for secure cookies
 */
function testSecureCookies(response: NextResponse): SecurityTestResult {
  // Get all Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie();
  
  // If no cookies are being set, the test passes by default
  if (setCookieHeaders.length === 0) {
    return {
      name: 'Secure Cookies Test',
      passed: true,
      details: 'No cookies are being set',
    };
  }
  
  // Check each cookie for secure attributes
  const insecureCookies = setCookieHeaders.filter(cookie => {
    // In production, cookies should have the Secure flag
    const hasSecureFlag = process.env.NODE_ENV === 'production' 
      ? cookie.includes('Secure;') || cookie.includes('Secure ') 
      : true;
    
    // HttpOnly should be set for sensitive cookies
    const hasHttpOnlyFlag = cookie.includes('HttpOnly;') || cookie.includes('HttpOnly ');
    
    // SameSite should be set
    const hasSameSiteFlag = cookie.includes('SameSite=');
    
    return !(hasSecureFlag && hasHttpOnlyFlag && hasSameSiteFlag);
  });
  
  const passed = insecureCookies.length === 0;
  
  return {
    name: 'Secure Cookies Test',
    passed,
    details: passed 
      ? 'All cookies have appropriate security attributes' 
      : `Found ${insecureCookies.length} cookies with missing security attributes`,
    severity: passed ? undefined : 'high',
    recommendations: passed ? undefined : [
      'Ensure all cookies have the Secure flag in production',
      'Set HttpOnly flag for sensitive cookies',
      'Set SameSite attribute for all cookies',
    ],
  };
}

/**
 * Test for CSRF tokens
 */
function testCSRFTokens(request: NextRequest, response: NextResponse): SecurityTestResult {
  // Check if this is a state-changing request that should have CSRF protection
  const isStateChangingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
  
  // If not a state-changing request, the test passes by default
  if (!isStateChangingMethod) {
    return {
      name: 'CSRF Protection Test',
      passed: true,
      details: 'Not a state-changing request, CSRF protection not required',
    };
  }
  
  // Check for CSRF token in the response headers
  const hasCSRFTokenHeader = response.headers.has('X-CSRF-Token');
  
  // Check for CSRF token cookie
  const setCookieHeaders = response.headers.getSetCookie();
  const hasCSRFTokenCookie = setCookieHeaders.some(cookie => 
    cookie.startsWith('csrf-token=') || cookie.startsWith('__Host-csrf-token=') || cookie.startsWith('__Secure-csrf-token=')
  );
  
  const passed = hasCSRFTokenHeader || hasCSRFTokenCookie;
  
  return {
    name: 'CSRF Protection Test',
    passed,
    details: passed 
      ? 'CSRF protection is in place' 
      : 'No CSRF token found in response for state-changing request',
    severity: passed ? undefined : 'high',
    recommendations: passed ? undefined : [
      'Ensure CSRF middleware is applied to all state-changing routes',
      'Set CSRF tokens in forms and API requests',
    ],
  };
}

/**
 * Test for Content-Type header
 */
function testContentTypeHeader(response: NextResponse): SecurityTestResult {
  const hasContentType = response.headers.has('Content-Type');
  
  return {
    name: 'Content-Type Header Test',
    passed: hasContentType,
    details: hasContentType 
      ? 'Content-Type header is present' 
      : 'Content-Type header is missing',
    severity: hasContentType ? undefined : 'medium',
    recommendations: hasContentType ? undefined : [
      'Set appropriate Content-Type header for all responses',
    ],
  };
}

/**
 * Test for X-Content-Type-Options header
 */
function testXContentTypeOptions(response: NextResponse): SecurityTestResult {
  const hasXContentTypeOptions = response.headers.has('X-Content-Type-Options');
  const value = response.headers.get('X-Content-Type-Options');
  const isCorrectValue = value === 'nosniff';
  
  const passed = hasXContentTypeOptions && isCorrectValue;
  
  return {
    name: 'X-Content-Type-Options Header Test',
    passed,
    details: passed 
      ? 'X-Content-Type-Options header is present with correct value' 
      : hasXContentTypeOptions 
        ? 'X-Content-Type-Options header is present but has incorrect value' 
        : 'X-Content-Type-Options header is missing',
    severity: passed ? undefined : 'medium',
    recommendations: passed ? undefined : [
      'Set X-Content-Type-Options header to "nosniff"',
    ],
  };
}

/**
 * Format security test results as a string
 */
export function formatSecurityTestResults(results: SecurityTestSuiteResult): string {
  let output = `Security Test Results: ${results.name}\n`;
  output += `Timestamp: ${results.timestamp}\n`;
  output += `Status: ${results.status.toUpperCase()}\n`;
  output += `Passed: ${results.passedCount}/${results.passedCount + results.failedCount}\n\n`;
  
  results.results.forEach(result => {
    output += `${result.passed ? '✅' : '❌'} ${result.name}\n`;
    output += `   Details: ${result.details}\n`;
    
    if (!result.passed && result.recommendations) {
      output += '   Recommendations:\n';
      result.recommendations.forEach(recommendation => {
        output += `   - ${recommendation}\n`;
      });
    }
    
    output += '\n';
  });
  
  return output;
}
