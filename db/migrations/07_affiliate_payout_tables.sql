-- Affiliate Payout System Tables Migration

-- Payout Batch Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_batch_status_type') THEN
        CREATE TYPE public.payout_batch_status_type AS ENUM (
            'pending',
            'verified',
            'processing',
            'completed',
            'failed'
        );
    END IF;
END$$;

-- Payout Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status_type') THEN
        CREATE TYPE public.payout_status_type AS ENUM (
            'pending',
            'scheduled',
            'processing',
            'paid',
            'failed',
            'cancelled'
        );
    END IF;
END$$;

-- Affiliate Payout Batches Table
CREATE TABLE IF NOT EXISTS public.affiliate_payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status public.payout_batch_status_type NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    affiliate_count INTEGER NOT NULL DEFAULT 0,
    conversion_count INTEGER NOT NULL DEFAULT 0,
    payout_method TEXT NOT NULL,
    processing_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Affiliate Payouts Table
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.affiliate_payout_batches(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status public.payout_status_type NOT NULL DEFAULT 'pending',
    payout_method TEXT,
    reference TEXT,
    transaction_date DATE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    xendit_disbursement_id TEXT,
    processing_notes TEXT,
    fee_amount NUMERIC(10, 2),
    net_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payout Items Table (linking payouts to conversions)
CREATE TABLE IF NOT EXISTS public.payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES public.affiliate_payouts(id) ON DELETE CASCADE,
    conversion_id UUID NOT NULL REFERENCES public.affiliate_conversions(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Affiliate Payout Rules Table
CREATE TABLE IF NOT EXISTS public.affiliate_payout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rule_type TEXT NOT NULL, -- e.g., 'min_payout_threshold', 'commission_rate_modifier'
    value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_payout_batches_status ON public.affiliate_payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_batch_id ON public.affiliate_payouts(batch_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON public.payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_conversion_id ON public.payout_items(conversion_id);


-- RPC function to get payout batch stats
CREATE OR REPLACE FUNCTION public.get_payout_batch_stats()
RETURNS TABLE (
  "totalBatches" BIGINT,
  "pendingBatches" BIGINT,
  "processingBatches" BIGINT,
  "completedBatches" BIGINT,
  "failedBatches" BIGINT,
  "totalAmount" NUMERIC
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS "totalBatches",
    COUNT(*) FILTER (WHERE status = 'pending') AS "pendingBatches",
    COUNT(*) FILTER (WHERE status = 'processing' OR status = 'verified') AS "processingBatches",
    COUNT(*) FILTER (WHERE status = 'completed') AS "completedBatches",
    COUNT(*) FILTER (WHERE status = 'failed') AS "failedBatches",
    COALESCE(SUM(total_amount), 0) AS "totalAmount"
  FROM
    public.affiliate_payout_batches;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_affiliate_payout_batches_updated_at
BEFORE UPDATE ON public.affiliate_payout_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_payouts_updated_at
BEFORE UPDATE ON public.affiliate_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_payout_rules_updated_at
BEFORE UPDATE ON public.affiliate_payout_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 