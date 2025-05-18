/**
 * Email Template Utilities
 * 
 * Helper functions for working with email templates.
 */

/**
 * Extract variable placeholders from template content
 * Looks for patterns like {{variableName}} and returns an array of unique variable names
 * 
 * @param content HTML content of the template
 * @returns Array of variable names without the {{ }} delimiters
 */
export const extractVariablesFromContent = (content: string): string[] => {
  console.group('🔎 Variable Extraction Process');
  
  if (!content) {
    console.warn('No content provided for variable extraction');
    console.groupEnd();
    return [];
  }
  
  console.log(`Content length: ${content.length} characters`);
  
  // Regular expression to match {{variableName}} pattern
  // This handles nested objects like {{user.firstName}} as a single variable
  const variableRegex = /\{\{([^{}]+)\}\}/g;
  console.log('Using regex pattern:', variableRegex);
  
  // Extract all matches
  const matches = [];
  let match;
  let matchCount = 0;
  
  // Find all variable matches
  while ((match = variableRegex.exec(content)) !== null) {
    matchCount++;
    const fullMatch = match[0]; // The full {{variable}} match
    const variableName = match[1].trim(); // Just the variable name
    
    console.log(`Match #${matchCount}: ${fullMatch} → ${variableName}`);
    matches.push(variableName);
  }
  
  console.log(`Total raw matches found: ${matchCount}`);
  
  // Remove duplicates
  const variables = [...new Set(matches)];
  console.log(`Unique variables after deduplication: ${variables.length}`);
  
  // If no variables found, add some defaults so users can still test
  if (variables.length === 0) {
    console.warn('No variables found in template, adding defaults');
    const defaults = ['firstName', 'email', 'content', 'actionUrl', 'date'];
    console.log('Default variables:', defaults);
    console.groupEnd();
    return defaults;
  }
  
  console.log('Final extracted variables:', variables);
  console.groupEnd();
  return variables;
};

/**
 * Substitutes variable placeholders in a string with their corresponding values.
 * Placeholders are in the format {{variableName}}.
 * 
 * @param content The string content containing variable placeholders.
 * @param values An object mapping variable names to their substitution values.
 * @returns The content string with all recognized placeholders substituted.
 */
export const substituteVariables = (content: string, values: Record<string, string>): string => {
  if (!content) {
    return '';
  }
  let substitutedContent = content;
  for (const key in values) {
    // Ensure a global replacement for each key
    // Regex: {{ key }} or {{key}} (allowing for optional spaces around the key)
    const regex = new RegExp(`\\{\{\\s*${key.trim()}\\s*\\}\}`, 'g');
    substitutedContent = substitutedContent.replace(regex, values[key] || ''); // Default to empty string if value is null/undefined
  }
  return substitutedContent;
};

/**
 * Provides default sample values for a predefined set of standard (snake_case) variables.
 * These are used for populating test/preview modals.
 *
 * @returns Object mapping standard snake_case variable names to default test values.
 */
export const getStandardVariableDefaults = (): Record<string, string> => {
  const defaultValues: Record<string, string> = {
    'first_name': 'Test',
    'last_name': 'User',
    'email': 'rob@gracefulhomeschooling.com',
    // 'full_name' is typically derived, so not included here as a direct value.
    // Add other globally available standard variables here as they are defined.
    // For example:
    // 'current_date': new Date().toLocaleDateString(),
    // 'company_name': 'Graceful Homeschooling',
  };
  
  console.debug('Standard variable defaults requested', { defaultValues });
  return defaultValues;
};

/**
 * Generate appropriate test values for variables based on name patterns
 * @deprecated Prefer getStandardVariableDefaults and guide users to use standard {{snake_case}} variables.
 * @param variables Array of variable names
 * @returns Object mapping variable names to default test values
 */
