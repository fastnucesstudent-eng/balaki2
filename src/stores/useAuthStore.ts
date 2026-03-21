import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Module-level subscription — prevents listener stacking on every initialize() call
let authSubscription: { unsubscribe: () => void } | null = null;
let isInitializing = false;

interface AuthState {
    user: User | null;
    role: 'admin' | 'merchant' | 'customer' | null;
    merchantStatus: 'pending' | 'approved' | 'rejected' | 'paused' | null;
    storeSlug: string | null;
    qrCodeUrl: string | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: null,
    merchantStatus: null,
    storeSlug: null,
    qrCodeUrl: null,
    loading: true,
    setUser: (user) => set({ user, loading: false }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, role: null, merchantStatus: null, storeSlug: null, qrCodeUrl: null });
    },
    initialize: async () => {
        if (isInitializing) return;
        isInitializing = true;

        try {
            // Small delay to allow the browser and Supabase internal client to settle 
            // before acquiring the storage lock. This avoids the "signal aborted" error during initial load.
            await new Promise(resolve => setTimeout(resolve, 300));

            console.log('🔄 Initializing Auth Store...');

            // Fetch current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                if (sessionError.name === 'AbortError' || sessionError.message?.includes('aborted')) {
                    console.log('👤 Auth session fetch aborted (normal during navigation/refresh)');
                    return;
                }
                // Stale/invalid refresh token — clear it so the app doesn't loop on reload
                if (
                    sessionError.message?.toLowerCase().includes('refresh token') ||
                    sessionError.message?.toLowerCase().includes('invalid token') ||
                    (sessionError as any)?.status === 400
                ) {
                    console.warn('⚠️ Stale refresh token detected, clearing session...');
                    await supabase.auth.signOut();
                    set({ user: null, role: null, loading: false });
                    return;
                }
                console.error('❌ Session fetch error:', sessionError);
            }

            const fetchProfileData = async (userId: string) => {
                try {
                    // Use standard select + limit(1) instead of single() to avoid signal/abort issues
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role, merchant_status, store_slug, qr_code_url')
                        .eq('id', userId)
                        .limit(1);

                    const profile = data?.[0];

                    if (error) {
                        console.warn('⚠️ Profile fetch error:', error.message);
                        return { role: 'customer' as const, status: null, slug: null, qr: null };
                    }
                    return { 
                        role: (profile?.role || 'customer') as 'admin' | 'merchant' | 'customer', 
                        status: profile?.merchant_status || null,
                        slug: profile?.store_slug || null,
                        qr: profile?.qr_code_url || null
                    };
                } catch (e) {
                    console.error('❌ Unexpected error fetching profile:', e);
                    return { role: 'customer' as const, status: null, slug: null, qr: null };
                }
            };

            if (session?.user) {
                console.log('👤 User session found:', session.user.email);
                const { role, status, slug, qr } = await fetchProfileData(session.user.id);
                console.log('🎭 User role:', role, 'Status:', status);
                set({ user: session.user, role, merchantStatus: status, storeSlug: slug, qrCodeUrl: qr, loading: false });
            } else {
                console.log('📭 No active session');
                set({ user: null, role: null, merchantStatus: null, storeSlug: null, qrCodeUrl: null, loading: false });
            }

            // Unsubscribe from any previous listener before registering a new one
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('🔄 Auth state changed:', event, session?.user?.email);

                if (event === 'PASSWORD_RECOVERY') {
                    console.log('🔑 Password recovery mode detected');
                    window.location.hash = '#reset-password';
                }

                if (session?.user) {
                    const { role, status, slug, qr } = await fetchProfileData(session.user.id);
                    set({ user: session.user, role, merchantStatus: status, storeSlug: slug, qrCodeUrl: qr, loading: false });
                } else {
                    set({ user: null, role: null, merchantStatus: null, storeSlug: null, qrCodeUrl: null, loading: false });
                }
            });

            authSubscription = subscription;
        } catch (err: any) {
            // Silence AbortErrors
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
                return;
            }
            console.error('❌ Auth initialization failed:', err);
            set({ user: null, role: null, loading: false });
        } finally {
            isInitializing = false;
        }
    },
}));
