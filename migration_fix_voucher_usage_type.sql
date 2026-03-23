-- Migration to fix voucher_usage order_id type mismatch
-- The orders table uses BIGSERIAL (BIGINT) for the primary key, but voucher_usage was using UUID.

-- 1. Drop the existing column if it exists with wrong type
ALTER TABLE public.voucher_usage DROP COLUMN IF EXISTS order_id;

-- 2. Add it back as BIGINT to match orders.id
ALTER TABLE public.voucher_usage ADD COLUMN order_id BIGINT;

-- 3. (Optional) Add foreign key constraint if you want strict referential integrity
-- ALTER TABLE public.voucher_usage ADD CONSTRAINT fk_voucher_usage_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
