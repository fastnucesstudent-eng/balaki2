-- Add order_number column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- Index for faster lookup by order_number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Optional: backfill existing orders (simple strategy)
UPDATE public.orders 
SET order_number = 'OLD-' || id::TEXT 
WHERE order_number IS NULL;
