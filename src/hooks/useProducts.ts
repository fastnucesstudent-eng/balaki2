import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProductStore, type Product } from '../stores/useProductStore';
import { supabase } from '../lib/supabase';

export type { Product };

export const useProducts = (isAdmin = false) => {
    const queryClient = useQueryClient();
    const { setProducts } = useProductStore();

    const { data: products = [], isLoading: loading, error, refetch } = useQuery<Product[]>({
        queryKey: ['products', isAdmin],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .is('deleted_at', null)
                .order('id', { ascending: true });

            if (error) throw error;

            const enriched = (data || [])
                .map((p: any) => ({
                    ...p,
                    merchant_name: 'Balaki Organic',
                    merchant_contact: '+92 301 4444980'
                }));

            // Sync with global store for components not using this hook
            setProducts(enriched);
            return enriched;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Real-time synchronization: Invalidate query on database changes
    useEffect(() => {
        const channel = supabase
            .channel(`products-realtime-${isAdmin ? 'admin' : 'user'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                queryClient.invalidateQueries({ queryKey: ['products'] });
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [queryClient, isAdmin]);

    return { 
        products, 
        loading, 
        error: error ? (error as Error).message : null, 
        refetch: () => refetch() 
    };
};
