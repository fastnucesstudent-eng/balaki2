-- Migration: Variant-Aware Stock Reduction
-- =======================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS public.decrement_stock(BIGINT, INTEGER);

-- New version that handles variants
CREATE OR REPLACE FUNCTION public.decrement_stock(
    product_id BIGINT, 
    amount INTEGER, 
    v_combo JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- 1. Decrement Global Stock
    UPDATE public.products
    SET stock = stock - amount
    WHERE id = product_id;

    -- 2. Decrement Variant-Specific Stock (if applicable)
    IF v_combo IS NOT NULL AND v_combo <> '{}'::jsonb THEN
        UPDATE public.products
        SET pricing_matrix = (
            SELECT jsonb_agg(
                CASE 
                    WHEN (elem->'variant_combo') = v_combo 
                    THEN jsonb_set(elem, '{stock}', (((elem->>'stock')::int - amount))::text::jsonb)
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(pricing_matrix) AS elem
        )
        WHERE id = product_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
