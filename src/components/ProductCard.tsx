import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { useState, memo } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { useToastStore } from '../stores/useToastStore';
import { generateProductURL } from '../lib/slugify';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

interface ProductCardProps {
    product: any;
    onAddToCart: (product: any) => void;
    onQuickView?: (product: any) => void;
    storeSlug?: string;
}

export const ProductCard = memo(({ product, onAddToCart, onQuickView, storeSlug }: ProductCardProps) => {
    const { name, price, image, image_url, category, stock = 1, sku, image_urls = [], compare_at_price, avg_rating, pricing_matrix, sale_percentage = 0, is_free_delivery = false, total_reviews, dynamic_attributes, is_used = false } = product;
    const finalImage = image || image_url;
    const addItem = useCartStore((state) => state.addItem);
    const toast = useToastStore();
    const [mainImageError, setMainImageError] = useState(false);
    const [secondaryImageError, setSecondaryImageError] = useState(false);

    // Calculate dynamic price range
    let minPrice = price;
    let maxPrice = price;
    let hasRange = false;

    if (pricing_matrix && pricing_matrix.length > 0) {
        const prices = pricing_matrix.map((v: any) => v.price).filter((p: any) => typeof p === 'number');
        if (prices.length > 0) {
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
            hasRange = minPrice !== maxPrice;
        }
    }

    const displayOutPrice = minPrice;
    const totalStock = pricing_matrix && pricing_matrix.length > 0
        ? pricing_matrix.reduce((acc: number, v: any) => acc + (v.stock || 0), 0)
        : stock;
    const isOOS = totalStock === 0;

    const discount = compare_at_price && compare_at_price > displayOutPrice
        ? Math.round(((compare_at_price - displayOutPrice) / compare_at_price) * 100)
        : sale_percentage;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOOS) return;
        if (pricing_matrix && pricing_matrix.length > 0 && dynamic_attributes && Object.keys(dynamic_attributes).length > 0) {
            if (onQuickView) {
                onQuickView(product);
                toast.show(`Please select a variant for ${name}`, 'info');
                return;
            }
        }
        addItem(product);
        toast.show(`${name} added to cart!`, 'success');
        if (onAddToCart) onAddToCart(product);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "100px" }}
            whileHover={{ y: -4 }}
            onClick={() => { 
                const baseUrl = generateProductURL(name, sku);
                window.location.hash = '#' + baseUrl + (storeSlug ? `?store=${storeSlug}` : '');
            }}
            className={`group relative bg-white dark:bg-zinc-900/40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col h-full cursor-pointer hover:shadow-2xl transition-all duration-500 ${isOOS ? 'opacity-90' : ''}`}
        >
            {/* Image Section - Full bleed square on mobile */}
            <div className="relative aspect-square md:aspect-[4/5] overflow-hidden bg-[#f3f4f6] dark:bg-zinc-800/20">
                {/* Badges Overlay */}
                <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col items-start gap-1 z-10">
                    {isOOS && (
                        <div className="bg-red-500 text-white text-[7px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                            Sold Out
                        </div>
                    )}
                    {discount > 0 && !isOOS && (
                        <div className="bg-[#ff5e00] text-white text-[7px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                            -{discount}%
                        </div>
                    )}
                    {is_free_delivery && (
                        <div className="bg-green-500 text-white text-[6px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-0.5 shadow-lg border border-white/20">
                            <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                            Free Delivery
                        </div>
                    )}
                    {is_used && (
                        <div className="bg-accent text-white text-[7px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg border border-white/20 animate-pulse">
                            USED
                        </div>
                    )}
                </div>

                <img
                    src={mainImageError ? PLACEHOLDER_IMAGE : (finalImage || PLACEHOLDER_IMAGE)}
                    alt={name}
                    loading="lazy"
                    onError={() => setMainImageError(true)}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${(image_urls?.length ?? 0) > 1 ? 'group-hover:opacity-0' : ''}`}
                />

                {(image_urls?.length ?? 0) > 1 && (
                    <img
                        src={secondaryImageError ? PLACEHOLDER_IMAGE : image_urls![1]}
                        alt={name}
                        loading="lazy"
                        onError={() => setSecondaryImageError(true)}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100"
                    />
                )}
            </div>

            {/* Content Section */}
            <div className="p-3 md:p-5 flex flex-col flex-grow relative bg-white dark:bg-zinc-900/60 transition-colors group-hover:bg-gray-50/50 dark:group-hover:bg-zinc-800/50">
                <div className="flex flex-col gap-0.5 md:gap-1 mb-2 pr-10">
                    <span className="text-[9px] md:text-xs font-black text-primary uppercase tracking-tight truncate opacity-80">{category || 'Category'}</span>
                    <h3 className="text-xs md:text-base font-black text-gray-900 dark:text-white uppercase italic tracking-tighter line-clamp-1 leading-none group-hover:text-primary transition-colors">{name}</h3>
                    
                    {avg_rating !== undefined && avg_rating > 0 && (
                        <div className="flex items-center gap-0.5 mt-1 opacity-60">
                            <Star className="w-2 md:w-3 h-2 md:h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-[8px] md:text-[10px] font-bold">
                                {avg_rating.toFixed(1)} ({total_reviews || 0})
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-auto flex items-end justify-between">
                    <div className="flex flex-col">
                        {compare_at_price && compare_at_price > displayOutPrice && (
                            <span className="text-[9px] md:text-[11px] text-gray-400 line-through font-bold leading-none mb-0.5">
                                Rs. {compare_at_price.toLocaleString()}
                            </span>
                        )}
                        <span className="text-sm md:text-xl font-black italic tracking-tighter text-black dark:text-white leading-none">
                            {hasRange
                                ? `Rs. ${minPrice.toLocaleString()}+`
                                : `Rs. ${displayOutPrice.toLocaleString()}`
                            }
                        </span>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isOOS}
                        className={`w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all active:scale-90 ${isOOS ? 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed' : 'bg-[#ff5e00] text-white shadow-lg shadow-[#ff5e00]/20 hover:scale-110'}`}
                    >
                        <ShoppingCart className="w-4 h-4 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
});

ProductCard.displayName = 'ProductCard';
