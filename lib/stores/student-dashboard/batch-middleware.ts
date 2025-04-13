import { StateCreator, StoreApi } from 'zustand';
import { StudentDashboardState } from './types';

/**
 * Middleware for batching state updates in Zustand
 * 
 * This middleware allows for batching multiple state updates into a single update,
 * which reduces the number of re-renders caused by sequential state changes.
 * 
 * @example
 * ```ts
 * // In your store definition
 * import { batchMiddleware } from './batch-middleware';
 * 
 * const useStudentDashboardStore = create<StudentDashboardState>()(
 *   batchMiddleware(
 *     (set) => ({
 *       // state and actions
 *     })
 *   )
 * );
 * 
 * // Usage in components or other code
 * import { batch } from './batch-middleware';
 * 
 * // Batch multiple updates together
 * batch(() => {
 *   setIsLoading(true);
 *   setData(newData);
 *   setError(null);
 * });
 * ```
 */

// Queue for batched updates
let queue: Array<() => void> = [];
let scheduled = false;

// Function to process the queue
const processQueue = () => {
  const callbacks = queue;
  queue = [];
  scheduled = false;
  callbacks.forEach(callback => callback());
};

/**
 * Batch multiple state updates into a single update
 * 
 * @param callback - Function containing multiple state updates
 */
export const batch = (callback: () => void) => {
  callback();
  
  // Process the queue on the next tick
  if (!scheduled) {
    scheduled = true;
    Promise.resolve().then(processQueue);
  }
};

/**
 * Middleware for batching state updates
 */
export const batchMiddleware = <T extends StudentDashboardState>(
  config: StateCreator<T>
): StateCreator<T> => (set, get, api) => {
  // Create a batched version of the set function
  const batchedSet: typeof set = (updater, replace) => {
    // If we're already processing the queue, use the original set
    if (scheduled) {
      return set(updater, replace);
    }
    
    // Otherwise, queue the update
    queue.push(() => {
      set(updater, replace);
    });
    
    // Schedule processing if not already scheduled
    if (!scheduled) {
      scheduled = true;
      Promise.resolve().then(processQueue);
    }
  };
  
  return config(batchedSet, get, api);
};

/**
 * Helper function to batch multiple state updates with a specific store
 * 
 * @param store - The store to batch updates for
 * @param callback - Function containing multiple state updates
 */
export const batchWithStore = <T>(
  store: StoreApi<T>,
  callback: () => void
) => {
  const originalState = store.getState();
  const updates: Partial<T> = {};
  
  // Create a proxy to track which properties are updated
  const stateProxy = new Proxy(originalState, {
    set: (target, property, value) => {
      updates[property as keyof T] = value;
      return true;
    }
  });
  
  // Run the callback with the proxy
  callback();
  
  // Apply all updates at once
  if (Object.keys(updates).length > 0) {
    store.setState(updates as Partial<T>);
  }
};
