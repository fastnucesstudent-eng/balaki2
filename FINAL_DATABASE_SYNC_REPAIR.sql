-- ====================================================================
-- TARZIFY FINAL DATABASE SYNC & REPAIR (March 20, 2026)
-- 🚀 RUN THIS IN SUPABASE SQL EDITOR TO FIX EVERYTHING AT ONCE
-- ====================================================================

-- 1. ENSURE PROFILES HAS ALL MERCHANT COLUMNS
DO $$ 
BEGIN
  -- Merchant Core
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused')); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ntn TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_number TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  
  -- Banking
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_title TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_branch_code TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  
  -- Assets
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  
  -- Metadata
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_categories TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 2. ENSURE ORDERS HAS EMAIL (FOR TRACKING)
DO $$ 
BEGIN
  BEGIN ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

-- 3. RE-CREATE SECURITY FUNCTIONS (Ensuring SECURITY DEFINER)
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

-- 4. FIX RELATIONSHIPS (PostgREST Ambiguity Fix)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_merchant_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. REPAIR RLS POLICIES (Comprehensive)

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles self-access" ON public.profiles;
CREATE POLICY "Profiles self-access" ON public.profiles FOR ALL USING (id = auth.uid());
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Public can view merchant basic info" ON public.profiles;
CREATE POLICY "Public can view merchant basic info" ON public.profiles FOR SELECT USING (role = 'merchant' AND merchant_status = 'approved');

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
CREATE POLICY "Admins manage all products" ON public.products FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Merchants manage own products" ON public.products;
CREATE POLICY "Merchants manage own products" ON public.products FOR ALL USING (merchant_id = auth.uid());

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Merchants view assigned orders" ON public.orders;
CREATE POLICY "Merchants view assigned orders" ON public.orders FOR SELECT USING (public.check_order_access(id, auth.uid()));

-- Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage items" ON public.order_items;
CREATE POLICY "Admins manage items" ON public.order_items FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Users view own items" ON public.order_items;
CREATE POLICY "Users view own items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "Merchants view own items" ON public.order_items;
CREATE POLICY "Merchants view own items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.merchant_id = auth.uid()));

-- 6. REFRESH CACHE
NOTIFY pgrst, 'reload schema';
COMMENT ON TABLE public.profiles IS 'TOTAL_SYNC_COMPLETE_2026_03_20';

SELECT 'DATABASE FULLY FIXED! 🚀 Refresh your browser and try the Merchant Registration again.' AS result;
