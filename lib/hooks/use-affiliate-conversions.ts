import { useState, useEffect } from 'react';

export interface ConversionRecord {
  id: string;
  order_id: string;
  commission_amount: number;
  status: 'pending' | 'flagged' | 'cleared' | 'paid';
  created_at: string;
  updated_at: string;
}

export interface ConversionsResponse {
  conversions: ConversionRecord[];
  total: number;
  limit: number;
  offset: number;
}

export function useAffiliateConversions(status?: string, limit = 20, offset = 0) {
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchConversions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (status && status !== 'all') {
          params.set('status', status);
        }
        params.set('limit', limit.toString());
        params.set('offset', offset.toString());

        const response = await fetch(`/api/affiliate/conversions?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch conversions: ${response.statusText}`);
        }

        const data: ConversionsResponse = await response.json();
        setConversions(data.conversions);
        setTotal(data.total);
      } catch (err) {
        console.error('Error fetching conversions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch conversions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversions();
  }, [status, limit, offset]);

  return {
    conversions,
    isLoading,
    error,
    total,
    refetch: () => {
      // Trigger a refetch by updating a dependency
      setIsLoading(true);
    }
  };
} 