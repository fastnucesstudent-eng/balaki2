-- ==========================================
-- FINAL DATABASE FIX: COLUMNS, RLS, AND DELETION
-- ==========================================
-- Run this in your Supabase SQL Editor to fix all reported issues.

-- 1. Add missing columns to 'products' table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true;

-- 2. Fix User Deletion (ensure ON DELETE CASCADE is active)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_merchant_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2.5 Fix Order Items dependency (fixes error when deleting merchant with sold products)
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 3. Ensure RLS allows for stock updates (Inventory fix)
-- Enable RLS if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Merchant can manage products
DROP POLICY IF EXISTS "Merchants manage own products" ON public.products;
CREATE POLICY "Merchants manage own products" 
ON public.products FOR ALL 
USING (
  merchant_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  merchant_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Policy: Anyone can view non-deleted products
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" 
ON public.products FOR SELECT 
USING (deleted_at IS NULL);

-- 4. Sync Profiles (Safety check)
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'User'), 'customer'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Paste the code and click 'Run'.
