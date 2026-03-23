-- Update products table to support dynamic variants and manual ratings

ALTER TABLE "public"."products"
ADD COLUMN IF NOT EXISTS "dynamic_attributes" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "pricing_matrix" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "avg_rating" NUMERIC(3, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "total_reviews" INTEGER DEFAULT 0;
