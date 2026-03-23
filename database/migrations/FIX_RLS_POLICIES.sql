-- ====================================================================
-- TARZIFY RLS POLICY REPAIR (definitive)
-- Resolves "Admin Approval" and "Product Visibility" blockers
-- ====================================================================

-- 1. RE-CREATE SECURITY FUNCTIONS (Ensuring SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Order Access Check for Merchants
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

-- 2. REPAIR PROFILE POLICIES (Admins must be able to manage all profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles self-access" ON public.profiles;
CREATE POLICY "Profiles self-access" ON public.profiles 
FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles 
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can view merchant basic info" ON public.profiles;
CREATE POLICY "Public can view merchant basic info" ON public.profiles 
FOR SELECT USING (role = 'merchant' AND merchant_status = 'approved');

-- 3. REPAIR PRODUCT POLICIES (Allow admins to manage everything)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products 
FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
CREATE POLICY "Admins manage all products" ON public.products 
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Merchants manage own products" ON public.products;
CREATE POLICY "Merchants manage own products" ON public.products 
FOR ALL USING (merchant_id = auth.uid());

-- 4. REPAIR CATEGORY POLICIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories 
FOR ALL USING (public.is_admin());

-- 5. REPAIR OTHER TABLES (Banners, Vouchers)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'banners') THEN
    ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage banners" ON public.banners;
    CREATE POLICY "Admins manage banners" ON public.banners FOR ALL USING (public.is_admin());
    DROP POLICY IF EXISTS "Anyone view approved banners" ON public.banners;
    CREATE POLICY "Anyone view approved banners" ON public.banners FOR SELECT USING (status = 'approved');
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vouchers') THEN
    ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage vouchers" ON public.vouchers;
    CREATE POLICY "Admins manage vouchers" ON public.vouchers FOR ALL USING (public.is_admin());
  END IF;

  -- New: Repair Order Policies
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
    CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.is_admin());
    DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
    CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
    DROP POLICY IF EXISTS "Merchants view assigned orders" ON public.orders;
    CREATE POLICY "Merchants view assigned orders" ON public.orders FOR SELECT USING (public.check_order_access(id, auth.uid()));
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins manage items" ON public.order_items;
    CREATE POLICY "Admins manage items" ON public.order_items FOR ALL USING (public.is_admin());
    DROP POLICY IF EXISTS "Users view own items" ON public.order_items;
    CREATE POLICY "Users view own items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Merchants view own items" ON public.order_items;
    CREATE POLICY "Merchants view own items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.merchant_id = auth.uid()));
  END IF;
END $$;

-- 6. CACHE REFRESH
NOTIFY pgrst, 'reload schema';
COMMENT ON TABLE public.profiles IS 'RLS_FIX_APPLIED_2026_03_20';

SELECT 'RLS POLICIES REPAIRED! 🚀' AS result;
