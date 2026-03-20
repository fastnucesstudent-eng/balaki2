import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';

export const useCartSync = () => {
    const user = useAuthStore(state => state.user);
    const setItems = useCartStore(state => state.setItems);

    // Fetch cart from DB on login
    const fetchDBCart = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('cart_items')
                .select('product_id, quantity, products(*)')
                .eq('user_id', user.id);

            if (error) throw error;

            if (data && data.length > 0) {
                const dbItems = data.map((item: any) => ({
                    ...item.products,
                    quantity: item.quantity,
                    image: item.products.image_url
                }));
                setItems(dbItems);
            }
        } catch (err: any) {
            console.error('Error fetching DB cart:', err.message || err);
        }
    }, [user, setItems]);

    // Sync local changes to DB
    const syncToDB = useCallback(async (productId: number, quantity: number) => {
        if (!user) return;

        try {
            if (quantity <= 0) {
                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
            } else {
                await supabase
                    .from('cart_items')
                    .upsert({
                        user_id: user.id,
                        product_id: productId,
                        quantity: quantity,
                        variant_combo: (useCartStore.getState().items.find(i => i.id === productId) as any)?.variant_combo || {}
                    }, { onConflict: 'user_id,product_id,variant_combo' });
            }
        } catch (err) {
            console.error('Error syncing cart to DB:', err);
        }
    }, [user]);

    // Initial fetch
    useEffect(() => {
        if (user) fetchDBCart();
    }, [user, fetchDBCart]);

    return { syncToDB };
};
