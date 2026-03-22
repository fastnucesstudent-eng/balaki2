import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Store, MapPin, Users, Heart, Search, Filter, 
    ChevronRight, ArrowLeft, AlertCircle, ShoppingBag, Info, X, Check,
    MessageCircle, Tag, Menu
} from 'lucide-react';
import { useMerchantStore } from '../hooks/useMerchantStore';
import { ProductCard } from '../components/ProductCard';
import { StorePageSkeleton } from '../components/Skeleton';

interface MerchantStorePageProps {
    slug: string;
    onAddToCart: (p: any) => void;
    onQuickView: (p: any) => void;
}

export const MerchantStorePage = ({ slug, onAddToCart, onQuickView }: MerchantStorePageProps) => {
    const { merchant, products, loading, error, isFollowing, followerCount, toggleFollow } = useMerchantStore(slug);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isUsedOnly, setIsUsedOnly] = useState(false);
    const [isSaleOnly, setIsSaleOnly] = useState(false);
    const [isSideBarOpen, setIsSideBarOpen] = useState(false);
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 p.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCat = !selectedCategory || p.category === selectedCategory;
            const matchesCondition = isUsedOnly ? (p as any).is_used : true;
            const matchesSale = !isSaleOnly || ((p.compare_at_price || 0) > p.price) || ((p as any).sale_percentage > 0);
            return matchesSearch && matchesCat && matchesCondition && matchesSale;
        });
    }, [products, searchQuery, selectedCategory, isUsedOnly, isSaleOnly]);

    // Unique categories from this merchant's products
    const merchantCategories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => cats.add(p.category));
        return Array.from(cats);
    }, [products]);

    if (loading) {
        return <StorePageSkeleton />;
    }

    if (error || !merchant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">Store Not Found</h1>
                <p className="opacity-50 max-w-sm mb-8">{error || "The store you're looking for doesn't exist or has been deactivated."}</p>
                <button 
                    onClick={() => window.location.hash = ''}
                    className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                >
                    Back to Marketplace
                </button>
            </div>
        );
    }

    const isPaused = merchant.merchant_status === 'paused';

    return (
        <div className="min-h-screen bg-background pb-20 pt-0">
            {/* STORE HERO BANNER (POSTER) */}
            <div className="relative w-full aspect-[21/9] md:aspect-[25/7] bg-gradient-to-br from-primary/10 to-primary/30 overflow-hidden shadow-2xl">
                {merchant.banner_url ? (
                    <img src={merchant.banner_url} alt="Store Banner" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                
                {/* Header Actions (Floating) */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-[50]">
                    <button 
                        onClick={() => window.location.hash = ''}
                        className="flex items-center gap-1.5 text-white/90 hover:text-white font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-colors bg-black/40 backdrop-blur-md px-3 md:px-5 py-2 md:py-3 rounded-full border border-white/10 group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="truncate">Back to Market</span>
                    </button>
                    <div className="flex gap-2">
                        {isPaused ? (
                            <div className="bg-yellow-500 text-black px-3 md:px-4 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20">
                                Closed
                            </div>
                        ) : (
                            <div className="bg-emerald-500 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                Open Now
                            </div>
                        )}
                        {merchant.ntn && (
                            <div className="bg-white/10 backdrop-blur-md text-white px-3 md:px-4 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 hidden sm:block">
                                Verified
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* OVERLAPPING LOGO & STORE INFO */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 md:-mt-20 relative z-40">
                <div className="flex flex-col md:flex-row gap-6 md:items-end">
                    {/* Store Logo */}
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-24 h-24 md:w-48 md:h-48 glass rounded-[1.5rem] md:rounded-[3rem] border-4 border-background shadow-2xl shadow-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 md:p-3 bg-white"
                    >
                        {merchant.logo_url ? (
                            <img src={merchant.logo_url} alt={merchant.store_name} className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                                <Store className="w-10 h-10 md:w-16 md:h-16" />
                            </div>
                        )}
                    </motion.div>

                    <div className="flex-grow space-y-2 pb-2 md:pb-4">
                        <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-foreground uppercase italic leading-none">{merchant.store_name}</h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-foreground/60 text-xs md:text-sm font-bold tracking-tight">
                            <div className="flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-full border border-foreground/5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{merchant.business_address?.split(',').slice(-2).join(',')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-foreground/5 px-3 py-1.5 rounded-full border border-foreground/5">
                                <Users className="w-3.5 h-3.5" />
                                <span>{followerCount} Followers</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pb-4 md:pb-6 w-full md:w-auto">
                        <div className="relative flex-grow md:w-64 group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search in store..."
                                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl md:rounded-3xl pl-9 pr-4 py-2.5 md:py-4 text-[10px] md:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:opacity-30"
                            />
                        </div>
                        
                        <button 
                            onClick={() => setIsSideBarOpen(true)}
                            className="p-3 md:px-5 md:py-4 rounded-xl md:rounded-3xl font-black text-[8px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 bg-foreground/5 border border-foreground/10 text-foreground hover:bg-foreground/10 shadow-lg shrink-0"
                            title="Store Details"
                        >
                            <Info className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">About</span>
                        </button>
                        
                        <button 
                            onClick={toggleFollow}
                            className={`px-4 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-3xl font-black text-[8px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-2xl hover:scale-105 active:scale-95 shrink-0 ${
                                isFollowing 
                                ? 'bg-foreground/10 text-foreground border border-foreground/10' 
                                : 'bg-primary text-white shadow-primary/30'
                            }`}
                        >
                            {isFollowing ? <Check className="w-3.5 h-3.5 md:w-5 md:h-5" /> : <Heart className="w-3.5 h-3.5 md:w-5 md:h-5" />}
                            <span>{isFollowing ? 'Following' : 'Follow'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* SLIDE-OUT SIDEBAR DRAWER */}
                    <AnimatePresence>
                        {isSideBarOpen && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsSideBarOpen(false)}
                                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                                />
                                <motion.aside 
                                    initial={{ x: '-100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '-100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className="fixed top-0 left-0 h-full w-[320px] sm:w-[400px] bg-background border-r border-foreground/5 z-[101] overflow-y-auto p-8 shadow-2xl"
                                >
                                    <div className="flex items-center justify-between mb-10">
                                        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Store Information</h2>
                                        <button 
                                            onClick={() => setIsSideBarOpen(false)}
                                            className="p-2 hover:bg-foreground/5 rounded-full"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="space-y-12">
                                        {/* Store Info Card */}
                                        <div className="space-y-6">
                                            <p className="text-xs font-black uppercase tracking-widest opacity-30">About Store</p>
                                            <div className="space-y-4">
                                                <p className="text-sm opacity-60 font-medium leading-relaxed">
                                                    {merchant.business_address}
                                                </p>
                                                
                                                <div className="flex flex-col gap-1 pt-4 border-t border-foreground/5 mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-primary">Owner</span>
                                                    <span className="text-sm font-black uppercase tracking-tight break-words">{merchant.full_name}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Email</span>
                                                    <span className="text-[11px] font-medium opacity-80 break-all leading-tight">{merchant.email}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                                    <span className="opacity-40">Contact</span>
                                                    <span>{merchant.contact_number}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                                    <span className="opacity-40">Member Since</span>
                                                    <span>{new Date(merchant.created_at).getFullYear()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Store Categories - Integrated in Drawer */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black uppercase tracking-widest opacity-30">Categories</p>
                                                {selectedCategory && (
                                                    <button 
                                                        onClick={() => setSelectedCategory(null)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {merchantCategories.map(cat => (
                                                    <button 
                                                        key={cat}
                                                        onClick={() => {
                                                            setSelectedCategory(cat === selectedCategory ? null : cat);
                                                            setIsSideBarOpen(false);
                                                        }}
                                                        className={`flex items-center justify-between px-5 py-4 rounded-2xl font-black text-sm uppercase tracking-wide transition-all border-2 ${
                                                            cat === selectedCategory 
                                                            ? 'bg-primary/10 border-primary text-primary' 
                                                            : 'glass border-foreground/5 opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        {cat}
                                                        <ChevronRight className={`w-4 h-4 transition-transform ${cat === selectedCategory ? 'rotate-90' : ''}`} />
                                                    </button>
                                                ))}
                                                {merchantCategories.length === 0 && (
                                                    <p className="text-xs opacity-40 font-medium italic">No categories yet</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Search Toggle/Field in Drawer */}
                                        <div className="space-y-4">
                                            <p className="text-xs font-black uppercase tracking-widest opacity-30">Quick Search</p>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Find in product..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full glass border border-foreground/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 ring-primary/30 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    {/* RIGHT COLUMN: PRODUCTS */}
                    <main className="lg:col-span-4">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-2xl font-black tracking-tighter uppercase italic">
                                    {selectedCategory || 'All Products'}
                                </h2>
                                <p className="text-xs opacity-40 font-medium">{filteredProducts.length} items found</p>
                                
                                {/* Mobile Search - Prominent Placement */}
                                <div className="mt-4 md:hidden relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={`Search in ${selectedCategory || 'store'}...`}
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="hidden sm:flex items-center gap-2">
                                <button className="p-3 glass rounded-xl border border-foreground/5 hover:bg-foreground/5 transition-colors">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Category Navigation Chips (Main Page - Instant Access) */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-6 mb-2 -mx-2 px-2 scrollbar-none">
                            <button
                                onClick={() => setIsCategoriesModalOpen(true)}
                                className="md:hidden px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 bg-foreground/5 border-transparent text-foreground flex items-center gap-2"
                            >
                                <Menu className="w-3.5 h-3.5 opacity-60" />
                                View All
                            </button>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                                    !selectedCategory 
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-foreground/5 border-transparent text-foreground/40 hover:text-foreground hover:bg-foreground/10'
                                }`}
                            >
                                All Products
                            </button>
                             <button
                                onClick={() => setIsSaleOnly(!isSaleOnly)}
                                className={`px-5 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-widest transition-all whitespace-nowrap border-2 flex items-center gap-2 ${
                                    isSaleOnly 
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 animate-pulse active:scale-95' 
                                    : 'bg-foreground/5 border-transparent text-foreground/40 hover:text-foreground hover:bg-foreground/10 active:scale-95'
                                }`}
                            >
                                <Tag className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isSaleOnly ? 'opacity-100' : 'opacity-40'}`} />
                                Flash Sale
                                {isSaleOnly && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            </button>
                             <button
                                onClick={() => {
                                    setIsUsedOnly(!isUsedOnly);
                                }}
                                className={`px-5 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-widest transition-all whitespace-nowrap border-2 flex items-center gap-2 ${
                                    isUsedOnly 
                                    ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20 animate-pulse active:scale-95' 
                                    : 'bg-foreground/5 border-transparent text-foreground/40 hover:text-foreground hover:bg-foreground/10 active:scale-95'
                                }`}
                            >
                                <ShoppingBag className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isUsedOnly ? 'opacity-100' : 'opacity-40'}`} />
                                Used Items
                                {isUsedOnly && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            </button>
                            {merchantCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                                        cat === selectedCategory 
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                        : 'bg-foreground/5 border-transparent text-foreground/40 hover:text-foreground hover:bg-foreground/10'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {isPaused ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
                                    <ShoppingBag className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Store Temporarily Closed</h3>
                                    <p className="text-sm opacity-50 max-w-xs mx-auto">This store is currently not taking new orders. Check back soon!</p>
                                </div>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredProducts.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <ProductCard 
                                                product={product} 
                                                onAddToCart={() => onAddToCart(product)} 
                                                onQuickView={() => onQuickView(product)}
                                                storeSlug={slug}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                                    <Search className="w-8 h-8" />
                                </div>
                                <p className="text-lg font-black uppercase opacity-20 tracking-widest italic">No products matched your search</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* FLOATING WHATSAPP CONTACT */}
            {merchant.contact_number && (
                <motion.a
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    href={`https://wa.me/${merchant.contact_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'm visiting your store "${merchant.store_name}" on Tarzify and have a query.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-8 right-8 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-green-500/40 flex items-center gap-2 group border-4 border-background"
                >
                    <MessageCircle className="w-6 h-6 fill-white" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
                        Chat with Store
                    </span>
                </motion.a>
            )}

            {/* MOBILE ALL CATEGORIES MODAL */}
            <AnimatePresence>
                {isCategoriesModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-md flex items-end md:hidden"
                        onClick={() => setIsCategoriesModalOpen(false)}
                        data-lenis-prevent
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full bg-card rounded-t-[2.5rem] border-t border-border shadow-2xl flex flex-col max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter">All Categories</h3>
                                    <p className="text-xs opacity-50 font-medium">Select a category to filter products</p>
                                </div>
                                <button
                                    onClick={() => setIsCategoriesModalOpen(false)}
                                    className="p-3 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto" data-lenis-prevent>
                                <div className="grid grid-cols-2 gap-3 pb-8">
                                    <button
                                        onClick={() => {
                                            setSelectedCategory(null);
                                            setIsCategoriesModalOpen(false);
                                        }}
                                        className={`p-4 rounded-2xl flex flex-col items-start gap-2 border-2 transition-all ${
                                            !selectedCategory 
                                            ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20' 
                                            : 'bg-background border-border text-foreground hover:border-primary/50'
                                        }`}
                                    >
                                        <Store className={`w-6 h-6 ${!selectedCategory ? 'opacity-100' : 'opacity-40'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-left mt-1">All Products</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsSaleOnly(!isSaleOnly);
                                            setIsCategoriesModalOpen(false);
                                        }}
                                        className={`p-4 rounded-2xl flex flex-col items-start gap-2 border-2 transition-all ${
                                            isSaleOnly 
                                            ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20' 
                                            : 'bg-background border-border text-foreground hover:border-primary/50'
                                        }`}
                                    >
                                        <Tag className={`w-6 h-6 ${isSaleOnly ? 'opacity-100' : 'opacity-40'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-left mt-1 flex items-center gap-2">
                                            Flash Sale {isSaleOnly && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsUsedOnly(!isUsedOnly);
                                            setIsCategoriesModalOpen(false);
                                        }}
                                        className={`p-4 rounded-2xl flex flex-col items-start gap-2 border-2 transition-all ${
                                            isUsedOnly 
                                            ? 'bg-accent/10 border-accent text-accent shadow-lg shadow-accent/20' 
                                            : 'bg-background border-border text-foreground hover:border-primary/50'
                                        }`}
                                    >
                                        <ShoppingBag className={`w-6 h-6 ${isUsedOnly ? 'opacity-100' : 'opacity-40'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-left mt-1 flex items-center gap-2">
                                            Used Items {isUsedOnly && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />}
                                        </span>
                                    </button>
                                    {merchantCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setSelectedCategory(cat === selectedCategory ? null : cat);
                                                setIsCategoriesModalOpen(false);
                                            }}
                                            className={`p-4 rounded-2xl flex flex-col items-start gap-2 border-2 transition-all ${
                                                cat === selectedCategory 
                                                ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20' 
                                                : 'bg-background border-border text-foreground hover:border-primary/50'
                                            }`}
                                        >
                                            <div className="w-6 h-6 bg-foreground/5 rounded-lg flex items-center justify-center mb-1">
                                                <div className="w-2 h-2 rounded-full bg-foreground/20" />
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-left line-clamp-2">{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
