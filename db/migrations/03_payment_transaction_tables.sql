-- Payment and Transaction Tables Migration

-- Transactions table for payment records
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method TEXT,
  provider_reference TEXT, -- External payment provider reference
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table for billing records
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL, -- Array of line items
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription payments table for recurring billing
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.user_memberships(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods table for stored payment information
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- card, bank_transfer, etc.
  provider_token TEXT, -- Provider-specific token for this payment method
  last_four TEXT, -- Last four digits (for cards)
  expiry_date TEXT, -- MM/YY format (for cards)
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discount codes table for promotions
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- percentage, fixed_amount
  amount DECIMAL(10, 2) NOT NULL, -- Percentage or fixed amount
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  usage_limit INT,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Transactions table RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY transactions_view_own ON public.transactions 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all transactions
CREATE POLICY transactions_admin_view ON public.transactions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify transactions
CREATE POLICY transactions_admin_modify ON public.transactions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Invoices table RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own invoices
CREATE POLICY invoices_view_own ON public.invoices 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all invoices
CREATE POLICY invoices_admin_view ON public.invoices 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify invoices
CREATE POLICY invoices_admin_modify ON public.invoices 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Subscription payments table RLS
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription payments
CREATE POLICY subscription_payments_view_own ON public.subscription_payments 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all subscription payments
CREATE POLICY subscription_payments_admin_view ON public.subscription_payments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify subscription payments
CREATE POLICY subscription_payments_admin_modify ON public.subscription_payments 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Payment methods table RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment methods
CREATE POLICY payment_methods_view_own ON public.payment_methods 
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment methods
CREATE POLICY payment_methods_insert_own ON public.payment_methods 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment methods
CREATE POLICY payment_methods_update_own ON public.payment_methods 
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own payment methods
CREATE POLICY payment_methods_delete_own ON public.payment_methods 
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admins can view all payment methods
CREATE POLICY payment_methods_admin_view ON public.payment_methods 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Discount codes table RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active discount codes
CREATE POLICY discount_codes_view_active ON public.discount_codes 
  FOR SELECT USING (
    (start_date IS NULL OR start_date <= NOW()) AND
    (end_date IS NULL OR end_date >= NOW()) AND
    (usage_limit IS NULL OR usage_count < usage_limit)
  );

-- Policy: Admins can view all discount codes
CREATE POLICY discount_codes_admin_view ON public.discount_codes 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can modify discount codes
CREATE POLICY discount_codes_admin_modify ON public.discount_codes 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial discount codes
INSERT INTO public.discount_codes (code, discount_type, amount, start_date, end_date, usage_limit)
VALUES
  ('WELCOME2023', 'percentage', 15.00, '2023-01-01', '2023-12-31', 100),
  ('EARLYBIRD', 'percentage', 20.00, NOW(), NOW() + INTERVAL '30 days', 50); 