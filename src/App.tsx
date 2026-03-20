import { useState, useEffect } from 'react';
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
import { AdminDashboard } from './pages/AdminDashboard';
import { CheckoutPage } from './pages/CheckoutPage';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { FomoPopups } from './components/FomoPopups';
import { ProductDetails } from './pages/ProductDetails';
import { TrackOrder } from './components/TrackOrder';
import { ProfilePage } from './pages/ProfilePage';
import { PolicyPage } from './pages/PolicyPage';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showRateProduct, setShowRateProduct] = useState(false);
    const [rateProductParams, setRateProductParams] = useState<any>(null);
    const [quickViewProduct, setQuickViewProduct] = useState<any>(null);

    // Pixel-based card width calculation
    const getCardWidth = () => {
        const vw = window.innerWidth;
        if (vw < 640) return Math.floor((vw - 56) / 3);
        if (vw < 1024) return Math.floor((vw - 72) / 3);
        return Math.floor((Math.min(vw, 1280) - 120) / 4);
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
        initialize();
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
            const catalogEl = document.getElementById('catalog');
            if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        const handleHashChange = () => {
            const hash = window.location.hash;
            setShowAdmin(hash === '#admin' && role === 'admin');
            setShowMerchant(hash === '#merchant' && (role === 'merchant' || role === 'admin'));
            setShowCheckout(hash === '#checkout');
            setShowProfile(hash === '#profile');
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
                const path = hash.replace('#product/', '').split('?')[0].toUpperCase();
                const matched = products.find(p => path.endsWith(p.sku.toUpperCase()) || path === String(p.id));
                setViewProductId(matched ? matched.id : null);
            } else {
                setViewProductId(null);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [role, products]);

    const renderContent = () => {
        if (showPolicy) return <PolicyPage type={showPolicy} />;
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
            return <ProductDetails productId={viewProductId} onBack={() => window.location.hash = ''} onFly={() => setIsCartOpen(true)} />;
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

        return (
            <StoreFront
                products={products}
                loading={loading}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                searchQuery={searchQuery}
                cardWidth={cardWidth}
                onAddToCart={() => setIsCartOpen(true)}
                onQuickView={setQuickViewProduct}
            />
        );
    };

    return (
        <div className="min-h-screen bg-background selection:bg-primary selection:text-white overflow-x-hidden">
            <Navbar onCartClick={() => setIsCartOpen(true)} onLoginClick={() => setShowAuth(true)} onSearch={setSearchQuery} onCategoryClick={setActiveCategory} />
            <SEO />
            {renderContent()}
            <SeoHiddenLinks />
            <Articles />
            <Footer />
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
