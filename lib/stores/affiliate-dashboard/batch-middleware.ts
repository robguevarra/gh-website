/**
 * Batch Middleware for Zustand Store
 * 
 * This middleware batches state updates to prevent unnecessary renders
 * when multiple state updates happen in quick succession.
 */
import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';

type Dispatch<T, U> = StateCreator<
  T,
  [['zustand/persist', unknown], ['zustand/equality', U]] | [['zustand/equality', U]],
  [],
  T
>;

export const batchMiddleware = <T, U>(
  dispatch: Dispatch<T, U>,
): Dispatch<T, U> => {
  let queuedActions: (() => void)[] = [];
  let batching = false;
  let nextAnimationFrame: number | null = null;

  const batchedDispatch: Dispatch<T, U> = (set, get, api) => {
    const originalSet = set;
    const enhancedSet: typeof set = (args, actionName) => {
      if (typeof args === 'function') {
        if (batching) {
          // If we're batching, queue the function to be executed later
          queuedActions.push(() => originalSet(args, actionName));
          return;
        }
        // If not batching, process as normal
        return originalSet(args, actionName);
      } else {
        if (batching) {
          // If we're batching, queue the update to be executed later
          queuedActions.push(() => originalSet(args, actionName));
          return;
        }
        // If not batching, process as normal
        return originalSet(args, actionName);
      }
    };

    // Create the original store instance with the enhanced set function
    const store = dispatch(enhancedSet, get, api);

    // Return a modified store that includes batch methods
    return {
      ...store,
      batch: <T>(fn: () => T): T => {
        // Ensure we don't start batching if we're already batching
        if (batching) return fn();
        
        // Start batching
        batching = true;
        const result = fn();
        
        // Process all queued actions in the next animation frame
        if (queuedActions.length > 0) {
          if (nextAnimationFrame) {
            cancelAnimationFrame(nextAnimationFrame);
          }
          
          nextAnimationFrame = requestAnimationFrame(() => {
            nextAnimationFrame = null;
            batching = false;
            
            // Execute all queued actions
            const actionsToExecute = [...queuedActions];
            queuedActions = [];
            actionsToExecute.forEach(action => action());
          });
        } else {
          batching = false;
        }
        
        return result;
      },
    };
  };

  return batchedDispatch;
};
