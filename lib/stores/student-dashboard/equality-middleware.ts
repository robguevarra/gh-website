import { StateCreator } from 'zustand';
import { isEqual } from './utils';

/**
 * Middleware for preventing unnecessary state updates
 * 
 * This middleware checks if the new state is different from the current state
 * before applying the update. This prevents unnecessary re-renders when
 * setting state to the same values.
 * 
 * @example
 * ```ts
 * // In your store definition
 * import { equalityMiddleware } from './equality-middleware';
 * 
 * const useStudentDashboardStore = create<StudentDashboardState>()(
 *   equalityMiddleware(
 *     (set) => ({
 *       // state and actions
 *     })
 *   )
 * );
 * ```
 */
export const equalityMiddleware = <T extends object>(
  config: StateCreator<T>
): StateCreator<T> => (set, get, api) => {
  // Create a set function with equality checking
  const setWithEqualityCheck = (state: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => {
    // If state is a function, call it with the current state
    if (typeof state === 'function') {
      const currentState = get();
      const newState = state(currentState);
      
      // Check if the new state is different from the current state
      if (replace) {
        // For replace, we need to check the entire state
        if (!isEqual(currentState, newState)) {
          return set(newState as T, true);
        }
      } else {
        // For partial updates, we need to check each key
        const hasChanges = Object.keys(newState).some(key => {
          return !isEqual(currentState[key as keyof T], newState[key as keyof T]);
        });
        
        if (hasChanges) {
          return set(newState, false);
        }
      }
      
      // If no changes, return the current state
      return currentState;
    }
    
    // If state is an object, check each key for equality
    if (typeof state === 'object' && state !== null) {
      const currentState = get();
      
      if (replace) {
        // For replace, we need to check the entire state
        if (!isEqual(currentState, state)) {
          return set(state as T, true);
        }
      } else {
        // For partial updates, we need to check each key
        const hasChanges = Object.keys(state).some(key => {
          return !isEqual(currentState[key as keyof T], state[key as keyof T]);
        });
        
        if (hasChanges) {
          // Log changed keys in development mode
          if (process.env.NODE_ENV === 'development') {
            const changedKeys = Object.keys(state).filter(key => {
              return !isEqual(currentState[key as keyof T], state[key as keyof T]);
            });
            console.log('Changed state keys:', changedKeys);
          }
          
          return set(state, false);
        }
      }
      
      // If no changes, return the current state
      return currentState;
    }
    
    // For other types, just call the original set function
    return set(state as T, replace);
  };
  
  return config(setWithEqualityCheck, get, api);
};
