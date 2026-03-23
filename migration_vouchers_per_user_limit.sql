-- Add per_user_limit to vouchers table
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS per_user_limit INTEGER DEFAULT 1;

-- Comment for clarity: 
-- This column allows restricting how many times a single user can use the same voucher.
-- Default is 1, which means one-time use per user.
