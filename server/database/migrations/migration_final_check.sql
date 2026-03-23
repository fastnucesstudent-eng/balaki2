-- ============================================================================
-- FINAL VERIFICATION MIGRATION
-- Run this script to ensure your database has all the latest columns required
-- by the Merchant Dashboard and Checkout Flow.
-- ============================================================================

-- 1. Add 'merchant_id' to products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'merchant_id'
    ) THEN
        ALTER TABLE public.products ADD COLUMN merchant_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Add 'is_returnable' to products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'is_returnable'
    ) THEN
        ALTER TABLE public.products ADD COLUMN is_returnable BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Add 'shipping_address' to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_address TEXT;
    END IF;
END $$;

-- 4. Add 'phone' to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 5. Add 'payment_method' to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'fastpay';
    END IF;
END $$;

-- 6. Ensure RLS policies exist (Basic check)
-- This allows authenticated users (merchants) to insert products
CREATE POLICY "Enable insert for authenticated users only" ON "public"."products"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- This allows users to see their own orders
CREATE POLICY "Enable read for users based on user_id" ON "public"."orders"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() IN (SELECT merchant_id FROM products WHERE id IN (SELECT product_id FROM order_items WHERE order_id = orders.id)));
-- 7. Add 'order_number' if it doesn't exist (Unique)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'order_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN order_number TEXT UNIQUE;
    END IF;
END $$;

-- 8. Add 'tracking_number' to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'tracking_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN tracking_number TEXT;
    END IF;
END $$;

-- 9. Add 'courier_name' to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'courier_name'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN courier_name TEXT;
    END IF;
END $$;
