import { useState, useEffect, lazy, Suspense } from 'react';
import Lenis from '@studio-freight/lenis';
import {
    Loader2,
    X
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { useCartStore } from './stores/useCartStore';
import { useProducts } from './hooks/useProducts';
import { useAuthStore } from './stores/useAuthStore';
import { AuthPage } from './pages/AuthPage';
import { FomoPopups } from './components/FomoPopups';
import { TrackOrder } from './components/TrackOrder';
import { Articles } from './components/Articles';
import { SeoHiddenLinks } from './components/SeoHiddenLinks';
import { Footer } from './components/Footer';
import { SEO } from './components/SEO';
import { ToastContainer } from './components/ToastContainer';
import { ResetPassword } from './pages/ResetPassword';
import { useToastStore } from './stores/useToastStore';
import { RateProduct } from './pages/RateProduct.tsx';
import { QuickViewModal } from './components/QuickViewModal';
import { StoreFront } from './pages/StoreFront';

// Lazy loaded components for better performance
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard }))) as any;
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard').then(m => ({ default: m.MerchantDashboard }))) as any;
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage }))) as any;
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage }))) as any;
const ProductDetails = lazy(() => import('./pages/ProductDetails').then(m => ({ default: m.ProductDetails }))) as any;
const MerchantRegistration = lazy(() => import('./pages/MerchantRegistration').then(m => ({ default: m.MerchantRegistration }))) as any;
const MerchantStorePage = lazy(() => import('./pages/MerchantStorePage').then(m => ({ default: m.MerchantStorePage }))) as any;
const PolicyPage = lazy(() => import('./pages/PolicyPage').then(m => ({ default: m.PolicyPage }))) as any;

const LoadingOverlay = () => (
    <div className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-ping opacity-20" />
            <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="flex flex-col items-center gap-1">
            <h2 className="text-xl font-black uppercase italic tracking-tighter opacity-50">Loading Tarzify</h2>
            <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
            </div>
        </div>
    </div>
);

