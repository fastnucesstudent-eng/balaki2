-- ====================================================================
--  BALAKI ORGANIC — COMPLETE FINAL DATABASE SCHEMA v3.0
--  ?? Supabase / PostgreSQL
--  ? Paste this ENTIRE file into Supabase SQL Editor and click RUN
--  ? Safe to run on a FRESH or EXISTING database (uses IF NOT EXISTS)
-- ====================================================================

-- ============================================================
-- SECTION 0 — EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECTION 1 — PROFILES  (User Accounts & Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT        UNIQUE,
  role        TEXT        DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'merchant')),
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  store_name  TEXT,
  store_slug  TEXT        UNIQUE,
  logo_url    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 2 — CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.categories (name, description) VALUES
  ('Organic Honey & Sweets',  '100% Pure, Raw & Unfiltered Honey'),
  ('Natural Oils & Ghee',     'Cold-Pressed Oils & Desi Ghee'),
  ('Herbal Teas & Infusions', 'Natural Wellness & Herbal Blends'),
  ('Organic Spices & Herbs',  'Farm-Fresh Whole & Ground Spices'),
  ('Dry Fruits & Grains',     'Organic Nuts, Seeds & Superfoods'),
  ('Natural Skincare',        'Chemical-Free Herbal Skincare')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SECTION 3 — PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id                   BIGSERIAL     PRIMARY KEY,
  name                 TEXT          NOT NULL,
  sku                  TEXT          UNIQUE NOT NULL,
  price                DECIMAL(12,2) NOT NULL,
  compare_at_price     DECIMAL(12,2),
  image_url            TEXT          NOT NULL,
  image_urls           TEXT[]        DEFAULT '{}',
  category             TEXT          NOT NULL,
  stock                INTEGER       DEFAULT 0,
  description          TEXT,
  badge_text           TEXT          DEFAULT '100% Organic',
  is_organic_certified BOOLEAN       DEFAULT true,
  is_free_delivery     BOOLEAN       DEFAULT false,
  is_returnable        BOOLEAN       DEFAULT true,
  is_used              BOOLEAN       DEFAULT false,
  condition_note       TEXT,
  rating               DECIMAL(3,2)  DEFAULT 4.8,
  alt_text             TEXT,
  seo_title            TEXT,
  meta_description     TEXT,
  slug                 TEXT,
  tags                 TEXT[],
  dynamic_attributes   JSONB         DEFAULT '{}'::jsonb,
  pricing_matrix       JSONB         DEFAULT '[]'::jsonb,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category   ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku        ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

-- ============================================================
-- SECTION 4 — ORDERS  (Guest + Registered)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                 BIGSERIAL     PRIMARY KEY,
  user_id            UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number       TEXT          UNIQUE NOT NULL,
  customer_name      TEXT          NOT NULL,
  customer_email     TEXT          NOT NULL,
  email              TEXT,
  phone              TEXT          NOT NULL,
  shipping_address   TEXT          NOT NULL,
  city               TEXT,
  total_amount       DECIMAL(12,2) NOT NULL,
  subtotal           DECIMAL(12,2) DEFAULT 0,
  shipping_amount    DECIMAL(12,2) DEFAULT 0,
  discount_amount    DECIMAL(12,2) DEFAULT 0,
  voucher_id         BIGINT,
  status             TEXT          DEFAULT 'pending'
                                   CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_method     TEXT          DEFAULT 'cod',
  payment_status     TEXT          DEFAULT 'unpaid',
  courier_name       TEXT,
  tracking_number    TEXT,
  shipping_proof_url TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id        ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number   ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone          ON public.orders(phone);

-- ============================================================
-- SECTION 5 — ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id            BIGSERIAL     PRIMARY KEY,
  order_id      BIGINT        REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    BIGINT        REFERENCES public.products(id) ON DELETE SET NULL,
  quantity      INTEGER       NOT NULL,
  price         DECIMAL(12,2) NOT NULL,
  variant_combo JSONB         DEFAULT '{}'::jsonb,
  combination   JSONB         DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================
