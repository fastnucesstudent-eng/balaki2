-- ==========================================
-- FRESH START DATABASE SCHEMA: THE ALL-IN-ONE STORE
-- ⚠️ WARNING: THIS WILL RESET YOUR DATABASE. ALL DATA WILL BE LOST.
-- ==========================================

-- 0. Clean up existing relations to avoid "already exists" errors
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_stock(BIGINT, INTEGER) CASCADE;

-- 1. Profiles Table (RBAC)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'merchant', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Products Table
CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  is_returnable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  payment_method TEXT DEFAULT 'fastpay',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Order Items Table
CREATE TABLE public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL
);

-- 5. Stock Management Function
CREATE OR REPLACE FUNCTION decrement_stock(product_id BIGINT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - amount
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Initial Product Data (Expanded Catalog)
INSERT INTO public.products (name, sku, price, image_url, category, stock)
VALUES 
  ('Premium Wireless Headphones', 'HEAD-001', 15500, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'Electronics', 50),
  ('Minimalist Leather Watch', 'WATCH-002', 8500, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 'Accessories', 30),
  ('Ultra-Bright LED Flashlight', 'LIGHT-003', 4200, 'https://images.unsplash.com/photo-1517055727180-60b70c3f5904?w=800&q=80', 'Outdoor', 100),
  ('Ergonomic Gaming Mouse', 'MOUSE-004', 6800, 'https://images.unsplash.com/photo-1527814732934-94b1ec5d0927?w=800&q=80', 'Electronics', 40),
  ('Smart Fitness Tracker', 'FIT-005', 5500, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80', 'Accessories', 75),
  ('Portable Bluetooth Speaker', 'SPK-006', 12000, 'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&q=80', 'Electronics', 25),
  ('Waterproof Hiking Boots', 'BOOT-007', 18500, 'https://images.unsplash.com/photo-1520639889313-72702c18d1f0?w=800&q=80', 'Outdoor', 15),
  ('Compact Travel Pillow', 'PILLOW-008', 2200, 'https://images.unsplash.com/photo-1584305116359-ef81baaf2fd3?w=800&q=80', 'Accessories', 200);

-- 7. Enable Realtime (Optional - Run manually if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
