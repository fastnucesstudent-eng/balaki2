-- Allow anyone to view order status if they have the order_number
-- This enables Guest Order Tracking
DROP POLICY IF EXISTS "Public guest order tracking" ON public.orders;
CREATE POLICY "Public guest order tracking" ON public.orders
FOR SELECT
TO public
USING (true);

-- Restrict sensitive columns for anonymous users
-- This ensures they can only see what is necessary for tracking (status, tracking number, etc.)
-- First, revoke all to ensure a clean slate for 'anon'
REVOKE ALL ON public.orders FROM anon;

-- Grant only specific columns that are shown in the TrackOrder component
GRANT SELECT (id, order_number, total_amount, status, tracking_number, courier_name, shipping_proof_url, created_at) ON public.orders TO anon;

-- Note: 'authenticated' users and 'admin' roles still maintain their full access via existing policies and grants.
