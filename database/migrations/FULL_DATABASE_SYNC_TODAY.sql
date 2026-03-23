-- ====================================================================
-- TARZIFY FULL DATABASE SYNC (TODAY'S FINAL STATE)
-- 🚀 Comprehensive Schema with Marketplace & Admin Extensions
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES & COLUMNS
-- Profiles (Core + Merchant Expansion)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'merchant', 'customer')),
  phone TEXT,
  merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused')),
  store_name TEXT,
  store_slug TEXT,
  business_address TEXT,
  ntn TEXT,
  bank_account TEXT,
  bank_title TEXT,
  bank_branch_code TEXT,
  logo_url TEXT,
  qr_code_url TEXT,
  contact_number TEXT,
  merchant_categories TEXT[] DEFAULT '{}',
  rejection_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub Categories (Merchant Owned)
CREATE TABLE IF NOT EXISTS public.sub_categories (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, name)
);

-- Products (with redirect fkey to profiles)
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  is_free_delivery BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (with email column & redirect fkey)
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
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
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Cart Items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 3. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- 4. RLS ENABLING
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 5. FINAL FIXES (Columns & Constraints)
-- Ensure expansion columns exist for existing tables
DO $$ 
BEGIN
  -- Profiles
  BEGIN ALTER TABLE public.profiles ADD COLUMN merchant_status TEXT DEFAULT 'pending' CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused')); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN store_name TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN store_slug TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN business_address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN ntn TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN bank_account TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.profiles ADD COLUMN bank_title TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  
  -- Orders
  BEGIN ALTER TABLE public.orders ADD COLUMN email TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  
  -- Products
  BEGIN ALTER TABLE public.products ADD COLUMN is_free_delivery BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_store_slug ON public.profiles(store_slug) WHERE store_slug IS NOT NULL;

-- 7. NOTIFY PostgREST
COMMENT ON TABLE public.profiles IS 'FULL_SYNC_2026_03_20';
COMMENT ON TABLE public.products IS 'FULL_SYNC_2026_03_20';

SELECT 'DATABASE FULLY SYNCHRONIZED! 🚀' AS result;
