-- Add image_urls column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Update existing rows to have the single image_url in the new array (optional fallback)
UPDATE public.products SET image_urls = ARRAY[image_url] WHERE image_urls IS NULL OR image_urls = '{}';
