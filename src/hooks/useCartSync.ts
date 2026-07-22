import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';

export const useCartSync = () => {
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const setItems = useCartStore(state => state.setItems);

    // 1. Fetch cart from DB on login
    const { data: dbCartData } = useQuery({
        queryKey: ['cart', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('cart_items')
                .select('product_id, quantity, products(*)')
                .eq('user_id', user.id);

            if (error) {
                return [];
            }
            return data || [];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // 2. Sync DB cart to local store when data arrives
    useEffect(() => {
        if (dbCartData && dbCartData.length > 0) {
            const dbItems = dbCartData.map((item: any) => ({
                ...item.products,
                quantity: item.quantity,
                image: item.products.image_url
            }));
            setItems(dbItems);
        }
    }, [dbCartData, setItems]);

    // 3. Mutation for syncing local changes to DB
    const syncMutation = useMutation({
        mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
            if (!user) return;

            if (quantity <= 0) {
                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('cart_items')
                    .upsert({
                        user_id: user.id,
                        product_id: productId,
                        quantity: quantity,
                        variant_combo: (useCartStore.getState().items.find(i => i.id === productId) as any)?.variant_combo || {}
                    }, { onConflict: 'user_id,product_id,variant_combo' });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
        }
    });

    return { 
        syncToDB: (productId: number, quantity: number) => syncMutation.mutate({ productId, quantity }) 
    };
};
