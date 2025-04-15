/**
 * Utility functions for the student dashboard store
 */

/**
 * Deep equality check for objects
 * 
 * @param a First object to compare
 * @param b Second object to compare
 * @returns True if objects are deeply equal, false otherwise
 */
export function isEqual(a: any, b: any): boolean {
  // Handle primitive types
  if (a === b) return true;
  
  // Handle null/undefined
  if (a == null || b == null) return a === b;
  
  // Handle different types
  if (typeof a !== typeof b) return false;
  
  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    
    return true;
  }
  
  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Create a set function with equality checking
 * 
 * @param set Original set function
 * @param getState Function to get the current state
 * @returns New set function with equality checking
 */
export function createSetWithEqualityCheck(set: Function, getState: () => any) {
  return (state: any) => {
    // If state is a function, call it with the current state
    if (typeof state === 'function') {
      return set(state);
    }
    
    // If state is an object, check each key for equality
    if (typeof state === 'object' && state !== null) {
      // Get current state
      const currentState = getState();
      
      // Check if any values are different
      const hasChanges = Object.keys(state).some(key => {
        return !isEqual(currentState[key], state[key]);
      });
      
      // Only update if there are changes
      if (hasChanges) {
        // Log changed keys in development mode
        if (process.env.NODE_ENV === 'development') {
          const changedKeys = Object.keys(state).filter(key => {
            return !isEqual(currentState[key], state[key]);
          });
          console.log('State Update with changes:', changedKeys);
        }
        
        return set(state);
      } else {
        // Log skipped update in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('State Update skipped (no changes)');
        }
        
        return currentState;
      }
    }
    
    // For other types, just call the original set function
    return set(state);
  };
}
