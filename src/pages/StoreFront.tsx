import React, { useMemo } from 'react';
import { Hero } from '../components/Hero';
import { HeroBanner } from '../components/HeroBanner';
import { CategorySection } from '../components/CategorySection';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeleton } from '../components/Skeleton';
import { ChevronRight, ChevronLeft, Search, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

interface StoreFrontProps {
    products: any[];
    loading: boolean;
    activeCategory: string;
    setActiveCategory: (cat: string) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    cardWidth: number;
    onAddToCart: () => void;
    onQuickView: (product: any) => void;
    isUsedOnly?: boolean;
    isSaleOnly?: boolean;
}

export const StoreFront: React.FC<StoreFrontProps> = ({
    products,
    loading,
    activeCategory,
    setActiveCategory,
    searchQuery,
    onSearch,
    cardWidth,
    onAddToCart,
    onQuickView,
    isUsedOnly,
    isSaleOnly
}) => {
    const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
    const [displayLimit, setDisplayLimit] = React.useState(12);

    // Sync local state when parent searchQuery changes (e.g. from Navbar)
    React.useEffect(() => {
        setLocalSearchQuery(searchQuery);
        setDisplayLimit(12); // Reset limit on search
    }, [searchQuery]);

    // Memoized filtering to prevent recalculation on every render
    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const searchTerms = query.split(' ').filter(t => t.length > 0);
        return products.filter(p => {
            const productString = `${p.name} ${p.category} ${p.sku}`.toLowerCase();
            const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => productString.includes(term));
            
            // If searching, ignore category filter to search global store
            const matchesCategory = searchQuery.trim() !== '' || activeCategory === 'All' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, activeCategory]);

    const displayProducts = useMemo(() => {
        return activeCategory === 'All' ? filteredProducts : filteredProducts.slice(0, displayLimit);
    }, [filteredProducts, activeCategory, displayLimit]);

    // Debounce search update to parent
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchQuery !== searchQuery) {
                onSearch(localSearchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearchQuery, onSearch, searchQuery]);

    // Memoized grouping
    const groupedProducts = useMemo(() => {
        return filteredProducts.reduce((acc: { [key: string]: any[] }, product) => {
            const cat = product.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(product);
            return acc;
        }, {});
    }, [filteredProducts]);

    const scrollSlider = (sliderId: string, direction: 'left' | 'right') => {
        const el = document.getElementById(sliderId);
        if (el) el.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    };

    return (
        <main className="bg-gray-50/50 dark:bg-zinc-950 min-h-screen pb-20">
            <Hero />
            <HeroBanner />
            <CategorySection activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

            {/* Mobile-Only Search Bar - Positioned below categories */}
            <div className="md:hidden px-5 pt-4 pb-2">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text"
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        placeholder="Search for products, categories..."
                        className="w-full bg-white dark:bg-zinc-900 border border-foreground/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                </div>
            </div>

            <section className="py-8 md:py-12 px-5 max-w-7xl mx-auto" id="catalog">
                {loading ? (
                    <div className="space-y-12">
                        {[1, 2].map(s => (
                            <div key={s}>
                                <div className="h-7 w-40 bg-gray-200 dark:bg-zinc-800 animate-pulse rounded mb-5" />
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-5">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-[3/4] bg-white dark:bg-zinc-900 animate-pulse rounded-2xl border border-gray-100 dark:border-white/5" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeCategory !== 'All' ? (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="block w-1 h-6 md:h-7 bg-primary rounded-full transition-all group-hover:h-8" />
                                <h2 className="text-base md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    {isSaleOnly && <Tag className="w-5 h-5 text-primary animate-bounce-slow" />}
                                    {isSaleOnly ? 'Flash Sale' : isUsedOnly ? 'Pre-loved Items' : activeCategory}
                                </h2>
                                {(isSaleOnly || isUsedOnly) && (
                                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                                        {isSaleOnly ? 'Discounts' : 'Second Hand'}
                                    </span>
                                )}
                                <span className="text-xs text-gray-400 font-bold">({filteredProducts.length} products)</span>
                            </div>
                            <button
                                onClick={() => setActiveCategory('All')}
                                className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-primary hover:gap-2 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Back
                            </button>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                                {[...Array(8)].map((_, i) => (
                                    <ProductSkeleton key={i} />
                                ))}
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="text-center py-24 glass rounded-[3rem] opacity-30 font-black uppercase italic tracking-[0.3em] text-2xl">
                                No Products Found
                            </div>
                        ) : (
                            <div className="space-y-12">
                                <motion.div 
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
                                >
                                    {displayProducts.map(product => (
                                        <motion.div key={product.id} variants={itemVariants}>
                                            <ProductCard
                                                product={product}
                                                onAddToCart={onAddToCart}
                                                onQuickView={onQuickView}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                                
                                {filteredProducts.length > displayLimit && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => setDisplayLimit(prev => prev + 12)}
                                            className="px-8 py-4 bg-white dark:bg-zinc-900 border border-foreground/10 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary hover:text-white hover:border-primary transition-all shadow-lg active:scale-95"
                                        >
                                            Load More Products
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedProducts).length === 0 ? (
                            <div className="text-center py-24 glass rounded-[3rem] opacity-30 font-black uppercase italic tracking-[0.3em] text-2xl">
                                No Products Found
                            </div>
                        ) : (
                            Object.entries(groupedProducts).map(([categoryName, catProducts]) => {
                                const sliderId = `slider-${categoryName.replace(/[^a-z0-9]/gi, '-')}`;
                                return (
                                    <div key={categoryName}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="block w-1 h-6 md:h-7 bg-primary rounded-full" />
                                                <h2 className="text-base md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                    {categoryName}
                                                </h2>
                                            </div>
                                            <button
                                                onClick={() => setActiveCategory(categoryName)}
                                                className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-1 hover:gap-2 transition-all"
                                            >
                                                VIEW ALL <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="relative px-5 md:px-6">
                                            <button
                                                onClick={() => scrollSlider(sliderId, 'left')}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-primary hover:text-white transition-all active:scale-90"
                                            >
                                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>

                                            <div
                                                id={sliderId}
                                                className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1"
                                            >
                                                {catProducts.slice(0, 12).map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="flex-shrink-0"
                                                        style={{ width: cardWidth }}
                                                    >
                                                        <ProductCard
                                                            product={product}
                                                            onAddToCart={onAddToCart}
                                                            onQuickView={onQuickView}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => scrollSlider(sliderId, 'right')}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-10 md:h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-primary hover:text-white transition-all active:scale-90"
                                            >
                                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </section>
        </main>
    );
};
