import type { RequestCache } from '../types';

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class CacheManager {
  private requestCache: Map<string, RequestCache>;
  private pendingRequests: Map<string, Promise<any>>;

  constructor() {
    this.requestCache = new Map();
    this.pendingRequests = new Map();
  }

  get(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('✅ [Cache] Using cached data for:', key);
      return cached.data;
    }
    return null;
  }

  set(key: string, data: any): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    });
  }

  getPendingRequest(key: string): Promise<any> | null {
    return this.pendingRequests.get(key) || null;
  }

  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  clear(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
  }
}

export const cacheManager = new CacheManager(); 