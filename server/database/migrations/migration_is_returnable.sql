-- Migration: Add is_returnable to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true;
