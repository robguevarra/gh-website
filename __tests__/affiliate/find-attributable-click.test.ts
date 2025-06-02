import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findAttributableClick } from '@/lib/services/affiliate/conversion-service';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn()
};

describe('findAttributableClick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return click ID and sub ID when a recent click is found', async () => {
    // Setup mock response for a found click
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'test-click-id', sub_id: 'test-sub-id' },
      error: null
    });

    const result = await findAttributableClick({
      supabase: mockSupabase as any,
      affiliateId: 'test-affiliate-id',
      visitorId: 'test-visitor-id'
    });

    // Verify the click ID and sub ID are returned
    expect(result).toEqual({
      clickId: 'test-click-id',
      subId: 'test-sub-id'
    });

    // Verify Supabase was queried correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliate_clicks');
    expect(mockSupabase.select).toHaveBeenCalledWith('id, sub_id');
    expect(mockSupabase.eq).toHaveBeenCalledWith('affiliate_id', 'test-affiliate-id');
    expect(mockSupabase.eq).toHaveBeenCalledWith('visitor_id', 'test-visitor-id');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    expect(mockSupabase.maybeSingle).toHaveBeenCalled();
  });

  it('should return null values when no click is found', async () => {
    // Setup mock response for no click found
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found' }
    });

    const result = await findAttributableClick({
      supabase: mockSupabase as any,
      affiliateId: 'test-affiliate-id',
      visitorId: 'test-visitor-id'
    });

    // Verify null values are returned
    expect(result).toEqual({
      clickId: null,
      subId: null
    });
  });

  it('should return null values and log error when database query fails', async () => {
    // Setup mock for database error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection error' }
    });

    const result = await findAttributableClick({
      supabase: mockSupabase as any,
      affiliateId: 'test-affiliate-id',
      visitorId: 'test-visitor-id'
    });

    // Verify null values are returned and error is logged
    expect(result).toEqual({
      clickId: null,
      subId: null
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Setup mock to throw an unexpected error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.maybeSingle.mockRejectedValueOnce(new Error('Unexpected error'));

    const result = await findAttributableClick({
      supabase: mockSupabase as any,
      affiliateId: 'test-affiliate-id',
      visitorId: 'test-visitor-id'
    });

    // Verify null values are returned and error is logged
    expect(result).toEqual({
      clickId: null,
      subId: null
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
