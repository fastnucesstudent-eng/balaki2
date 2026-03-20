-- ATOMIC_RELATION_REPAIR.sql
-- Run this in Supabase SQL Editor to PERMANENTLY fix the ambiguity error.
-- This script nukes all existing relationships between orders and profiles
-- and recreates the one and only correct one.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting atomic relationship repair...';

    -- 1. DROP ALL existing foreign keys from 'orders' to 'profiles'
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'orders' 
          AND ccu.table_name = 'profiles'
    ) LOOP
        RAISE NOTICE 'Dropping constraint: % from table: %', r.constraint_name, r.table_name;
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;

    -- 2. DROP ALL existing foreign keys from 'order_items' to 'profiles' (if any)
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'order_items' 
          AND ccu.table_name = 'profiles'
    ) LOOP
        RAISE NOTICE 'Dropping redundant order_item constraint: %', r.constraint_name;
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;

    -- 3. RECREATE the correct relationship on user_id
    RAISE NOTICE 'Restoring correct relationship on orders(user_id) -> profiles(id)...';
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'Relationship repair complete.';
END $$;

-- 4. Ensure the check_order_access function is robust
CREATE OR REPLACE FUNCTION public.check_order_access(order_id_raw ANYELEMENT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id::text = order_id_raw::text
    AND p.merchant_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-apply the RLS policy for orders
DROP POLICY IF EXISTS "Merchants view assigned orders" ON public.orders;
CREATE POLICY "Merchants view assigned orders" ON public.orders
FOR SELECT USING (
  public.check_order_access(id) OR public.is_admin()
);

-- 6. Success Check - Should show exactly one row for 'orders' linking to 'profiles'
SELECT 
    kcu.constraint_name, 
    kcu.table_name, 
    kcu.column_name,
    ccu.table_name AS referenced_table
FROM information_schema.key_column_usage AS kcu
JOIN information_schema.constraint_column_usage AS ccu ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'orders' AND ccu.table_name = 'profiles';
