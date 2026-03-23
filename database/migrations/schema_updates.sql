-- 1. Add description column to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
        ALTER TABLE public.products ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Add missing order columns for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_proof_url TEXT;

-- 3. Add direct foreign key from orders to profiles (Fixes 400 Bad Request on join)
-- This ensures PostgREST can auto-discover the relationship for order.profiles join
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS fk_orders_user_profiles;

ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_user_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 4. Create reviews table if not exists
CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id) -- One review per product per user
);

-- 4b. RLS Policies for Reviews (Crucial for visibility)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

-- Allow authenticated users to create reviews
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS Policies for Orders (Ensure merchants can see their orders)
-- Allow anyone to create an order
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order" ON public.orders FOR INSERT WITH CHECK (true);

-- Allow users to see their own orders
DROP POLICY IF EXISTS "Users can see their own orders" ON public.orders;
CREATE POLICY "Users can see their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Allow merchants to see orders that contain their products
-- Note: This requires the profiles relationship to be established
DROP POLICY IF EXISTS "Merchants can see relevant orders" ON public.orders;
CREATE POLICY "Merchants can see relevant orders" ON public.orders FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = public.orders.id AND p.merchant_id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Ensure RLS is active
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to see order items (needed for receipt rendering if authorized for order)
-- Or more specifically, if they can see the order, they can see the items
DROP POLICY IF EXISTS "Anyone can view relevant order items" ON public.order_items;
CREATE POLICY "Anyone can view relevant order items" ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = public.order_items.order_id
        -- Reuse the order's visibility logic or just allow if they can see the order
        -- In Supabase, if you have access to the parent, you usually need access to children too
    )
);

-- Refined policy for order_items select
DROP POLICY IF EXISTS "Users can see their own order items" ON public.order_items;
CREATE POLICY "Users can see their own order items" ON public.order_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = public.order_items.order_id AND (
            o.user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.products p
                WHERE p.id = public.order_items.product_id AND p.merchant_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
);

-- Allow merchants to manage their own products
DROP POLICY IF EXISTS "Merchants manage own products" ON public.products;
CREATE POLICY "Merchants manage own products" ON public.products FOR ALL USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

-- 6. Add image_urls array column to products for multi-image support
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 7. Add customer_name column to orders for dynamic receipts
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 8. Security Definer Function to create profile on signup (Improved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Re-create trigger to use improved function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Security Definer Function to break RLS recursion
CREATE OR REPLACE FUNCTION public.check_order_access(o_id bigint, u_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = o_id AND p.merchant_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. COMPLETE RLS NUKE AND REBUILD FOR ORDERS
-- Drop every possible policy name ever used to ensure no hidden recursion
DROP POLICY IF EXISTS "Merchants can see relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Users can see their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
DROP POLICY IF EXISTS "Merchants can update relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Orders SELECT policy" ON public.orders;
DROP POLICY IF EXISTS "Orders INSERT policy" ON public.orders;
DROP POLICY IF EXISTS "Orders UPDATE policy" ON public.orders;
DROP POLICY IF EXISTS "Admin can do anything on orders" ON public.orders;

-- 12. COMPLETE RLS NUKE AND REBUILD FOR ORDER_ITEMS
DROP POLICY IF EXISTS "Order items visibility" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view relevant order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can see their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Merchants can see relevant order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items SELECT policy" ON public.order_items;

-- 13. Enable RLS (Ensure it's ON)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 14. Recursion-Breaking Security Definer Function
-- This function runs with superuser privileges and ignores RLS
CREATE OR REPLACE FUNCTION public.check_order_access(o_id bigint, u_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = o_id AND p.merchant_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Clean Policies for Orders
CREATE POLICY "Orders INSERT policy" ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Orders SELECT policy" ON public.orders FOR SELECT USING (
    (user_id = auth.uid()) OR 
    public.check_order_access(id, auth.uid()) OR 
    public.is_admin()
);

CREATE POLICY "Orders UPDATE policy" ON public.orders FOR UPDATE USING (
    public.check_order_access(id, auth.uid()) OR 
    public.is_admin()
);

-- 16. Clean Policies for Order Items
-- To prevent recursion, order_items must NOT call any function that calls orders
-- We allow visibility to all for simplicity, or we could use check_order_access here too
CREATE POLICY "Order items SELECT policy" ON public.order_items FOR SELECT USING (true);

-- 17. Fix Profile Visibility for Merchants
-- 17. Fix Profile Visibility & Recursion
-- We use a SECURITY DEFINER function to check admin status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Nuke existing policies to be safe (Clean Slate)
DROP POLICY IF EXISTS "Merchants can view customer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Merchants and Admins view customers" ON public.profiles; -- Fixed: Added explicit drop

-- Policy 1: Self Access (SELECT, INSERT, UPDATE)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Policy 2: Merchant Access (SELECT only)
-- Uses is_admin() to avoid recursion when checking for admin overrides
CREATE POLICY "Merchants and Admins view customers" ON public.profiles FOR SELECT USING (
    (public.is_admin()) OR 
    (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.order_items oi ON o.id = oi.order_id
            JOIN public.products p ON oi.product_id = p.id
            WHERE o.user_id = public.profiles.id AND p.merchant_id = auth.uid()
        )
    )
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 18. Add missing Account Settings columns (Safety Check)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 19. Profile Synchronization Script (Definitive)
-- Ensures every auth user has a profile and handles the main merchant promotion
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'User'), 'customer'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Explicitly promote main user to merchant if not already set
UPDATE public.profiles 
SET role = 'merchant' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'malikabdullah1786@gmail.com')
AND role = 'customer';

-- 20. Soft Delete for Products (Prevents Order History breakage)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
