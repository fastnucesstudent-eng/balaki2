-- Add Merchant & Approval fields to banners
ALTER TABLE banners ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES auth.users(id);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE banners ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- For existing banners, set status to approved
UPDATE banners SET status = 'approved' WHERE status IS NULL;

-- Update the RLS or just ensure the query filters by status 'approved' for public view
-- The HeroBanner.tsx already filters by time, I'll add status filtering too.
