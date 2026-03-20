-- CLEAN_DATABASE_RELATIONS.sql
-- Run this in Supabase SQL Editor to fix the "more than one relationship" error

-- 0. Ensure check_order_access exists for both possible ID types (UUID and BIGINT)
CREATE OR REPLACE FUNCTION public.check_order_access(order_id_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id::text = order_id_uuid::text
    AND p.merchant_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_order_access(order_id_bigint BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE (
      (oi.order_id::text ~ '^[0-9]+$' AND oi.order_id::bigint = order_id_bigint)
      OR 
      (oi.order_id::text = order_id_bigint::text)
    )
    AND p.merchant_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Drop the redundant constraint that mistakenly links order ID to profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Ensure the correct constraint exists for user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_user_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Also check order_items for same issue
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Verify RLS policies are using the correct checks
DROP POLICY IF EXISTS "Merchants view assigned orders" ON public.orders;
CREATE POLICY "Merchants view assigned orders" ON public.orders
FOR SELECT USING (
  public.check_order_access(id) OR public.is_admin()
);

-- 5. Fix profiles table columns for merchants
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS merchant_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_slug TEXT,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS ntn TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bank_title TEXT,
ADD COLUMN IF NOT EXISTS bank_branch_code TEXT,
ADD COLUMN IF NOT EXISTS merchant_categories TEXT[];

-- Success message
SELECT 'Database relations cleaned and merchant columns ensured' as status;