-- SECTION 6 — VOUCHERS / PROMO CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vouchers (
  id                 BIGSERIAL     PRIMARY KEY,
  code               TEXT          UNIQUE NOT NULL,
  discount_type      TEXT          DEFAULT 'percentage'
                                   CHECK (discount_type IN ('percentage','fixed')),
  type               TEXT          DEFAULT 'percentage'
                                   CHECK (type IN ('percentage','fixed')),
  discount_value     DECIMAL(12,2) NOT NULL DEFAULT 0,
  value              DECIMAL(12,2) DEFAULT 0,
  min_spend          DECIMAL(12,2) DEFAULT 0,
  max_discount       DECIMAL(12,2),
  usage_limit        INTEGER       DEFAULT 100,
  used_count         INTEGER       DEFAULT 0,
  per_user_limit     INTEGER       DEFAULT 1,
  is_active          BOOLEAN       DEFAULT true,
  target_customer_id UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  expiry_date        TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   DEFAULT NOW()
);

-- Link orders -> vouchers (safe if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_voucher_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_voucher_id_fkey
      FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- SECTION 7 — VOUCHER USAGE  (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id             BIGSERIAL   PRIMARY KEY,
  voucher_id     BIGINT      REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  order_id       BIGINT      REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 8 — REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id            BIGSERIAL     PRIMARY KEY,
  product_id    BIGINT        REFERENCES public.products(id) ON DELETE CASCADE,
  user_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id      BIGINT        REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  rating        INTEGER       NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  image_url     TEXT,
  image_urls    TEXT[]        DEFAULT '{}',
  is_verified   BOOLEAN       DEFAULT false,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id    ON public.reviews(user_id);

-- ============================================================
-- SECTION 9 — BANNERS / PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id            BIGSERIAL   PRIMARY KEY,
  title         TEXT        NOT NULL,
  subtitle      TEXT,
  image_url     TEXT        NOT NULL,
  link          TEXT        DEFAULT '#catalog',
  link_url      TEXT,
  is_active     BOOLEAN     DEFAULT true,
  display_order INTEGER     DEFAULT 0,
  start_at      TIMESTAMPTZ DEFAULT NOW(),
  end_at        TIMESTAMPTZ,
  status        TEXT        DEFAULT 'approved',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 10 — ARTICLES  (Blog / SEO)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id         BIGSERIAL   PRIMARY KEY,
  title      TEXT        NOT NULL,
  slug       TEXT,
  excerpt    TEXT,
  content    TEXT,
  image_url  TEXT,
  status     TEXT        DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 11 — CART ITEMS  (Live Customer Carts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id    BIGINT      REFERENCES public.products(id) ON DELETE CASCADE,
  quantity      INTEGER     DEFAULT 1,
  variant_combo JSONB       DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 12 — STORE FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_follows (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_id)
);

-- ============================================================
-- SECTION 13 — FUNCTIONS & TRIGGERS
-- ============================================================

-- is_admin(): SECURITY DEFINER prevents infinite RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- get_order_status(): Guest-accessible order lookup (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_number TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id',                 o.id,
    'order_number',       o.order_number,
    'status',             o.status,
    'customer_name',      o.customer_name,
    'total_amount',       o.total_amount,
    'created_at',         o.created_at,
    'courier_name',       o.courier_name,
    'tracking_number',    o.tracking_number,
    'shipping_proof_url', o.shipping_proof_url,
    'order_items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',       oi.id,
          'quantity', oi.quantity,
          'price',    oi.price,
          'products', (
            SELECT jsonb_build_object('name', p.name, 'image_url', p.image_url)
            FROM public.products p WHERE p.id = oi.product_id
          )
        )
      )
      FROM public.order_items oi WHERE oi.order_id = o.id
    )
  ) INTO v_result
  FROM public.orders o
  WHERE UPPER(o.order_number) = UPPER(p_order_number);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- handle_new_user_profile(): Auto-profile + guest order linking on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  UPDATE public.orders
  SET user_id = NEW.id
  WHERE LOWER(customer_email) = LOWER(NEW.email)
    AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================
-- SECTION 14 — SET ADMIN USERS
-- ============================================================
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE 'malikabdullah1786@gmail.com'
   OR email ILIKE 'themalikabdullahofficial@gmail.com';

