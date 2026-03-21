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
                .select('*, profiles!merchant_id(merchant_status, store_name, contact_number)')
                .is('deleted_at', null)
                .order('id', { ascending: true });

            if (error) throw error;

            const enriched = (data || [])
                .filter((p: any) => {
                    if (isAdmin) return true; // Admins see everything
                    if (!p.merchant_id) return true;
                    return p.profiles?.merchant_status === 'approved';
                })
                .map((p: any) => ({
                    ...p,
                    avg_rating: Number(p.avg_rating) || 0,
                    total_reviews: Number(p.total_reviews) || 0,
                    merchant_name: p.profiles?.store_name || 'Tarzify',
                    merchant_contact: p.profiles?.contact_number
                }));

            // Sync with global store for components not using this hook
            setProducts(enriched);
            return enriched;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
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
