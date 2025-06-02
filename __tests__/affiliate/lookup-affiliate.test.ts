import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupAffiliateBySlug } from '@/lib/services/affiliate/conversion-service';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn()
};

describe('lookupAffiliateBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return affiliate ID when an active affiliate is found by slug', async () => {
    // Setup mock response for an active affiliate
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'test-affiliate-id' },
      error: null
    });

    const result = await lookupAffiliateBySlug({
      supabase: mockSupabase as any,
      slug: 'test-affiliate-slug'
    });

    // Verify the affiliate ID is returned
    expect(result).toBe('test-affiliate-id');

    // Verify Supabase was queried correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliates');
    expect(mockSupabase.select).toHaveBeenCalledWith('id');
    expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'test-affiliate-slug');
    expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('should return null when no active affiliate is found with the slug', async () => {
    // Setup mock response for no affiliate found
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found' }
    });

    const result = await lookupAffiliateBySlug({
      supabase: mockSupabase as any,
      slug: 'non-existent-slug'
    });

    // Verify null is returned
    expect(result).toBeNull();
  });

  it('should return null and log error when database query fails', async () => {
    // Setup mock for database error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection error' }
    });

    const result = await lookupAffiliateBySlug({
      supabase: mockSupabase as any,
      slug: 'test-slug'
    });

    // Verify null is returned and error is logged
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
