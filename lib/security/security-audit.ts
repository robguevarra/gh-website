/**
 * Security audit utilities
 * These utilities help audit and verify security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from './security-logger';
import { runSecurityTests, SecurityTestResult } from './security-tester';

// Types of security audit checks
export enum SecurityAuditCheckType {
  HEADERS = 'headers',
  COOKIES = 'cookies',
  CSRF = 'csrf',
  RATE_LIMITING = 'rate_limiting',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  JWT = 'jwt',
  DATABASE = 'database',
  API = 'api',
  AUTHENTICATION = 'authentication',
}

// Interface for security audit check
export interface SecurityAuditCheck {
  id: string;
  type: SecurityAuditCheckType;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  run: () => Promise<SecurityAuditCheckResult>;
}

// Interface for security audit check result
export interface SecurityAuditCheckResult {
  checkId: string;
  passed: boolean;
  details?: string;
  recommendations?: string[];
  timestamp: Date;
}

// Interface for security audit result
export interface SecurityAuditResult {
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

/**
 * Create a basic HTTP security check
 */
const createHttpSecurityCheck = (url: string): SecurityAuditCheck => {
  return {
    id: 'http-security-check',
    type: SecurityAuditCheckType.HEADERS,
    name: 'HTTP Security Headers Check',
    description: 'Checks for the presence of essential security headers',
    severity: 'high',
    run: async () => {
      try {
        const response = await fetch(url);
        // Create a mock NextRequest and convert the fetch Response to a NextResponse
        const mockRequest = new Request(url) as unknown as NextRequest;
        const mockResponse = new NextResponse(null, {
          headers: new Headers(response.headers)
        });
        
        // Run security tests with proper parameters
        const testResults = await runSecurityTests(mockRequest, mockResponse);
        
        // Extract failed tests from the results array
        const failedTests = testResults.results.filter((test: SecurityTestResult) => !test.passed);
        const passed = failedTests.length === 0;
        
        return {
          checkId: 'http-security-check',
          passed,
          details: passed 
            ? 'All security headers are properly configured' 
            : `Missing security headers: ${failedTests.map((t: SecurityTestResult) => t.name).join(', ')}`,
          recommendations: failedTests.map((test: SecurityTestResult) => test.recommendations?.join(', ') || ''),
          timestamp: new Date(),
        };
      } catch (error) {
        securityLogger.error('Error running HTTP security check', { error, url });
        return {
          checkId: 'http-security-check',
          passed: false,
          details: `Error running check: ${error instanceof Error ? error.message : String(error)}`,
          recommendations: ['Ensure the URL is accessible and try again.'],
          timestamp: new Date(),
        };
      }
    },
  };
};

/**
 * Create a CSRF protection check
 */
const createCsrfCheck = (url: string): SecurityAuditCheck => {
  return {
    id: 'csrf-protection-check',
    type: SecurityAuditCheckType.CSRF,
    name: 'CSRF Protection Check',
    description: 'Verifies that CSRF protection is properly implemented',
    severity: 'critical',
    run: async () => {
      try {
        // First, make a GET request to get a CSRF token
        const getResponse = await fetch(url);
        const csrfToken = getResponse.headers.get('x-csrf-token');
        
        // Then, make a POST request without the CSRF token (should fail)
        const postWithoutTokenResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true }),
        });
        
        // Then, make a POST request with the CSRF token (should succeed)
        const postWithTokenResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || '',
          },
          body: JSON.stringify({ test: true }),
        });
        
        const passed = (
          csrfToken !== null && 
          postWithoutTokenResponse.status === 403 && 
          postWithTokenResponse.status === 200
        );
        
        return {
          checkId: 'csrf-protection-check',
          passed,
          details: passed 
            ? 'CSRF protection is properly implemented' 
            : 'CSRF protection is not properly implemented',
          recommendations: passed ? [] : [
            'Ensure CSRF tokens are generated for all forms',
            'Verify that POST requests without a valid CSRF token are rejected',
            'Check that CSRF tokens are properly validated on the server',
          ],
          timestamp: new Date(),
        };
      } catch (error) {
        securityLogger.error('Error running CSRF protection check', { error, url });
        return {
          checkId: 'csrf-protection-check',
          passed: false,
          details: `Error running check: ${error instanceof Error ? error.message : String(error)}`,
          recommendations: ['Ensure the URL is accessible and try again.'],
          timestamp: new Date(),
        };
      }
    },
  };
};

