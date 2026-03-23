-- Enable Row Level Security (if not already enabled)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.products;

-- Create a new policy that allows everyone (even guest users) to read products
CREATE POLICY "Allow public read-only access"
ON public.products
FOR SELECT
TO public
USING (true);

-- Ensure authenticated users can still insert/update their own (if role permits)
-- Insert policy is already handled in migration_final_check.sql
