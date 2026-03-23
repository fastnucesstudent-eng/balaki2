-- Add sale_percentage and is_free_delivery to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_percentage DECIMAL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_free_delivery BOOLEAN DEFAULT false;

-- Re-enable realtime for products to ensure these columns are included (idempotent)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
