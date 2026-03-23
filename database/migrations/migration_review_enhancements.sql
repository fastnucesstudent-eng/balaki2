-- Migration: Review System Enhancements (Idempotent)
-- 1. Add order_id to link reviews specifically to an order
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE;

-- 2. Add image_urls to support multiple photos in reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 3. Drop existing uniqueness constraint (product_id, user_id)
-- This allows a user to review the same product if they buy it again in a different order.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_id_user_id_key') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_product_id_user_id_key;
    END IF;
END $$;

-- 4. Add new uniqueness constraint (product_id, order_id)
-- Using a DO block to make it idempotent (no error if it already exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_id_order_id_key') THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_product_id_order_id_key UNIQUE (product_id, order_id);
    END IF;
END $$;
