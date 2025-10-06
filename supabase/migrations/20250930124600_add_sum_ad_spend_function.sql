-- RPC to compute total ad spend within an optional date range
CREATE OR REPLACE FUNCTION public.sum_ad_spend(p_start date DEFAULT NULL, p_end date DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(spend), 0)::numeric
  FROM public.ad_spend
  WHERE (p_start IS NULL OR date >= p_start)
    AND (p_end   IS NULL OR date <= p_end);
$$;