function App() {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showMerchant, setShowMerchant] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showTrackOrder, setShowTrackOrder] = useState(false);
    const [trackOrderId, setTrackOrderId] = useState<string | null>(null);
    const [showPolicy, setShowPolicy] = useState<'privacy' | 'returns' | 'shipping' | 'terms' | null>(null);
    const [viewProductId, setViewProductId] = useState<number | null>(null);
    const [showUsedOnly, setShowUsedOnly] = useState(false);
    const [showSaleOnly, setShowSaleOnly] = useState(false);
    const [productStoreSlug, setProductStoreSlug] = useState<string | null>(null);
    const [merchantStoreSlug, setMerchantStoreSlug] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showRateProduct, setShowRateProduct] = useState(false);
    const [rateProductParams, setRateProductParams] = useState<any>(null);
    const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
    const [showMerchantRegister, setShowMerchantRegister] = useState(false);

    // Pixel-based card width calculation
    const getCardWidth = () => {
        const vw = window.innerWidth;
        if (vw < 640) return Math.floor((vw - 40) / 2.1); // Perfect 2-per-row high-impact scale
        if (vw < 1024) return Math.floor((vw - 72) / 2.5);
        return Math.floor((Math.min(vw, 1280) - 120) / 4.2);
    };
    const [cardWidth, setCardWidth] = useState(getCardWidth);
    const { products, loading } = useProducts();
    const { user, role, initialize } = useAuthStore();

    useEffect(() => {
        const onResize = () => setCardWidth(getCardWidth());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('type=signup') || hash.includes('type=magiclink')) {
            setTimeout(() => {
                useToastStore.getState().show('Email successfully verified! Welcome!', 'success');
                window.location.hash = '#profile';
            }, 1000);
        }
        initialize().catch(err => {
            if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
                console.error('Failed to initialize auth:', err);
            }
        });
    }, []);

    useEffect(() => {
        if (!loading && products.length > 0) {
            useCartStore.getState().syncWithProducts(products.map(p => p.id));
        }
    }, [products, loading]);

    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            setViewProductId(null);
            setShowAdmin(false);
            setShowMerchant(false);
            setShowPolicy(null);
            setShowProfile(false);
            setShowTrackOrder(false);
            if (window.location.hash && !window.location.hash.startsWith('#catalog')) {
                window.location.hash = '';
            }
        }
    }, [searchQuery]);

    useEffect(() => {
        if (window.location.href.includes('review=success')) {
            useToastStore.getState().show('Thank you for your review! 🌟', 'success');
            if (window.location.hash.includes('review=success')) {
                window.location.hash = window.location.hash.split('?')[0];
            }
            const url = new URL(window.location.href);
            if (url.searchParams.has('review')) {
                url.searchParams.delete('review');
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, []);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 0.8,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1.5,
        });
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        return () => lenis.destroy();
    }, []);

    useEffect(() => {
        // Handle Google Merchant Center links that use standard query parameters instead of hash routing
        const params = new URLSearchParams(window.location.search);
        const productParam = params.get('product');
        if (productParam) {
            params.delete('product');
            const remainingSearch = params.toString() ? `?${params.toString()}` : '';
            window.location.replace(`${window.location.pathname}${remainingSearch}#product/${productParam}`);
            return;
        }

        const handleHashChange = () => {
            const hash = window.location.hash;
            setShowAdmin(hash === '#admin' && role === 'admin');
            setShowMerchant(hash === '#merchant' && (role === 'merchant' || role === 'admin'));
            setShowCheckout(hash === '#checkout');
            setShowProfile(hash === '#profile');
            setShowMerchantRegister(hash === '#merchant-register');
            setShowUsedOnly(hash === '#used');
            setShowSaleOnly(hash === '#sale');

            if (['#used', '#sale', '#catalog', '#merchants', '#categories'].some(h => hash.startsWith(h))) {
                const targetId = (hash === '#used' || hash === '#sale') ? 'catalog' : hash.substring(1).split('?')[0];
                const el = document.getElementById(targetId);
                if (el) {
                    setTimeout(() => {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            }
            if (hash.startsWith('#store/')) {
                setMerchantStoreSlug(hash.replace('#store/', '').split('?')[0]);
            } else {
                setMerchantStoreSlug(null);
            }
            if (hash.startsWith('#rate-product')) {
                const params = new URLSearchParams(hash.split('?')[1]);
                setRateProductParams({
                    order_id: params.get('order_id'),
                    product_id: params.get('product_id'),
                    user_id: params.get('user_id'),
                    rating: params.get('rating'),
                    sig: params.get('sig')
                });
                setShowRateProduct(true);
            } else {
                setShowRateProduct(false);
                setRateProductParams(null);
            }
            if (hash.startsWith('#track-order')) {
                const params = new URLSearchParams(hash.split('?')[1]);
                setTrackOrderId(params.get('id'));
                setShowTrackOrder(true);
            } else {
                setShowTrackOrder(false);
                setTrackOrderId(null);
            }
            const policyTypes = ['privacy', 'returns', 'shipping', 'terms'] as const;
            setShowPolicy(policyTypes.find(t => hash.toLowerCase().includes(t)) || null);

            if (hash.startsWith('#reset-password')) {
                setShowResetPassword(true);
            } else if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
                const params = new URLSearchParams(hash.substring(1));
                useToastStore.getState().show(params.get('error_description') || 'Access denied or link expired.', 'error');
                window.location.hash = '';
                setShowResetPassword(false);
            } else {
                setShowResetPassword(false);
            }

            if (hash.startsWith('#product/')) {
                const parts = hash.split('?');
                const path = parts[0].replace('#product/', '').toUpperCase();
                const params = new URLSearchParams(parts[1] || '');
                setProductStoreSlug(params.get('store'));
                
                const matched = products.find(p => path.endsWith(p.sku.toUpperCase()) || path === String(p.id));
                setViewProductId(matched ? matched.id : null);
            } else {
                setViewProductId(null);
                setProductStoreSlug(null); // Also reset productStoreSlug when not on a product page
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [role, products]);

    // Auto-scroll to catalog when searching
    useEffect(() => {
        if (searchQuery.trim() !== '') {
            const isFullPage = showAdmin || showMerchant || showCheckout || showProfile || viewProductId || merchantStoreSlug || showTrackOrder || showRateProduct;
            if (!isFullPage) {
                const catalogEl = document.getElementById('catalog');
                if (catalogEl) {
                    // Small delay to ensure the component is rendered or updated
                    setTimeout(() => {
                        catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            }
        }
    }, [searchQuery, showAdmin, showMerchant, showCheckout, showProfile, viewProductId, merchantStoreSlug, showTrackOrder, showRateProduct]);

    const renderContent = () => {
        if (showPolicy) return <PolicyPage type={showPolicy} />;
        if (showMerchantRegister) return <MerchantRegistration onBack={() => window.location.hash = ''} />;
        if (merchantStoreSlug) return <MerchantStorePage slug={merchantStoreSlug} onAddToCart={() => setIsCartOpen(true)} onQuickView={setQuickViewProduct} />;
        if (showAdmin && role === 'admin') return <AdminDashboard />;
        if (showMerchant && (role === 'merchant' || role === 'admin')) return <MerchantDashboard />;
        if (showResetPassword) return <ResetPassword onComplete={() => window.location.hash = ''} />;
        if (showRateProduct && rateProductParams) return <RateProduct params={rateProductParams} onComplete={() => window.location.hash = ''} />;
        if (showProfile && user) return <ProfilePage />;

        if (viewProductId || window.location.hash.startsWith('#product/')) {
            const product = products.find(p => p.id === viewProductId);
            if (loading || !product || !viewProductId) {
                return (
                    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="font-black uppercase tracking-tighter opacity-30 italic">Finding your product...</p>
                    </div>
                );
            }
            return <ProductDetails productId={viewProductId} storeSlug={productStoreSlug} onBack={() => window.location.hash = ''} onFly={() => setIsCartOpen(true)} />;
        }

        if (showCheckout) {
            if (!user) return (
                <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
                    <button onClick={() => window.location.hash = ''} className="absolute top-8 right-8 z-[110] glass p-3 rounded-full hover:scale-110 transition-all"><X className="w-6 h-6" /></button>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic mb-4">Login Required</h2>
                    <p className="opacity-50 mb-8">Please sign in to complete your checkout.</p>
                    <AuthPage onClose={() => window.location.hash = ''} />
                </div>
            );
            return <CheckoutPage onBack={() => window.location.hash = ''} />;
        }

        const displayProducts = showUsedOnly 
            ? products.filter(p => (p as any).is_used) 
            : showSaleOnly 
                ? products.filter(p => ((p.compare_at_price || 0) > p.price) || ((p as any).sale_percentage > 0))
                : products.filter(p => !(p as any).is_used);

        return (
            <StoreFront
                products={displayProducts}
                loading={loading}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                cardWidth={cardWidth}
                onAddToCart={() => setIsCartOpen(true)}
                onQuickView={setQuickViewProduct}
                isUsedOnly={showUsedOnly}
                isSaleOnly={showSaleOnly}
            />
        );
    };
    return (
        <div className="min-h-screen bg-background selection:bg-primary selection:text-white flex flex-col">
            <Navbar onCartClick={() => setIsCartOpen(true)} onLoginClick={() => setShowAuth(true)} onSearch={setSearchQuery} onCategoryClick={setActiveCategory} />
            <SEO />
            
            <main className="flex-1 w-full min-w-0 pt-[80px]">
                <Suspense fallback={<LoadingOverlay />}>
                    {renderContent()}
                </Suspense>
                
                {!showAdmin && !showMerchant && (
                    <>
                        <SeoHiddenLinks />
                        <Articles />
                        <Footer />
                    </>
                )}
            </main>

            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            {showTrackOrder && <TrackOrder initialOrderId={trackOrderId || undefined} onClose={() => window.location.hash = ''} />}
            {showAuth && !user && <AuthPage onClose={() => setShowAuth(false)} />}
            <FomoPopups />
            <ToastContainer />
            <QuickViewModal
                product={quickViewProduct}
                isOpen={!!quickViewProduct}
                onClose={() => setQuickViewProduct(null)}
            />
        </div>
    );
}

export default App;
