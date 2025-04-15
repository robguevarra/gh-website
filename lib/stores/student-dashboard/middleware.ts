/**
 * Custom middleware for Zustand stores to enhance functionality
 * and provide performance monitoring capabilities
 */
import { type StateCreator, type StoreMutatorIdentifier, type StoreApi } from 'zustand';

/**
 * Performance monitoring middleware for Zustand stores
 * Logs state changes and measures performance impact in development mode
 */
/**
 * Performance monitoring middleware for Zustand stores
 * Tracks and logs state changes with performance metrics in development
 */
export const performanceMiddleware = 
  <
    T extends object,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    config: StateCreator<T, Mps, Mcs>
  ): StateCreator<T, Mps, Mcs> => 
  (set, get, api) => 
    config(
      (partialState: Partial<T>) => {
        // Only run performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
          const startTime = performance.now();
          
          // Log which parts of the state are changing
          const stateKeys = Object.keys(partialState as object);
          const previousState = get();
          const changedKeys = stateKeys.filter(key => 
            (partialState as any)[key] !== (previousState as any)[key]
          );
          

          //console.group('State Update');
          //console.log(`Changed state keys: ${changedKeys.join(', ')}`);
          
          // Execute the state update
          set(partialState);
          
          // Measure and log performance impact
          //const endTime = performance.now();
          //console.log(`Update took: ${(endTime - startTime).toFixed(2)}ms`);
          //console.groupEnd();
        } else {
          // In production, just update the state without monitoring
          set(partialState);
        }
      },
      get,
      api
    );

/**
 * Type guard to check if an object has valid Zustand selectors
 * Use this to catch incorrectly implemented selectors during development
 */
export function validateSelectors<T extends object>(obj: any): obj is T {
  // Check if all properties that are functions take a state parameter
  const functionProps = Object.entries(obj)
    .filter(([_, value]) => typeof value === 'function');
  
  if (functionProps.length === 0) return true;
  
  return functionProps.every(([name, func]) => {
    try {
      // Try calling the function with an empty object as state
      (func as Function)({});
      return true;
    } catch (e) {
      console.error(`Invalid selector: ${name}`, e);
      return false;
    }
  });
}

/**
 * Helper function to track subscriber counts for debugging
 * Helps identify potential memory leaks from unconditional hooks
 */
export const subscriptionTrackingMiddleware = 
  <
    T extends object,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    config: StateCreator<T, Mps, Mcs>
  ): StateCreator<T, Mps, Mcs> => {
    return (set, get, api) => {
      const store = config(set, get, api);
      
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        // Track subscriber count for debugging
        let subscriberCount = 0;
        const updateFrequency: Record<string, number> = {};
        
        // Add debugging methods to store
        (store as any)._getSubscriberCount = () => subscriberCount;
        (store as any)._getUpdateFrequency = () => ({ ...updateFrequency });
        
        // Create a proxy around the original setState method
        const originalSet = set;
        set = ((state: Partial<T>) => {
          // Track which keys are updated most frequently
          Object.keys(state as object).forEach(key => {
            updateFrequency[key] = (updateFrequency[key] || 0) + 1;
          });
          return originalSet(state);
        }) as typeof set;
      }
      
      return store;
    };
  };
