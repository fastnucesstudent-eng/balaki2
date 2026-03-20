-- Add shipping_amount to orders table
-- Add shipping_amount to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC DEFAULT 0;

-- Create RPC to atomically increment voucher usage
CREATE OR REPLACE FUNCTION public.increment_voucher_usage(v_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.vouchers
    SET used_count = used_count + 1
    WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
