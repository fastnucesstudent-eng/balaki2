-- Migration: Fix Cart Unique Constraint for Variants
-- This will allow multiple items with different variants for the same product.

-- 1. Ensure variant_combo exists and is NOT NULL
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS variant_combo JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Drop any previous indexes or constraints that could conflict
DROP INDEX IF EXISTS public.idx_cart_items_user_product_variant;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_variant_unique;

-- 3. Add the proper composite unique constraint
ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_user_product_variant_unique 
UNIQUE(user_id, product_id, variant_combo);
