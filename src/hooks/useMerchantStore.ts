import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useMerchantStore(slug: string | null) {
    const queryClient = useQueryClient();

    // 1. Fetch Merchant Profile
    const { data: merchant, isLoading: profileLoading, error: profileError } = useQuery({
        queryKey: ['merchant-profile', slug],
        queryFn: async () => {
            if (!slug) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('store_slug', slug)
                .eq('role', 'merchant')
                .single();

            if (error) throw new Error('Store not found');
            if (data.merchant_status !== 'approved' && data.merchant_status !== 'paused') {
                throw new Error('This store is currently not active');
            }
            return data;
        },
        enabled: !!slug,
        staleTime: 1000 * 60 * 10,
    });

    const merchantId = merchant?.id;

    // 2. Fetch Merchant Products
    const { data: products = [], isLoading: productsLoading } = useQuery({
        queryKey: ['merchant-products', merchantId],
        queryFn: async () => {
            if (!merchantId) return [];
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('merchant_id', merchantId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return merchant.merchant_status === 'paused' ? [] : data;
        },
        enabled: !!merchantId,
        staleTime: 1000 * 60 * 10,
    });

    // 3. Get Follower Count
    const { data: followerCount = 0 } = useQuery({
        queryKey: ['merchant-followers', merchantId],
        queryFn: async () => {
            if (!merchantId) return 0;
            const { count, error } = await supabase
                .from('store_follows')
                .select('*', { count: 'exact', head: true })
                .eq('merchant_id', merchantId);
            
            if (error) throw error;
            return count || 0;
        },
        enabled: !!merchantId,
        staleTime: 1000 * 60 * 1, // 1 minute
    });

    // 4. Check follow status if logged in
    const { data: isFollowing = false } = useQuery({
        queryKey: ['is-following', merchantId],
        queryFn: async () => {
            if (!merchantId) return false;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from('store_follows')
                .select('id')
                .eq('user_id', user.id)
                .eq('merchant_id', merchantId)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') throw error;
            return !!data;
        },
        enabled: !!merchantId,
        staleTime: 1000 * 60 * 10,
    });

    const toggleFollow = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.dispatchEvent(new CustomEvent('open-auth-modal'));
            return;
        }

        if (!merchantId) return;

        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from('store_follows')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('merchant_id', merchantId);
                
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('store_follows')
                    .insert({ user_id: user.id, merchant_id: merchantId });
                
                if (error) throw error;
            }
            
            // Invalidate follow queries to sync UI
            queryClient.invalidateQueries({ queryKey: ['is-following', merchantId] });
            queryClient.invalidateQueries({ queryKey: ['merchant-followers', merchantId] });
        } catch (err: any) {
            console.error('Error toggling follow:', err);
        }
    };

    return { 
        merchant, 
        products, 
        loading: profileLoading || (!!merchantId && productsLoading), 
        error: profileError ? (profileError as Error).message : null, 
        isFollowing, 
        followerCount, 
        toggleFollow 
    };
}
