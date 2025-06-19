import { NextRequest, NextResponse } from 'next/server'
import { SupabaseCacheService } from '@/lib/supabase/cache-service'

export async function GET(request: NextRequest) {
  try {
    // Get cache statistics
    const stats = await SupabaseCacheService.getStats()
    
    // Clean expired cache entries
    const cleanedCount = await SupabaseCacheService.cleanExpiredCache()
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        cleaned_expired_entries: cleanedCount,
        cache_efficiency: stats.total_entries > 0 
          ? Math.round(((stats.total_entries - stats.expired_entries) / stats.total_entries) * 100)
          : 100
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Cache stats error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stats: {
        total_entries: 0,
        facebook_entries: 0,
        youtube_entries: 0,
        expired_entries: 0,
        cleaned_expired_entries: 0,
        cache_efficiency: 0
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 