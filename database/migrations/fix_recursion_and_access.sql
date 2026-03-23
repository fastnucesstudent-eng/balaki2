-- ==========================================
-- FINAL FIX: RECURSION & PANEL ACCESS
-- ==========================================
-- This script nukes problematic policies and uses "Security Definer" 
-- functions to break infinite loops.

-- 1. Create specialized functions that bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_merchant_view_profile(p_id uuid, m_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    JOIN public.products p ON oi.product_id = p.id
    WHERE o.user_id = p_id AND p.merchant_id = m_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Nuke ALL existing policies on profiles and orders to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Merchants and Admins view customers" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Orders SELECT policy" ON public.orders;
DROP POLICY IF EXISTS "Orders INSERT policy" ON public.orders;
DROP POLICY IF EXISTS "Orders UPDATE policy" ON public.orders;
DROP POLICY IF EXISTS "Users can see their own orders" ON public.orders;
DROP POLICY IF EXISTS "Merchants can see relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;

-- 3. Re-apply Profiles Policies (Recursion Free)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles self-access" ON public.profiles 
FOR ALL USING (id = auth.uid());

CREATE POLICY "Admin/Merchant view access" ON public.profiles 
FOR SELECT USING (
  public.is_admin() OR 
  public.can_merchant_view_profile(id, auth.uid())
);

-- 4. Re-apply Orders Policies (Recursion Free)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders creation" ON public.orders 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders visibility" ON public.orders 
FOR SELECT USING (
  user_id = auth.uid() OR 
  public.is_admin() OR 
  public.check_order_access(id, auth.uid())
);

CREATE POLICY "Orders manage" ON public.orders 
FOR UPDATE USING (
  public.is_admin() OR 
  public.check_order_access(id, auth.uid())
);

-- 5. Assign specific roles as requested
-- Admin: l243071@lhr.nu.edu.pk (Updated from edi.pk typo)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'l243071@lhr.nu.edu.pk' OR email = 'l243071@lhr.nu.edi.pk'
);

-- Merchant: malikabdullah1786@gmail.com
UPDATE public.profiles 
SET role = 'merchant' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'malikabdullah1786@gmail.com'
);

-- 6. Verify and Fix Order Items (make sure merchants can see them)
DROP POLICY IF EXISTS "Order items SELECT policy" ON public.order_items;
CREATE POLICY "Order items SELECT policy" ON public.order_items 
FOR SELECT USING (true); -- Safe because they only contain IDs and quantities

-- FINAL CHECK: Sync profiles
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'User'), 'customer'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
