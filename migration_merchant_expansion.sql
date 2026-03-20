-- 0. Dependencies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Extend profiles with merchant business data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ntn TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_branch_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_status TEXT DEFAULT 'pending'
  CHECK (merchant_status IN ('pending', 'approved', 'rejected', 'paused'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merchant_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Unique indexes (safe to re-run)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_store_slug ON public.profiles(store_slug) WHERE store_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_store_name ON public.profiles(store_name) WHERE store_name IS NOT NULL;

-- 3. Base categories (if missing)
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sub-categories (merchant-owned, under admin categories)
CREATE TABLE IF NOT EXISTS public.sub_categories (
  id BIGSERIAL PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_category_id BIGINT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, name)
);

-- 4. Follow System
CREATE TABLE IF NOT EXISTS public.store_follows (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_id)
);

-- 5. RLS: sub_categories
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sub_categories" ON public.sub_categories;
CREATE POLICY "Anyone can view sub_categories" ON public.sub_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants manage own sub_categories" ON public.sub_categories;
CREATE POLICY "Merchants manage own sub_categories" ON public.sub_categories
  FOR ALL USING (merchant_id = auth.uid() OR public.is_admin());

-- 6. RLS: store_follows
ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own follows" ON public.store_follows;
CREATE POLICY "Users manage own follows" ON public.store_follows
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view follows count" ON public.store_follows;
CREATE POLICY "Anyone can view follows count" ON public.store_follows
  FOR SELECT USING (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_sub_categories_merchant ON public.sub_categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_parent ON public.sub_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_store_follows_merchant ON public.store_follows(merchant_id);
CREATE INDEX IF NOT EXISTS idx_store_follows_user ON public.store_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_merchant_status ON public.profiles(merchant_status) WHERE role = 'merchant';

-- 8. Existing merchants: set to 'approved' if already role=merchant
UPDATE public.profiles
SET merchant_status = 'approved'
WHERE role = 'merchant' AND merchant_status IS NULL;

-- Done!
SELECT 'Merchant expansion migration complete ✅' AS result;
