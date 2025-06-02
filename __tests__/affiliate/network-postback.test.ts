import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNetworkPostback } from '@/lib/services/affiliate/conversion-service';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis()
};

describe('createNetworkPostback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should successfully create a network postback record', async () => {
    // Mock successful insert
    mockSupabase.insert.mockResolvedValueOnce({
      error: null
    });

    const result = await createNetworkPostback({
      supabase: mockSupabase as any,
      conversionId: 'test-conversion-id',
      networkName: 'test-network',
      subId: 'test-sub-id',
      postbackUrl: 'https://example.com/postback?id={sub_id}'
    });

    // Verify success
    expect(result).toEqual({
      success: true,
      error: null
    });

    // Verify Supabase calls
    expect(mockSupabase.from).toHaveBeenCalledWith('network_postbacks');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      conversion_id: 'test-conversion-id',
      network_name: 'test-network',
      sub_id: 'test-sub-id',
      postback_url: 'https://example.com/postback?id={sub_id}',
      status: 'pending'
    });
  });

  it('should handle null subId', async () => {
    // Mock successful insert
    mockSupabase.insert.mockResolvedValueOnce({
      error: null
    });

    const result = await createNetworkPostback({
      supabase: mockSupabase as any,
      conversionId: 'test-conversion-id',
      networkName: 'test-network',
      subId: null,
      postbackUrl: 'https://example.com/postback'
    });

    // Verify success
    expect(result).toEqual({
      success: true,
      error: null
    });

    // Verify Supabase calls with null subId
    expect(mockSupabase.from).toHaveBeenCalledWith('network_postbacks');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      conversion_id: 'test-conversion-id',
      network_name: 'test-network',
      sub_id: null,
      postback_url: 'https://example.com/postback',
      status: 'pending'
    });
  });

  it('should handle error when inserting postback record', async () => {
    // Mock error on insert
    mockSupabase.insert.mockResolvedValueOnce({
      error: { message: 'Database error' }
    });

    const result = await createNetworkPostback({
      supabase: mockSupabase as any,
      conversionId: 'test-conversion-id',
      networkName: 'test-network',
      subId: 'test-sub-id',
      postbackUrl: 'https://example.com/postback'
    });

    // Verify failure and error
    expect(result).toEqual({
      success: false,
      error: expect.any(Error)
    });
    expect(result.error?.message).toBe('Database error');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Mock unexpected error
    mockSupabase.insert.mockRejectedValueOnce(new Error('Unexpected error'));

    const result = await createNetworkPostback({
      supabase: mockSupabase as any,
      conversionId: 'test-conversion-id',
      networkName: 'test-network',
      subId: 'test-sub-id',
      postbackUrl: 'https://example.com/postback'
    });

    // Verify failure and error
    expect(result).toEqual({
      success: false,
      error: expect.any(Error)
    });
    expect(result.error?.message).toBe('Unexpected error');
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalled();
  });
});
