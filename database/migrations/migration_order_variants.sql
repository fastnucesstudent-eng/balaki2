-- Migration: Add variant support to Cart and Orders
-- =================================================

-- 1. Update order_items to store variant info
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_combo JSONB;

-- 2. Update cart_items to store variant info
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS variant_combo JSONB;

-- 3. Update cart_items unique constraint
-- We need to allow the same user to have the same product but with DIFFERENT variants
ALTER TABLE public.cart_items 
DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- Create a new unique index that includes variant_combo
-- Note: In Postgres, NULL in an index means 'not unique', but since we want to handle
-- products with NO variants too, we use COALESCE or a separate partial index if needed.
-- For simplicity, we'll use a combined unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_variant 
ON public.cart_items (user_id, product_id, COALESCE(variant_combo, '{}'::jsonb));
