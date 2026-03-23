-- ==========================================
-- FIX: Supabase "Database error deleting user"
-- ==========================================
-- This script adds "ON DELETE CASCADE" to foreign key constraints 
-- that are currently blocking user deletion in Supabase Auth.

-- 1. Update Products (fixes error if merchant has products)
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_merchant_id_fkey;

ALTER TABLE public.products
ADD CONSTRAINT products_merchant_id_fkey 
FOREIGN KEY (merchant_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 2. Update Orders (fixes error if customer has orders)
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. Update Profiles (Ensure consistency)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Go to your Supabase Dashboard -> SQL Editor.
-- 3. Create a 'New Query', paste the script, and click 'Run'.
