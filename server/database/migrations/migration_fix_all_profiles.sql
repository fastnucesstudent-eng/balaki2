-- Add phone column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add updated_at column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify the columns exist (this will just run without error if they do)
SELECT id, full_name, role, phone, updated_at FROM profiles LIMIT 1;
