-- Migration: Add Free Delivery flag to products
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_free_delivery BOOLEAN DEFAULT false;

-- Inform the schema about the new column
COMMENT ON COLUMN public.products.is_free_delivery IS 'Flag to indicate if the product has free delivery';
