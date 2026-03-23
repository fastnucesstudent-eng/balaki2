-- SEO Fields Migration for Tarzify Products Table
-- Run this in your Supabase SQL Editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Backfill slugs: name-based slug + product id to guarantee uniqueness
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
        || '-' || id::TEXT
WHERE slug IS NULL AND deleted_at IS NULL;

-- Create unique index AFTER backfill so there are no conflicts
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products (slug) WHERE slug IS NOT NULL AND deleted_at IS NULL;
