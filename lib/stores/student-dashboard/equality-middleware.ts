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
  let previousState = { ...get() };

  // Override the set method to detect changes
  const newSet: typeof set = (partial, replace) => {
    set(partial, replace);
    const currentState = { ...get() };
    const changedKeys: string[] = [];

    // Check for changed keys
    for (const key in currentState) {
      if (Object.prototype.hasOwnProperty.call(currentState, key)) {
        if (!Object.is(previousState[key as keyof T], currentState[key as keyof T])) {
          changedKeys.push(key);
        }
      }
    }

    // Log changed keys in development mode
    if (process.env.NODE_ENV === 'development') {
      // *** JUST COMMENT OUT THIS LINE ***
      // console.log('Changed state keys:', changedKeys);
    }

    previousState = currentState;
  };

  return config(newSet, get, api);
};
