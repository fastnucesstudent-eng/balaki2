import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useMerchantStore(slug: string | null) {
    const [merchant, setMerchant] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);

    useEffect(() => {
        if (!slug) return;

        async function fetchStoreData() {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch Merchant Profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('store_slug', slug)
                    .eq('role', 'merchant')
                    .single();

                if (profileError) throw new Error('Store not found');
                if (profile.merchant_status !== 'approved' && profile.merchant_status !== 'paused') {
                    throw new Error('This store is currently not active');
                }

                setMerchant(profile);

                // 2. Fetch Merchant Products
                const { data: prods, error: prodsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('merchant_id', profile.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });

                if (prodsError) throw prodsError;
                
                // If merchant is paused, don't show products
                setProducts(profile.merchant_status === 'paused' ? [] : prods);

                // 3. Check follow status if logged in
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: follow, error: followError } = await supabase
                        .from('store_follows')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('merchant_id', profile.id)
                        .maybeSingle();
                    
                    if (followError && followError.code !== 'PGRST116') {
                        console.error('Error checking follow status:', followError);
                    }
                    setIsFollowing(!!follow);
                }

                // 4. Get follower count
                const { count } = await supabase
                    .from('store_follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('merchant_id', profile.id);
                setFollowerCount(count || 0);

            } catch (err: any) {
                console.error('Error loading store:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchStoreData();
    }, [slug]);

    const toggleFollow = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.dispatchEvent(new CustomEvent('open-auth-modal'));
            return;
        }

        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from('store_follows')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('merchant_id', merchant.id);
                
                if (error) throw error;
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
            } else {
                const { error } = await supabase
                    .from('store_follows')
                    .insert({ user_id: user.id, merchant_id: merchant.id });
                
                if (error) throw error;
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch (err: any) {
            console.error('Error toggling follow:', err);
            // Optionally dispatch a toast event if available
        }
    };

    return { merchant, products, loading, error, isFollowing, followerCount, toggleFollow };
}