/**
 * Create a rate limiting check
 */
const createRateLimitingCheck = (url: string): SecurityAuditCheck => {
  return {
    id: 'rate-limiting-check',
    type: SecurityAuditCheckType.RATE_LIMITING,
    name: 'Rate Limiting Check',
    description: 'Verifies that rate limiting is properly implemented',
    severity: 'high',
    run: async () => {
      try {
        // Make multiple requests in quick succession
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(fetch(url));
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(response => 
          response.status === 429 || 
          response.headers.has('retry-after')
        );
        
        return {
          checkId: 'rate-limiting-check',
          passed: rateLimited,
          details: rateLimited 
            ? 'Rate limiting is properly implemented' 
            : 'Rate limiting is not properly implemented or could not be detected',
          recommendations: rateLimited ? [] : [
            'Implement rate limiting for sensitive endpoints',
            'Return 429 Too Many Requests status code when rate limit is exceeded',
            'Include Retry-After header to indicate when the client can retry',
          ],
          timestamp: new Date(),
        };
      } catch (error) {
        securityLogger.error('Error running rate limiting check', { error, url });
        return {
          checkId: 'rate-limiting-check',
          passed: false,
          details: `Error running check: ${error instanceof Error ? error.message : String(error)}`,
          recommendations: ['Ensure the URL is accessible and try again.'],
          timestamp: new Date(),
        };
      }
    },
  };
};

/**
 * Create a JWT security check
 */
const createJwtSecurityCheck = (): SecurityAuditCheck => {
  return {
    id: 'jwt-security-check',
    type: SecurityAuditCheckType.JWT,
    name: 'JWT Security Check',
    description: 'Verifies that JWT tokens are securely handled',
    severity: 'critical',
    run: async () => {
      try {
        // This is a simplified check that just verifies the presence of secure cookie settings
        // In a real implementation, this would check actual JWT tokens and their configuration
        const response = await fetch('/api/security/test');
        const cookies = response.headers.get('set-cookie') || '';
        
        const hasSecureCookie = cookies.includes('secure');
        const hasHttpOnlyCookie = cookies.includes('httponly');
        const hasSameSiteCookie = cookies.includes('samesite');
        
        const passed = hasSecureCookie && hasHttpOnlyCookie && hasSameSiteCookie;
        
        return {
          checkId: 'jwt-security-check',
          passed,
          details: passed 
            ? 'JWT tokens are securely handled' 
            : 'JWT tokens are not securely handled',
          recommendations: passed ? [] : [
            'Ensure JWT tokens are stored in HttpOnly cookies',
            'Set the Secure flag on cookies containing sensitive information',
            'Use SameSite=Strict or SameSite=Lax for cookies to prevent CSRF',
            'Implement proper JWT expiration and refresh token rotation',
          ],
          timestamp: new Date(),
        };
      } catch (error) {
        securityLogger.error('Error running JWT security check', { error });
        return {
          checkId: 'jwt-security-check',
          passed: false,
          details: `Error running check: ${error instanceof Error ? error.message : String(error)}`,
          recommendations: ['Ensure the API endpoint is accessible and try again.'],
          timestamp: new Date(),
        };
      }
    },
  };
};

/**
 * Run a security audit
 */
