import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

let productsChannel: RealtimeChannel | null = null;

export interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    image_url: string;
    category: string;
    stock: number;
    created_at: string;
    is_returnable?: boolean;
    merchant_id?: string;
    description?: string;
    image_urls?: string[];
    avg_rating?: number;
    total_reviews?: number;
    compare_at_price?: number;
    // SEO fields
    seo_title?: string;
    meta_description?: string;
    slug?: string;
    alt_text?: string;
    tags?: string[];
    // Dynamic Variants
    dynamic_attributes?: Record<string, string[]>;
    pricing_matrix?: any[];
    sale_percentage?: number;
    is_free_delivery?: boolean;
    is_used?: boolean;
    condition_note?: string;
    merchant_name?: string;
    merchant_contact?: string;
}

interface ProductState {
    products: Product[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null;
    fetchProducts: (force?: boolean, isAdmin?: boolean) => Promise<void>;
    setProducts: (products: Product[]) => void;
    subscribe: () => () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
    products: [],
    loading: false,
    error: null,
    lastFetched: null,

    setProducts: (products) => set({ products }),

    subscribe: () => {
        if (productsChannel) return () => { };

        productsChannel = supabase
            .channel('products-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                console.log('Real-time notification:', payload.eventType, payload.new || payload.old);

                const { products } = get();

                if (payload.eventType === 'INSERT') {
                    // Pre-enrich the new product (rating starts at 0)
                    const newProduct = { ...payload.new as Product, avg_rating: 0 };
                    set({ products: [...products, newProduct].sort((a, b) => a.id - b.id) });
                }
                else if (payload.eventType === 'UPDATE') {
                    set({
                        products: products.map(p =>
                            p.id === (payload.new as Product).id
                                ? { ...p, ...payload.new as Product } // Merges updates while keeping locally calculated avg_rating
                                : p
                        )
                    });
                }
                else if (payload.eventType === 'DELETE') {
                    set({
                        products: products.filter(p => p.id !== (payload.old as { id: number }).id)
                    });
                }
            })
            .subscribe();

        return () => {
            if (productsChannel) {
                productsChannel.unsubscribe();
                productsChannel = null;
            }
        };
    },

    fetchProducts: async (force = false, isAdmin = false) => {
        const { lastFetched, loading } = get();

        // Only fetch if forced or if data is older than 5 minutes (or never fetched)
        const shouldFetch = force || !lastFetched || Date.now() - lastFetched > 5 * 60 * 1000;

        if (!shouldFetch || loading) return;

        set({ loading: true, error: null });

        // Guard: if the fetch is still running after 15s, stop the spinner and show an error
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            set({ loading: false, error: 'Product fetch timed out. Please refresh.' });
        }, 15000);

        try {
            const { data, error } = await supabase
                .from('products')
                .select('*, profiles!merchant_id(merchant_status, store_name, contact_number)')
                .is('deleted_at', null)
                .order('id', { ascending: true });

            // If the timeout already fired, don't update state with stale data
            if (timedOut) return;

            if (error) throw error;

            const enriched = (data || [])
                .filter((p: any) => {
                    if (isAdmin) return true; // Admins see everything
                    // Show admin products (no merchant_id) or approved merchant products
                    if (!p.merchant_id) return true;
                    return p.profiles?.merchant_status === 'approved';
                })
                .map((p: any) => {
                    // Use database columns directly as they are more performant
                    // Recalculation is only needed if columns are missing
                    return { 
                        ...p, 
                        avg_rating: Number(p.avg_rating) || 0, 
                        total_reviews: Number(p.total_reviews) || 0,
                        merchant_name: p.profiles?.store_name || 'Tarzify',
                        merchant_contact: p.profiles?.contact_number
                    };
                });

            set({
                products: enriched,
                error: null,
                lastFetched: Date.now()
            });
        } catch (err: any) {
            if (timedOut) return; // Timeout already handled it
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
                return;
            }
            console.error('Error fetching products:', err);
            set({ error: err.message });
        } finally {
            clearTimeout(timeoutId);
            if (!timedOut) set({ loading: false });
        }
    }

}));
