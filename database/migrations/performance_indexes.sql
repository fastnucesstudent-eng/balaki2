-- ==========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Run these in your Supabase SQL Editor to speed up database queries.
-- ==========================================

-- 1. Speed up filtering for active (non-deleted) products
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at) WHERE deleted_at IS NULL;

-- 2. Speed up product lookup by ID (Primary key is indexed by default, but this helps in some complex joins)
CREATE INDEX IF NOT EXISTS idx_products_id ON public.products(id);

-- 3. Speed up review lookups for products
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- 4. Speed up merchant-specific product queries
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products(merchant_id);

-- 5. Speed up order lookups by user (Customer history)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 6. Speed up order item lookups by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
