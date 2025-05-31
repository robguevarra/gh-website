/**
 * Security Test API Route
 * This route allows testing of security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  runSecurityTests, 
  formatSecurityTestResults,
  securityLogger,
  SecurityLogLevel,
  setCSRFTokens
} from '@/lib/security';

/**
 * GET handler for security test
 * Tests the security measures on the current request/response
 */
export async function GET(request: NextRequest) {
  try {
    // Create a basic response with security headers
    const response = new NextResponse(
      JSON.stringify({ message: 'Security test successful' }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-XSS-Protection': '1; mode=block',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
        }
      }
    );
    
    // Set CSRF tokens for testing
    await setCSRFTokens(request, response);
    
    // Run security tests
    const testResults = await runSecurityTests(request, response);
    
    // Log the test results
    securityLogger.log(
      testResults.failedCount > 0 ? SecurityLogLevel.WARN : SecurityLogLevel.INFO,
      'security_test_api_called',
      { testResults }
    );
    
    // Format the results
    const formattedResults = formatSecurityTestResults(testResults);
    
    // Return the test results with all the same headers
    return new NextResponse(
      JSON.stringify({ 
        message: 'Security test completed',
        status: testResults.status,
        passedCount: testResults.passedCount,
        failedCount: testResults.failedCount,
        results: testResults.results,
        formattedResults 
      }),
      { 
        status: 200,
        headers: response.headers 
      }
    );
  } catch (error) {
    // Log the error
    securityLogger.errorWithRequest(
      'security_test_error',
      request,
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Return an error response
    return new NextResponse(
      JSON.stringify({ 
        message: 'Error running security tests',
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}

/**
 * POST handler for security test
 * Tests the security measures on the current request/response
 * This is useful for testing CSRF protection
 */
export async function POST(request: NextRequest) {
  try {
    // Create a basic response with security headers
    const response = new NextResponse(
      JSON.stringify({ message: 'Security POST test successful' }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-XSS-Protection': '1; mode=block',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
        }
      }
    );
    
    // Run security tests
    const testResults = await runSecurityTests(request, response);
    
    // Log the test results
    securityLogger.log(
      testResults.failedCount > 0 ? SecurityLogLevel.WARN : SecurityLogLevel.INFO,
      'security_test_post_api_called',
      { testResults }
    );
    
    // Format the results
    const formattedResults = formatSecurityTestResults(testResults);
    
    // Return the test results with all the same headers
    return new NextResponse(
      JSON.stringify({ 
        message: 'Security POST test completed',
        status: testResults.status,
        passedCount: testResults.passedCount,
        failedCount: testResults.failedCount,
        results: testResults.results,
        formattedResults 
      }),
      { 
        status: 200,
        headers: response.headers 
      }
    );
  } catch (error) {
    // Log the error
    securityLogger.errorWithRequest(
      'security_test_post_error',
      request,
      {},
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Return an error response
    return new NextResponse(
      JSON.stringify({ 
        message: 'Error running security POST tests',
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json'
        } 
      }
    );
  }
}
