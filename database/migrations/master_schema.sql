-- ====================================================================
-- TARZIFY MASTER SCHEMA v1.1
-- 🚀 Definitive, Conflict-Free, and Recursion-Safe
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'merchant', 'customer')),
  phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  compare_at_price DECIMAL(12,2),
  image_url TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  description TEXT,
  is_returnable BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  customer_name TEXT,
  tracking_number TEXT,
  courier_name TEXT,
  shipping_proof_url TEXT,
  payment_method TEXT DEFAULT 'fastpay',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items (Persistent Cart)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Migrations (safe to re-run)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill missing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;


-- 3. FUNCTIONS
-- Admin Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Order Access Check
CREATE OR REPLACE FUNCTION public.check_order_access(o_id bigint, u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = o_id AND p.merchant_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profile view Check for Merchants
CREATE OR REPLACE FUNCTION public.can_merchant_view_profile(p_id uuid, m_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON o.id = oi.order_id
    JOIN public.products p ON oi.product_id = p.id
    WHERE o.user_id = p_id AND p.merchant_id = m_id
  ) OR EXISTS (
    SELECT 1 FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = p_id AND p.merchant_id = m_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Policies
-- Profiles
DROP POLICY IF EXISTS "Profiles self-access" ON public.profiles;
CREATE POLICY "Profiles self-access" ON public.profiles FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin/Merchant view access" ON public.profiles;
CREATE POLICY "Admin/Merchant view access" ON public.profiles FOR SELECT USING (
  public.is_admin() OR public.can_merchant_view_profile(id, auth.uid())
);

-- Products
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Merchants manage own products" ON public.products;
CREATE POLICY "Merchants manage own products" ON public.products FOR ALL USING (
  merchant_id = auth.uid() OR public.is_admin()
);

-- Orders
DROP POLICY IF EXISTS "Orders insertion" ON public.orders;
CREATE POLICY "Orders insertion" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Orders visibility" ON public.orders;
CREATE POLICY "Orders visibility" ON public.orders FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin() OR public.check_order_access(id, auth.uid())
);

DROP POLICY IF EXISTS "Orders management" ON public.orders;
CREATE POLICY "Orders management" ON public.orders FOR UPDATE USING (
  public.is_admin() OR public.check_order_access(id, auth.uid())
);

-- Order Items
DROP POLICY IF EXISTS "Order items visibility" ON public.order_items;
CREATE POLICY "Order items visibility" ON public.order_items FOR SELECT USING (true);

-- Reviews
DROP POLICY IF EXISTS "Reviews visibility" ON public.reviews;
CREATE POLICY "Reviews visibility" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own reviews" ON public.reviews;
CREATE POLICY "Users can manage own reviews" ON public.reviews FOR ALL USING (user_id = auth.uid());

-- Categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Cart Items
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items 
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all carts" ON public.cart_items;
CREATE POLICY "Admins view all carts" ON public.cart_items 
  FOR SELECT USING (public.is_admin());

-- 5. TRIGGERS
-- New User Handle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'customer')
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Cart Update Trigger
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- 7. SEED DATA
-- Default Categories
INSERT INTO public.categories (name) VALUES 
  ('Men''s Clothing'), ('Women''s Clothing'), ('Kids Clothing'), ('Sportswear'), ('Winter Wear'), ('Formal Wear'),
  ('Smartphones'), ('Laptops & PCs'), ('Audio & Headphones'), ('Gaming'), ('Cameras'), ('Accessories & Cables'),
  ('Skincare'), ('Haircare'), ('Fragrances'), ('Vitamins & Supplements'),
  ('Home Decor'), ('Kitchen'), ('Bedding'), ('Lighting'),
  ('Fitness Equipment'), ('Outdoor & Camping'), ('Cycling'),
  ('Toys & Games'), ('Books & Stationery')
ON CONFLICT (name) DO NOTHING;

-- Role Assignments
-- Admin: l243071@lhr.nu.edu.pk
UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'l243071@lhr.nu.edu.pk');

-- Merchant: malikabdullah1786@gmail.com
UPDATE public.profiles SET role = 'merchant' WHERE id IN (SELECT id FROM auth.users WHERE email = 'malikabdullah1786@gmail.com');
