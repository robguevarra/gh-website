import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for caching (server-side only)
const getSupabaseClient = () => {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    throw new Error('SupabaseCacheService can only be used on the server side')
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured for caching')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export interface CacheOptions {
  ttl?: number // Time to live in minutes (default: 60)
  forceRefresh?: boolean // Force refresh even if cache exists
}

export class SupabaseCacheService {
  
  /**
   * Get cached data by key
   * @param cacheKey Unique identifier for the cached item
   * @param apiType Type of API ('facebook' or 'youtube')
   * @returns Cached data or null if not found/expired
   */
  static async get<T = any>(cacheKey: string, apiType: string): Promise<T | null> {
    try {
      // Clean expired cache first
      await this.cleanExpiredCache()
      
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('api_cache')
        .select('data, expires_at')
        .eq('cache_key', cacheKey)
        .eq('api_type', apiType)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        console.log(`🗃️ Cache MISS for ${apiType}:${cacheKey}`)
        return null
      }

      console.log(`🎯 Cache HIT for ${apiType}:${cacheKey}`)
      return data.data as T
    } catch (error) {
      console.error('❌ Cache GET error:', error)
      return null
    }
  }

  /**
   * Store data in cache
   * @param cacheKey Unique identifier for the cached item
   * @param apiType Type of API ('facebook' or 'youtube')
   * @param data Data to cache
   * @param ttlMinutes Time to live in minutes
   */
  static async set(
    cacheKey: string, 
    apiType: string, 
    data: any, 
    ttlMinutes: number = 60
  ): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
      
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          api_type: apiType,
          data: data,
          expires_at: expiresAt.toISOString()
        }, {
          onConflict: 'cache_key'
        })

      if (error) {
        console.error('❌ Cache SET error:', error)
        return false
      }

      console.log(`💾 Cache SET for ${apiType}:${cacheKey} (TTL: ${ttlMinutes}m)`)
      return true
    } catch (error) {
      console.error('❌ Cache SET error:', error)
      return false
    }
  }

  /**
   * Delete cached item
   * @param cacheKey Unique identifier for the cached item
   * @param apiType Type of API ('facebook' or 'youtube')
   */
  static async delete(cacheKey: string, apiType: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', cacheKey)
        .eq('api_type', apiType)

      if (error) {
        console.error('❌ Cache DELETE error:', error)
        return false
      }

      console.log(`🗑️ Cache DELETED for ${apiType}:${cacheKey}`)
      return true
    } catch (error) {
      console.error('❌ Cache DELETE error:', error)
      return false
    }
  }

  /**
   * Clean all expired cache entries
   */
  static async cleanExpiredCache(): Promise<number> {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .rpc('clean_expired_cache')

      if (error) {
        console.error('❌ Cache CLEAN error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('❌ Cache CLEAN error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    total_entries: number
    facebook_entries: number
    youtube_entries: number
    expired_entries: number
  }> {
    try {
      const supabase = getSupabaseClient()
      
      const { count: totalCount } = await supabase
        .from('api_cache')
        .select('*', { count: 'exact', head: true })

      const { count: facebookCount } = await supabase
        .from('api_cache')
        .select('*', { count: 'exact', head: true })
        .eq('api_type', 'facebook')

      const { count: youtubeCount } = await supabase
        .from('api_cache')
        .select('*', { count: 'exact', head: true })
        .eq('api_type', 'youtube')

      const { count: expiredCount } = await supabase
        .from('api_cache')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString())

      return {
        total_entries: totalCount || 0,
        facebook_entries: facebookCount || 0,
        youtube_entries: youtubeCount || 0,
        expired_entries: expiredCount || 0
      }
    } catch (error) {
      console.error('❌ Cache STATS error:', error)
      return {
        total_entries: 0,
        facebook_entries: 0,
        youtube_entries: 0,
        expired_entries: 0
      }
    }
  }

  /**
   * Helper method to get or fetch data with caching
   * @param cacheKey Unique identifier for the cached item
   * @param apiType Type of API ('facebook' or 'youtube')
   * @param fetchFunction Function to fetch fresh data if cache miss
   * @param ttlMinutes Time to live in minutes
   */
  static async getOrFetch<T = any>(
    cacheKey: string,
    apiType: string,
    fetchFunction: () => Promise<T>,
    ttlMinutes: number = 60
  ): Promise<T | null> {
    // Try to get from cache first
    const cachedData = await this.get<T>(cacheKey, apiType)
    if (cachedData) {
      return cachedData
    }

    try {
      // Cache miss - fetch fresh data
      console.log(`🔄 Fetching fresh data for ${apiType}:${cacheKey}`)
      const freshData = await fetchFunction()
      
      // Store in cache
      await this.set(cacheKey, apiType, freshData, ttlMinutes)
      
      return freshData
    } catch (error) {
      console.error(`❌ Error fetching fresh data for ${apiType}:${cacheKey}`, error)
      return null
    }
  }
}

// Export cache configurations
export const CACHE_CONFIG = {
  FACEBOOK: {
    ttl: 60, // 1 hour for Facebook posts
    key: 'facebook_page_data'
  },
  YOUTUBE: {
    ttl: 1440, // 24 hours for YouTube data (more stable)
    key: 'youtube_channel_data'
  }
} as const 