-- RPC to allow guest order tracking safely
-- This function returns only non-sensitive data needed for the tracking UI
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_number TEXT)
RETURNS JSONB AS $$
DECLARE
    v_order JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'status', o.status,
        'total_amount', o.total_amount,
        'tracking_number', o.tracking_number,
        'courier_name', o.courier_name,
        'shipping_proof_url', o.shipping_proof_url,
        'created_at', o.created_at,
        'order_items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'quantity', oi.quantity,
                    'price', oi.price,
                    'variant_combo', oi.variant_combo,
                    'products', (
                        SELECT jsonb_build_object('name', p.name)
                        FROM public.products p 
                        WHERE p.id = oi.product_id
                    )
                )
            )
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        )
    ) INTO v_order
    FROM public.orders o
    WHERE o.order_number = p_order_number
    LIMIT 1;

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure public can execute this RPC
REVOKE ALL ON FUNCTION public.get_order_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(TEXT) TO anon, authenticated;
