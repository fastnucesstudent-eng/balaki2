-- SET_ADMIN.sql
-- ====================================================================
-- TARZIFY UTILITY: PROMOTE USER TO ADMIN
-- RUN THIS IN SUPABASE SQL EDITOR (REPLACE THE EMAIL BELOW)
-- ====================================================================

-- Option A: By Email (Easiest)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Option B: By ID (Most Precise)
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'your-uuid-here';

-- Verification
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
