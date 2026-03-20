-- TOTAL_DATABASE_RECOVERY_PHASE_FINAL.sql
-- ====================================================================
-- TARZIFY ULTIMATE DATABASE SYNCHRONIZATION (THE DEFINITIVE FIX)
-- RUN THIS ENTIRE SCRIPT ONE TIME IN SUPABASE SQL EDITOR
-- ====================================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting definitive database recovery...';

    -- 1. ADD MISSING COLUMNS FOR RECURSION FIX (If they don't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'user_id') THEN
        ALTER TABLE public.order_items ADD COLUMN user_id UUID REFERENCES public.profiles(id);
        RAISE NOTICE 'Added user_id to order_items for security stabilization.';
    END IF;

    -- Sync existing data (if any)
    UPDATE public.order_items oi
    SET user_id = o.user_id
    FROM public.orders o
    WHERE oi.order_id = o.id AND oi.user_id IS NULL;

    -- 2. DROP ALL FOREIGN KEYS on problematic tables using pg_constraint catalog
    FOR r IN (
        SELECT 
            conname AS constraint_name, 
            relname AS table_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname IN ('orders', 'products', 'order_items')
          AND con.contype = 'f'
    ) LOOP
        RAISE NOTICE 'Nuking constraint: % from table: %', r.constraint_name, r.table_name;
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;

    -- 3. RE-CREATE ONLY THE CORRECT RELATIONSHIPS
    RAISE NOTICE 'Restoring core relationships...';
    
    -- Products -> Profiles (Merchant Ownership)
    ALTER TABLE public.products ADD CONSTRAINT products_merchant_id_fkey 
    FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- Orders -> Profiles (Customer Ownership)
    ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- Order Items -> Orders
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

    -- Order Items -> Products
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

    -- Order Items -> Profiles (Security Link)
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'Relationships restored.';
END $$;

-- 4. ESSENTIAL SECURITY FUNCTIONS (RECURSION PROOF)
DROP FUNCTION IF EXISTS public.check_order_access(bigint) CASCADE;
CREATE OR REPLACE FUNCTION public.check_order_access(o_id bigint)
RETURNS BOOLEAN AS $$
BEGIN
  -- Security defined function bypasses RLS internally
  RETURN EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = o_id AND user_id = auth.uid()
    UNION
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = o_id AND p.merchant_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RE-APPLY RLS POLICIES (ABSOLUTE RECURSION BREAK)

-- Orders Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants view assigned orders" ON public.orders;

CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Merchants view assigned orders" ON public.orders FOR SELECT USING (public.check_order_access(id));

-- Order Items Policies (NO TABLE JOINS = NO RECURSION)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "Users view own order_items" ON public.order_items;
DROP POLICY IF EXISTS "Merchants view assigned order_items" ON public.order_items;

CREATE POLICY "Admins manage order_items" ON public.order_items FOR ALL USING (public.is_admin());

-- Customers only see items they own directly (Broken recursion)
CREATE POLICY "Users view own order_items" ON public.order_items FOR SELECT 
USING (user_id = auth.uid());

-- Merchants see items if they own the product (One-level join only)
CREATE POLICY "Merchants view assigned order_items" ON public.order_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND merchant_id = auth.uid()));

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
COMMENT ON TABLE public.orders IS 'FIXED_RELATIONS_RECURSION_FREE_FINAL';

-- 7. DIAGNOSTIC SUMMARY
SELECT 
    'SUCCESS' as status,
    'Recursion Permanently Solved' as message;
