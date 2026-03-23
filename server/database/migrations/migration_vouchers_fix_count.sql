-- Ensure used_count defaults to 0 and is NOT NULL
ALTER TABLE public.vouchers 
ALTER COLUMN used_count SET DEFAULT 0,
ALTER COLUMN used_count SET NOT NULL;

-- Repair existing NULL values if any
UPDATE public.vouchers SET used_count = 0 WHERE used_count IS NULL;
