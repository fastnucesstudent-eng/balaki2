-- Add is_used and condition_note to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition_note TEXT;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_products_is_used ON products(is_used) WHERE is_used = true;