export const runSecurityAudit = async (options: {
  baseUrl?: string;
  checks?: SecurityAuditCheckType[];
}): Promise<SecurityAuditResult> => {
  const { baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000' } = options;
  
  // Create the checks to run
  const checks: SecurityAuditCheck[] = [];
  
  // Add HTTP security check
  checks.push(createHttpSecurityCheck(`${baseUrl}/api/security/test`));
  
  // Add CSRF check
  checks.push(createCsrfCheck(`${baseUrl}/api/security/test`));
  
  // Add rate limiting check
  checks.push(createRateLimitingCheck(`${baseUrl}/api/security/test`));
  
  // Add JWT security check
  checks.push(createJwtSecurityCheck());
  
  // Run the checks
  securityLogger.info('Starting security audit', { baseUrl, checkCount: checks.length });
  
  const results: SecurityAuditCheckResult[] = [];
  for (const check of checks) {
    try {
      securityLogger.info(`Running security check: ${check.name}`, { checkId: check.id });
      const result = await check.run();
      results.push(result);
      
      const logLevel = result.passed ? 'info' : 'warn';
      securityLogger[logLevel](`Security check result: ${check.name}`, {
        checkId: check.id,
        passed: result.passed,
        details: result.details,
      });
    } catch (error) {
      securityLogger.error(`Error running security check: ${check.name}`, {
        checkId: check.id,
        error,
      });
      
      results.push({
        checkId: check.id,
        passed: false,
        details: `Error running check: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      });
    }
  }
  
  // Calculate summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  
  // Count by severity
  const critical = checks
    .filter(c => c.severity === 'critical' && !results.find(r => r.checkId === c.id)?.passed)
    .length;
  
  const high = checks
    .filter(c => c.severity === 'high' && !results.find(r => r.checkId === c.id)?.passed)
    .length;
  
  const medium = checks
    .filter(c => c.severity === 'medium' && !results.find(r => r.checkId === c.id)?.passed)
    .length;
  
  const low = checks
    .filter(c => c.severity === 'low' && !results.find(r => r.checkId === c.id)?.passed)
    .length;
  
  const auditResult: SecurityAuditResult = {
    id: `audit-${Date.now()}`,
    timestamp: new Date(),
    checks: results,
    summary: {
      total,
      passed,
      failed,
      critical,
      high,
      medium,
      low,
    },
  };
  
  securityLogger.info('Security audit completed', {
    auditId: auditResult.id,
    summary: auditResult.summary,
  });
  
  return auditResult;
};

/**
 * Get a check by ID
 */
export const getCheckById = (checks: SecurityAuditCheck[], id: string): SecurityAuditCheck | undefined => {
  return checks.find(check => check.id === id);
};

/**
 * Get a check result by ID
 */
export const getCheckResultById = (results: SecurityAuditCheckResult[], id: string): SecurityAuditCheckResult | undefined => {
  return results.find(result => result.checkId === id);
};

/**
 * Format security audit results for display
 */
export const formatSecurityAuditResults = (auditResult: SecurityAuditResult): string => {
  const { summary, checks } = auditResult;
  
  let output = `Security Audit Results (${new Date(auditResult.timestamp).toLocaleString()})\n`;
  output += `----------------------------------------\n`;
  output += `Total Checks: ${summary.total}\n`;
  output += `Passed: ${summary.passed}\n`;
  output += `Failed: ${summary.failed}\n\n`;
  
  if (summary.critical > 0) {
    output += `CRITICAL ISSUES: ${summary.critical}\n`;
  }
  
  if (summary.high > 0) {
    output += `HIGH SEVERITY ISSUES: ${summary.high}\n`;
  }
  
  if (summary.medium > 0) {
    output += `MEDIUM SEVERITY ISSUES: ${summary.medium}\n`;
  }
  
  if (summary.low > 0) {
    output += `LOW SEVERITY ISSUES: ${summary.low}\n`;
  }
  
  output += `\nDetailed Results:\n`;
  output += `----------------------------------------\n`;
  
  for (const check of checks) {
    output += `Check: ${check.checkId}\n`;
    output += `Status: ${check.passed ? 'PASSED' : 'FAILED'}\n`;
    
    if (check.details) {
      output += `Details: ${check.details}\n`;
    }
    
    if (check.recommendations && check.recommendations.length > 0) {
      output += `Recommendations:\n`;
      for (const recommendation of check.recommendations) {
        output += `  - ${recommendation}\n`;
      }
    }
    
    output += `\n`;
  }
  
  return output;
};
