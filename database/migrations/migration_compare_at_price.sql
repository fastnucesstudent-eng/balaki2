-- Migration: Add compare_at_price to products for discount display
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL;

-- Comment for clarity
COMMENT ON COLUMN products.compare_at_price IS 'The original price before discount/sale. Used to show "Was Rs. X" styling.';
