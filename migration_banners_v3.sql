-- Robust Banner Table Creation
-- This script creates the banners table if it doesn't exist and ensures all columns are correct.

CREATE TABLE IF NOT EXISTS public.banners (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    slide_duration INTEGER DEFAULT 5000,
    display_order INTEGER DEFAULT 0,
    merchant_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_comment TEXT
);

-- Ensure columns exist and have the correct foreign key link if table was partially created
DO $$ 
BEGIN
    -- Add column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banners' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.banners ADD COLUMN merchant_id UUID REFERENCES public.profiles(id);
    ELSE
        -- Ensure it points to profiles for proper API joining
        ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_merchant_id_fkey;
        ALTER TABLE public.banners ADD CONSTRAINT banners_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id);
    END IF;
END $$;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS admin_comment TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS slide_duration INTEGER DEFAULT 5000;

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view approved banners') THEN
        CREATE POLICY "Public can view approved banners" ON public.banners
            FOR SELECT USING (status = 'approved');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchants can manage their own banners') THEN
        CREATE POLICY "Merchants can manage their own banners" ON public.banners
            FOR ALL USING (auth.uid() = merchant_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all banners') THEN
        CREATE POLICY "Admins can manage all banners" ON public.banners
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;