-- ============================================================
-- SECTION 15 — ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_select"       ON public.profiles FOR SELECT                  USING (true);
CREATE POLICY "profiles_insert_self"  ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self"  ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (public.is_admin());

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select"    ON public.categories;
DROP POLICY IF EXISTS "categories_all_admin" ON public.categories;
CREATE POLICY "categories_select"    ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_all_admin" ON public.categories FOR ALL    USING (public.is_admin());

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select"    ON public.products;
DROP POLICY IF EXISTS "products_all_admin" ON public.products;
CREATE POLICY "products_select"    ON public.products FOR SELECT USING (deleted_at IS NULL OR public.is_admin());
CREATE POLICY "products_all_admin" ON public.products FOR ALL    USING (public.is_admin());

-- ORDERS (PUBLIC SELECT needed for guest order tracking)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_public" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_anyone" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin"  ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin"  ON public.orders;
CREATE POLICY "orders_select_public" ON public.orders FOR SELECT                  USING (true);
CREATE POLICY "orders_insert_anyone" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_admin"  ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "orders_delete_admin"  ON public.orders FOR DELETE USING (public.is_admin());

-- ORDER ITEMS (PUBLIC SELECT needed for guest order tracking)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_select_public" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_anyone" ON public.order_items;
DROP POLICY IF EXISTS "order_items_all_admin"     ON public.order_items;
CREATE POLICY "order_items_select_public" ON public.order_items FOR SELECT                  USING (true);
CREATE POLICY "order_items_insert_anyone" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_all_admin"     ON public.order_items FOR ALL    USING (public.is_admin());

-- VOUCHERS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vouchers_select"    ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_all_admin" ON public.vouchers;
CREATE POLICY "vouchers_select"    ON public.vouchers FOR SELECT USING (true);
CREATE POLICY "vouchers_all_admin" ON public.vouchers FOR ALL    USING (public.is_admin());

-- VOUCHER USAGE
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voucher_usage_select" ON public.voucher_usage;
DROP POLICY IF EXISTS "voucher_usage_insert" ON public.voucher_usage;
CREATE POLICY "voucher_usage_select" ON public.voucher_usage FOR SELECT                  USING (true);
CREATE POLICY "voucher_usage_insert" ON public.voucher_usage FOR INSERT WITH CHECK (true);

-- REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select"       ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_anyone" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_admin" ON public.reviews;
CREATE POLICY "reviews_select"        ON public.reviews FOR SELECT                  USING (true);
CREATE POLICY "reviews_insert_anyone" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_update_own"    ON public.reviews FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "reviews_delete_admin"  ON public.reviews FOR DELETE USING (public.is_admin());

-- BANNERS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banners_select"    ON public.banners;
DROP POLICY IF EXISTS "banners_all_admin" ON public.banners;
CREATE POLICY "banners_select"    ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners_all_admin" ON public.banners FOR ALL    USING (public.is_admin());

-- ARTICLES
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "articles_select"    ON public.articles;
DROP POLICY IF EXISTS "articles_all_admin" ON public.articles;
CREATE POLICY "articles_select"    ON public.articles FOR SELECT USING (true);
CREATE POLICY "articles_all_admin" ON public.articles FOR ALL    USING (public.is_admin());

-- CART ITEMS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cart_items_all" ON public.cart_items;
CREATE POLICY "cart_items_all" ON public.cart_items FOR ALL USING (true);

-- STORE FOLLOWS
ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_follows_select" ON public.store_follows;
DROP POLICY IF EXISTS "store_follows_insert" ON public.store_follows;
DROP POLICY IF EXISTS "store_follows_delete" ON public.store_follows;
CREATE POLICY "store_follows_select" ON public.store_follows FOR SELECT                  USING (true);
CREATE POLICY "store_follows_insert" ON public.store_follows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_follows_delete" ON public.store_follows FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- SECTION 16 — REFRESH POSTGREST SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
SELECT
  '? BALAKI ORGANIC SCHEMA v3.0 — Applied Successfully!' AS status,
  NOW() AS applied_at;
-- ============================================================
