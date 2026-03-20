-- ====================================================================
-- TARZIFY ALL-IN-ONE DATABASE SYNCHRONIZATION ( definitivo )
-- RUN THIS IN SUPABASE SQL EDITOR TO ENSURE 100% SYNC
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

-- 2. BASE TABLES (IF THEY DON'T EXIST)
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

-- 3. ENSURE PROFILES HAS ALL COLUMNS
DO $$ 
BEGIN
  BEGIN ALTER TABLE public.profiles ADD COLUMN email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN phone TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused')); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN store_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN store_slug TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN business_address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN ntn TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN bank_account TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN bank_title TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN bank_branch_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN logo_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN qr_code_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN contact_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN merchant_categories TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN rejection_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 4. ENSURE ORDERS HAS EMAIL
DO $$ 
BEGIN
  BEGIN ALTER TABLE public.orders ADD COLUMN email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

-- 5. FIX FOREIGN KEY RELATIONSHIP (PostgREST)
-- Redirect products.merchant_id FROM auth.users TO public.profiles
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_merchant_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Redirect orders.user_id FROM auth.users TO public.profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. CACHE REFRESH & NOTIFY
COMMENT ON TABLE public.profiles IS 'Schema Sync 2026-03-20';
COMMENT ON TABLE public.products IS 'Schema Sync 2026-03-20';

SELECT 'DATABASE SYNCHRONIZED! 🚀 PLEASE: 
1. GO TO SETTINGS -> API -> CLICK RELOAD SCHEMA CACHE
2. IN THE ADMIN DASHBOARD, APPROVE THE MERCHANT TO SHOW THEIR PRODUCTS.' AS result;
