/**
 * Email Template Utilities
 * 
 * Helper functions for working with email templates.
 */

/**
 * Defines the structure for an email variable descriptor.
 */
export interface EmailVariable {
  name: string; // e.g., 'First Name' (for display in modal)
  placeholder: string; // e.g., '{{first_name}}' (for copying and substitution)
  description: string; // e.g., "The recipient's first name."
  sampleValue: string; // e.g., 'Alex'
  category: 'Recipient Details' | 'Company & Legal' | 'Utility Links'; // Simplified categories
  dataKey?: string; // How the backend will identify this data point for substitution
  notes?: string; // Internal notes on sourcing or generation
}

/**
 * The definitive list of all available email variables for use in campaigns.
 */
export const ALL_EMAIL_VARIABLES: EmailVariable[] = [
  // Recipient Details
  { 
    name: 'First Name', 
    placeholder: '{{first_name}}', 
    description: "The recipient's first name.", 
    sampleValue: 'Rob', 
    category: 'Recipient Details', 
    dataKey: 'first_name', 
    notes: 'Source: unified_profiles.first_name' 
  },
  { 
    name: 'Last Name', 
    placeholder: '{{last_name}}', 
    description: "The recipient's last name.", 
    sampleValue: 'Guevarra', 
    category: 'Recipient Details', 
    dataKey: 'last_name', 
    notes: 'Source: unified_profiles.last_name' 
  },
  { 
    name: 'Full Name', 
    placeholder: '{{full_name}}', 
    description: "The recipient's full name.", 
    sampleValue: 'Rob Guevarra', 
    category: 'Recipient Details', 
    dataKey: 'full_name', 
    notes: 'Constructed: unified_profiles.first_name + unified_profiles.last_name' 
  },
  { 
    name: 'Email Address', 
    placeholder: '{{email_address}}', 
    description: "The recipient's email address.", 
    sampleValue: 'robneil@gmail.com', 
    category: 'Recipient Details', 
    dataKey: 'email_address', 
    notes: 'Source: unified_profiles.email' 
  },

  // Company & Legal
  { 
    name: 'Company Name', 
    placeholder: '{{company_name}}', 
    description: 'Your company name.', 
    sampleValue: 'Graceful Homeschooling', 
    category: 'Company & Legal', 
    dataKey: 'company_name', 
    notes: "Hardcoded" 
  },
  { 
    name: 'Company Address', 
    placeholder: '{{company_address}}', 
    description: 'Your company\'s physical address.', 
    sampleValue: 'Malolos, Bulacan, 3000 PH', 
    category: 'Company & Legal', 
    dataKey: 'company_address', 
    notes: "Hardcoded" 
  },
  { 
    name: 'Current Year', 
    placeholder: '{{current_year}}', 
    description: 'The current calendar year.', 
    sampleValue: new Date().getFullYear().toString(), 
    category: 'Company & Legal', 
    dataKey: 'current_year', 
    notes: 'Generated dynamically' 
  },

  // Utility Links
  { 
    name: 'Login URL', 
    placeholder: '{{login_url}}', 
    description: 'A link to your website\'s login page.', 
    sampleValue: 'https://new.gracefulhomeschooling.com/auth/signin', 
    category: 'Utility Links', 
    dataKey: 'login_url', 
    notes: "Static URL" 
  },
  { 
    name: 'Unsubscribe Link (Postmark Tag)', 
    placeholder: '{{{pm:unsubscribe}}}', 
    description: 'Postmark\'s unsubscribe tag. Insert this directly into your email HTML where you want the unsubscribe link to appear.', 
    sampleValue: '{{{pm:unsubscribe}}}',
    category: 'Utility Links', 
    notes: "This is a Postmark-specific tag, not a variable substituted by our system. The user inserts it directly into the template." 
  },
];

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
 * Returns an object with sample data for all defined email variables
 * that are substituted by our system.
 * Useful for previews and test sends.
 * This new version is driven by ALL_EMAIL_VARIABLES.
 */
export function getStandardVariableDefaults(): Record<string, any> {
  const defaults: Record<string, any> = {};
  ALL_EMAIL_VARIABLES.forEach(variable => {
    if (variable.dataKey) { // Only include variables our system actively substitutes
      defaults[variable.dataKey] = variable.sampleValue;
    }
  });
  // console.debug('New getStandardVariableDefaults called, providing:', defaults);
  return defaults;
}

/**
 * Substitutes placeholders in a string with values from a data object.
 * Placeholders are expected in the format {{key}}.
 * This new version handles 'any' for values and converts to string for substitution.
 * 
 * @param content The string content with placeholders.
 * @param values An object where keys match placeholder keys (without curlies)
 *               and values are the data to insert.
 * @returns The content string with placeholders replaced.
 */
export function substituteVariables(content: string, values: Record<string, any>): string {
  if (!content) return '';
  let processedContent = content;
  for (const key in values) {
    // Regex to match {{key}} globally.
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processedContent = processedContent.replace(regex, () => {
      const value = values[key];
      return value !== undefined && value !== null ? String(value) : ''; 
    });
  }
  return processedContent;
}

/**
 * Generate appropriate test values for variables based on name patterns
 * @deprecated Prefer getStandardVariableDefaults and guide users to use standard {{snake_case}} variables.
 * @param variables Array of variable names
 * @returns Object mapping variable names to default test values
 */
export const generateDefaultVariableValues = (variables: string[]): Record<string, string> => {
  const defaultValues: Record<string, string> = {};
  
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

// Example Usage (can be removed or kept for testing):
// const sampleHtml = "Hello {{first_name}}, welcome to {{company_name}}. Unsubscribe here: {{{pm:unsubscribe}}} and also {{last_name}}.";
// const sampleData = { ...getStandardVariableDefaults(), first_name: 'Bob', last_name: 'Marley' };
// console.log("Sample Defaults:", getStandardVariableDefaults());
// console.log("Substituted:", substituteVariables(sampleHtml, sampleData));
// console.log("Extracted:", extractVariablesFromContent(sampleHtml));
