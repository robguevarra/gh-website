import type { RequestCache } from '../types';

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class CacheManager {
  private requestCache: Map<string, RequestCache>;
  private pendingRequests: Map<string, Promise<any>>;
  private namespace: string;

  constructor(namespace: string = 'default') {
    this.requestCache = new Map();
    this.pendingRequests = new Map();
    this.namespace = namespace;
  }

  get(key: string): any | null {
    const namespacedKey = `${this.namespace}:${key}`;
    const cached = this.requestCache.get(namespacedKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`✅ [Cache:${this.namespace}] Using cached data for:`, key);
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any): void {
    const namespacedKey = `${this.namespace}:${key}`;
    this.requestCache.set(namespacedKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    });
    console.log(`🔄 [Cache:${this.namespace}] Setting data for:`, key);
  }

  getPendingRequest(key: string): Promise<any> | null {
    const namespacedKey = `${this.namespace}:${key}`;
    return this.pendingRequests.get(namespacedKey) || null;
  }

  setPendingRequest(key: string, promise: Promise<any>): void {
    const namespacedKey = `${this.namespace}:${key}`;
    this.pendingRequests.set(namespacedKey, promise);
    promise.finally(() => {
      this.pendingRequests.delete(namespacedKey);
    });
  }

  clear(): void {
    // Clear only items in this namespace
    const keysToDelete: string[] = [];

    // Find all keys in this namespace
    this.requestCache.forEach((_, key) => {
      if (key.startsWith(`${this.namespace}:`)) {
        keysToDelete.push(key);
      }
    });

    // Delete the keys
    keysToDelete.forEach(key => {
      this.requestCache.delete(key);
    });

    // Do the same for pending requests
    const pendingKeysToDelete: string[] = [];
    this.pendingRequests.forEach((_, key) => {
      if (key.startsWith(`${this.namespace}:`)) {
        pendingKeysToDelete.push(key);
      }
    });

    pendingKeysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
    });

    console.log(`🗑️ [Cache:${this.namespace}] Cleared cache`);
  }

  /**
   * Clears all caches regardless of namespace
   */
  clearAll(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
    console.log(`🗑️ [Cache] Cleared ALL caches`);
  }

  /**
   * Sets the namespace for this cache manager
   * @param namespace The new namespace
   */
  setNamespace(namespace: string): void {
    this.namespace = namespace;
  }
}

// Create a cache manager with the admin namespace
export const cacheManager = new CacheManager('admin-course-editor');

// Export a function to create a cache manager with a specific namespace
export const createCacheManager = (namespace: string): CacheManager => {
  return new CacheManager(namespace);
};