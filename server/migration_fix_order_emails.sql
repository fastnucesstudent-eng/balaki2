-- ====================================================================
-- TARZIFY ORDER EMAIL FIX MIGRATION
-- Adds email column to orders for reliable notifications
-- ====================================================================

-- 1. Add email column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill emails from profiles for existing orders
UPDATE public.orders o
SET email = p.email
FROM public.profiles p
WHERE o.user_id = p.id AND o.email IS NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

SELECT 'Order email migration complete ✅' AS result;
