-- ====================================================================
-- TARZIFY DEFINITIVE SYSTEM FIX (V2.0)
-- RUN THIS ENTIRE SCRIPT ONE TIME IN SUPABASE SQL EDITOR
-- ====================================================================

-- 1. SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_order_access(o_id bigint, u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = o_id AND p.merchant_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. BASE TABLES
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sub_categories (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, name)
);

-- 3. MERCHANT EXPANSION COLUMNS (PROFILES)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ntn TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_branch_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. ORDER EMAIL COLUMN
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

-- 5. FOREIGN KEY RELATIONSHIP FIXES (PostgREST)
-- Redirect products.merchant_id FROM auth.users TO public.profiles
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_merchant_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Redirect orders.user_id FROM auth.users TO public.profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. CACHE REFRESH
COMMENT ON TABLE public.profiles IS 'Schema Updated 2026-03-20';
COMMENT ON TABLE public.products IS 'Schema Updated 2026-03-20';

SELECT 'DATABASE UPDATED SUCCESSFULY! PLEASE RELOAD SCHEMA CACHE IN SETTINGS AND REFRESH YOUR APP.' AS result;
