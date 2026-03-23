ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC NOT NULL,
    min_spend NUMERIC DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER DEFAULT NULL, -- NULL means unlimited
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    merchant_id UUID REFERENCES public.profiles(id), -- NULL for Admin vouchers
    target_customer_id UUID REFERENCES public.profiles(id), -- NULL for Public vouchers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Voucher Usage Table (Tracking)
CREATE TABLE IF NOT EXISTS public.voucher_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    order_id UUID, -- Optional: Link to order if created
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS for Vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to vouchers" 
ON public.vouchers FOR ALL 
TO authenticated 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Merchants can see/create their own vouchers
CREATE POLICY "Merchants can manage their own vouchers" 
ON public.vouchers FOR ALL 
TO authenticated 
USING ( merchant_id = auth.uid() );

-- Public can see active vouchers that are either public or assigned to them
CREATE POLICY "Users can see relevant active vouchers" 
ON public.vouchers FOR SELECT 
TO authenticated 
USING ( 
    is_active = true 
    AND (expiry_date IS NULL OR expiry_date > NOW())
    AND (target_customer_id IS NULL OR target_customer_id = auth.uid())
);
