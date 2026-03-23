-- ==========================================
-- PROMOTE USER TO ADMIN/MERCHANT
-- ==========================================
-- Run this in your Supabase SQL Editor to enable your panels.

-- Admin: l243071@lhr.nu.edu.pk
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

-- Verification:
-- SELECT email, role 
-- FROM auth.users 
-- JOIN public.profiles ON auth.users.id = public.profiles.id;
