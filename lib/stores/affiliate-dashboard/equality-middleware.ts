/**
 * Equality Middleware for Zustand Store
 * 
 * This middleware adds shallow equality checking to prevent unnecessary 
 * re-renders when state updates don't actually change values.
 */
import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';
import { shallow } from 'zustand/shallow';

type MaybeStoreActionApi = Record<string, unknown>;

type EqualityMiddleware = <
  T extends Record<string, unknown>,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>;

/**
 * Middleware that adds shallow equality checking to state updates
 */
export const equalityMiddleware: EqualityMiddleware = (createState) => (set, get, api) => {
  const equalityCheckingSet: typeof set = (partial, replace) => {
    const nextState = typeof partial === 'function' ? partial(get()) : partial;
    
    // If replace is specified, we don't do equality checking
    if (replace) {
      return set(nextState, replace);
    }
    
    // Get the current state
    const currentState = get();
    
    // Perform shallow equality check
    if (!shallow(Object.assign({}, currentState, nextState), currentState)) {
      return set(nextState, replace);
    }
    
    // If the states are shallow equal, don't update
    return currentState;
  };
  
  return createState(equalityCheckingSet, get, api as MaybeStoreActionApi);
};