export const generateDefaultVariableValues = (variables: string[]): Record<string, string> => {
  const defaultValues: Record<string, string> = {};
  
  // Make sure we actually have all the variables detected
  console.warn('Deprecated generateDefaultVariableValues called. Use getStandardVariableDefaults.', { variables });
  
  variables.forEach(variable => {
    const varLower = variable.toLowerCase();
    // User information patterns - attempting to map common variants to snake_case for the key if possible,
    // but primarily for demonstration if non-standard vars are extracted.
    if (varLower.includes('firstname') || varLower.includes('first_name')) {
      defaultValues[variable] = 'Test'; // Keeps original key for this deprecated func
    } 
    else if (varLower.includes('lastname') || varLower.includes('last_name')) {
      defaultValues[variable] = 'User';
    }
    else if (varLower.includes('fullname') || varLower.includes('username') || (varLower.includes('name') && !varLower.includes('company') && !varLower.includes('course'))) {
      defaultValues[variable] = 'Test User';
    }
    else if (varLower.includes('email') || varLower.includes('mail')) {
      defaultValues[variable] = 'rob@gracefulhomeschooling.com';
    }
    // Instructor/teacher patterns
    else if (varLower.includes('instructor') || varLower.includes('teacher')) {
      if (varLower.includes('name')) {
        defaultValues[variable] = 'Emigrace Guevarra';
      } else {
        defaultValues[variable] = `[${variable}]`;
      }
    }
    // Class/course patterns
    else if (varLower.includes('class') || varLower.includes('course')) {
      if (varLower.includes('name')) {
        defaultValues[variable] = 'Sample Course Name';
      }
      else if (varLower.includes('date')) {
        defaultValues[variable] = new Date().toLocaleDateString();
      }
      else if (varLower.includes('time')) {
        defaultValues[variable] = '10:00 AM';
      }
      else if (varLower.includes('url') || varLower.includes('link')) {
        defaultValues[variable] = 'https://gracefulhomeschooling.com/course/sample';
      }
      else if (varLower.includes('duration')) {
        defaultValues[variable] = '60 minutes';
      }
      else {
        defaultValues[variable] = `[Test ${variable}]`;
      }
    }
    // Time-related patterns  
    else if (varLower.includes('date')) {
      defaultValues[variable] = new Date().toLocaleDateString();
    }
    else if (varLower.includes('time')) {
      defaultValues[variable] = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    else if (varLower.includes('duration')) {
      defaultValues[variable] = '60 minutes';
    }
    else if (varLower.includes('timezone')) {
      defaultValues[variable] = 'PHT';
    }
    // URL and link patterns
    else if (varLower.includes('url') || varLower.includes('link')) {
      if (varLower.includes('account')) {
        defaultValues[variable] = 'https://gracefulhomeschooling.com/account';
      }
      else if (varLower.includes('material') || varLower.includes('resource')) {
        defaultValues[variable] = `https://gracefulhomeschooling.com/materials/example-${variable}`;
      }
      else {
        defaultValues[variable] = `https://gracefulhomeschooling.com/${variable.toLowerCase().replace(/(url|link)/i, '')}`;
      }
    }
    // Content/material patterns
    else if (varLower.includes('material') || varLower.includes('resource')) {
      if (varLower.includes('name')) {
        const materialMatch = variable.match(/\d+/);
        const materialNum = materialMatch ? materialMatch[0] : '';
        defaultValues[variable] = `Study Material ${materialNum || '1'}`;
      } else {
        defaultValues[variable] = `[${variable}]`;
      }
    }
    // Token patterns
    else if (varLower.includes('token')) {
      defaultValues[variable] = 'test-token-123456789';
    }
    // All other variables - use semantic placeholder
    else {
      defaultValues[variable] = `[${variable}]`;
    }
  });
  
  console.debug('Deprecated default values generated', { defaultValues });
  return defaultValues;
};

/**
 * Interface for template variable metadata
 */
export interface TemplateVariableInfo {
  value: string;
  category: string;
  description: string;
}

/**
 * Categorize variables based on naming patterns and generate default values
 * 
 * @param variables List of variable names to categorize
 * @returns Object mapping variables to their metadata including value, category, and description
 */
export const categorizeVariables = (variables: string[]): Record<string, TemplateVariableInfo> => {
  const categorized: Record<string, TemplateVariableInfo> = {};
  const defaultValues = generateDefaultVariableValues(variables);
  
  variables.forEach(variable => {
    // Default value for this variable
    const value = defaultValues[variable] || `[${variable}]`;
    
    // Determine category and description based on variable name
    if (variable.match(/email|mail|firstName|lastName|name|phone|address/i)) {
      categorized[variable] = {
        value,
        category: 'user',
        description: `User's ${variable.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      };
    } else if (variable.match(/url|link|button|action/i)) {
      categorized[variable] = {
        value,
        category: 'action',
        description: `URL or action for ${variable.replace(/([A-Z])/g, ' $1').replace(/url|link/i, '').toLowerCase()}`
      };
    } else if (variable.match(/date|time|deadline|expiry|expires/i)) {
      categorized[variable] = {
        value,
        category: 'event',
        description: `Time-related information for ${variable.replace(/([A-Z])/g, ' $1').replace(/date|time/i, '').toLowerCase()}`
      };
    } else if (variable.match(/class|course|program|workshop/i)) {
      categorized[variable] = {
        value,
        category: 'course',
        description: `Course information for ${variable.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      };
    } else if (variable.match(/content|message|body|text/i)) {
      categorized[variable] = {
        value,
        category: 'content',
        description: `Content for ${variable.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      };
    } else {
      categorized[variable] = {
        value,
        category: 'other',
        description: `Value for ${variable.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      };
    }
  });
  
  return categorized;
};
