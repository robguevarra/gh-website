/**
 * Performance Monitoring and Subscription Tracking Middleware for Zustand Store
 * 
 * This middleware provides performance monitoring and subscription tracking
 * to help identify potential performance issues in development.
 */
import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';

export const performanceMiddleware = <T extends Record<string, unknown>>(
  f: StateCreator<T, [], []>
): StateCreator<T, [], []> => (set, get, api) => {
  const performanceSet: typeof set = (...args) => {
    const before = performance.now();
    const result = set(...args);
    const after = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      if (after - before > 5) {
        // Log slow state updates only in development
        console.warn(
          `[Performance Warning] State update took ${(after - before).toFixed(2)}ms.`,
          args[0]
        );
      }
    }
    
    return result;
  };
  
  return f(performanceSet, get, api);
};

/**
 * Tracks Zustand store subscriptions to identify potential memory leaks
 * and components that may be subscribing to too much state
 */
export const subscriptionTrackingMiddleware = <T extends Record<string, unknown>>(
  f: StateCreator<T, [], []>
): StateCreator<T, [], []> => (set, get, api) => {
  // Only track subscriptions in development
  if (process.env.NODE_ENV === 'development') {
    const subscriptions = new Map<number, { caller: string, selector: string }>();
    let subscriptionId = 0;
    
    /**
     * Original subscribe function
     */
    const originalApi = { ...api };
    const originalSubscribe = originalApi.subscribe as any;
    
    api.subscribe = (listener: any, selector?: any) => {
      const id = subscriptionId++;
      
      // Get the stack trace to identify the component subscribing
      const stackTrace = new Error().stack || '';
      const callerComponent = stackTrace
        .split('\n')
        .slice(2, 3) // Get the caller component from the stack trace
        .map(line => line.trim())
        .join('');
      
      // Store subscription details
      subscriptions.set(id, {
        caller: callerComponent,
        selector: selector ? selector.toString().substring(0, 100) : 'full state',
      });
      
      // Monitor when subscription is removed
      const unsubscribe = originalSubscribe(listener, selector);
      
      return () => {
        unsubscribe();
        subscriptions.delete(id);
      };
    };
    
    // Add a way to debug subscriptions
    (api as any).getSubscriptionDebugInfo = () => {
      return Array.from(subscriptions.entries()).map(([id, details]) => ({
        id,
        ...details,
      }));
    };
  }
  
  return f(set, get, api);
};
