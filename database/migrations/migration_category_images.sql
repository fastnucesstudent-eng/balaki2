-- Add image_url to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update RLS to ensure anyone can view images
-- (Existing policy "Anyone can view categories" covers this as it's FOR SELECT USING (true))
