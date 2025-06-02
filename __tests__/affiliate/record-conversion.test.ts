import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAffiliateConversion } from '@/lib/services/affiliate/conversion-service';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn()
};

describe('recordAffiliateConversion', () => {
  const testConversionData = {
    affiliate_id: 'test-affiliate-id',
    click_id: 'test-click-id',
    order_id: 'test-order-id',
    customer_id: 'test-customer-id',
    gmv: 100.00,
    level: 1,
    sub_id: 'test-sub-id'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should successfully record a new conversion', async () => {
    // Mock checking for existing conversion (not found)
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    // Mock inserting new conversion
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'new-conversion-id' },
      error: null
    });

    const result = await recordAffiliateConversion({
      supabase: mockSupabase as any,
      conversionData: testConversionData
    });

    // Verify success and conversion ID
    expect(result).toEqual({
      success: true,
      conversionId: 'new-conversion-id',
      error: null
    });

    // Verify Supabase calls for checking existing conversion
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliate_conversions');
    expect(mockSupabase.select).toHaveBeenCalledWith('id');
    expect(mockSupabase.eq).toHaveBeenCalledWith('order_id', 'test-order-id');
    expect(mockSupabase.maybeSingle).toHaveBeenCalled();

    // Verify Supabase calls for inserting new conversion
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      affiliate_id: 'test-affiliate-id',
      click_id: 'test-click-id',
      order_id: 'test-order-id',
      customer_id: 'test-customer-id',
      gmv: 100.00,
      level: 1,
      status: 'pending',
      sub_id: 'test-sub-id'
    });
    expect(mockSupabase.single).toHaveBeenCalled();
  });

  it('should return existing conversion ID if one already exists (idempotency)', async () => {
    // Mock checking for existing conversion (found)
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-conversion-id' },
      error: null
    });

    const result = await recordAffiliateConversion({
      supabase: mockSupabase as any,
      conversionData: testConversionData
    });

    // Verify success and existing conversion ID
    expect(result).toEqual({
      success: true,
      conversionId: 'existing-conversion-id',
      error: null
    });

    // Verify Supabase calls for checking existing conversion only
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliate_conversions');
    expect(mockSupabase.select).toHaveBeenCalledWith('id');
    expect(mockSupabase.eq).toHaveBeenCalledWith('order_id', 'test-order-id');
    expect(mockSupabase.maybeSingle).toHaveBeenCalled();

    // Verify insert was NOT called (idempotency worked)
    expect(mockSupabase.insert).not.toHaveBeenCalled();
    expect(mockSupabase.single).not.toHaveBeenCalled();

    // Verify console.log was called with idempotency message
    expect(console.log).toHaveBeenCalled();
  });

  it('should handle error when checking for existing conversion', async () => {
    // Mock error when checking for existing conversion
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database query error' }
    });

    const result = await recordAffiliateConversion({
      supabase: mockSupabase as any,
      conversionData: testConversionData
    });

    // Verify failure and error
    expect(result).toEqual({
      success: false,
      conversionId: null,
      error: expect.any(Error)
    });
    expect(result.error?.message).toBe('Database query error');

    // Verify insert was NOT called due to error
    expect(mockSupabase.insert).not.toHaveBeenCalled();
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle error when inserting new conversion', async () => {
    // Mock checking for existing conversion (not found)
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    // Mock error when inserting new conversion
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert error' }
    });

    const result = await recordAffiliateConversion({
      supabase: mockSupabase as any,
      conversionData: testConversionData
    });

    // Verify failure and error
    expect(result).toEqual({
      success: false,
      conversionId: null,
      error: expect.any(Error)
    });
    expect(result.error?.message).toBe('Insert error');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Mock unexpected error
    mockSupabase.maybeSingle.mockRejectedValueOnce(new Error('Unexpected error'));

    const result = await recordAffiliateConversion({
      supabase: mockSupabase as any,
      conversionData: testConversionData
    });

    // Verify failure and error
    expect(result).toEqual({
      success: false,
      conversionId: null,
      error: expect.any(Error)
    });
    expect(result.error?.message).toBe('Unexpected error');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
  });
});
