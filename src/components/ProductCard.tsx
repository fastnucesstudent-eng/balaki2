import { motion } from 'framer-motion';
import { ShoppingCart, Star, Search } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { useToastStore } from '../stores/useToastStore';
import { generateProductURL } from '../lib/slugify';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

interface ProductCardProps {
    product: any;
    onAddToCart: (product: any) => void;
    onQuickView?: (product: any) => void;
}

export const ProductCard = ({ product, onAddToCart, onQuickView }: ProductCardProps) => {
    const { name, price, image, image_url, category, stock = 1, sku, image_urls = [], compare_at_price, avg_rating, pricing_matrix, sale_percentage = 0, is_free_delivery = false, total_reviews, dynamic_attributes } = product;
    const finalImage = image || image_url;
    const addItem = useCartStore((state) => state.addItem);
    const toast = useToastStore();
    const [mainImageError, setMainImageError] = useState(false);
    const [secondaryImageError, setSecondaryImageError] = useState(false);

    // Calculate dynamic price range if pricing_matrix exists
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

    // Calculate total stock if variants exist
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
        
        // If product has variants, must select one first - open QuickView instead
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
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -4 }}
            onClick={() => { window.location.hash = '#' + generateProductURL(name, sku); }}
            className={`group relative bg-white dark:bg-zinc-900/50 rounded-2xl md:rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col h-full cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] transition-all duration-500 ${isOOS ? 'opacity-90' : ''}`}
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-zinc-800/20">
                
                {/* Badges Overlay - Phase 2 Alignment */}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
                    {isOOS && (
                        <div className="bg-red-500/90 backdrop-blur-md text-white text-[6px] md:text-[8px] font-black px-1 py-0.5 md:px-2 md:py-1 rounded-md uppercase italic shadow-lg shadow-red-500/20">
                            Sold Out
                        </div>
                    )}
                    {discount > 0 && !isOOS && (
                        <div className="bg-primary/95 backdrop-blur-md text-white text-[6px] md:text-[8px] font-black px-1 py-0.5 md:px-2 md:py-1 rounded-md uppercase italic shadow-lg shadow-primary/20">
                            -{discount}% OFF
                        </div>
                    )}
                </div>

                {/* Free Delivery Badge - Balanced on Left */}
                {is_free_delivery && (
                    <div className="absolute top-2 left-2 z-10 transition-transform group-hover:-translate-y-1">
                        <div className="bg-green-500/95 backdrop-blur-sm text-white text-[6px] md:text-[9px] font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shadow-xl shadow-green-500/20 uppercase italic tracking-tighter flex items-center gap-1">
                            <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                            Free Delivery
                        </div>
                    </div>
                )}

                {finalImage && (
                    <img
                        src={mainImageError ? PLACEHOLDER_IMAGE : finalImage}
                        alt={name}
                        onError={() => setMainImageError(true)}
                        className={`w-full h-full object-cover transition-all duration-1000 scale-100 group-hover:scale-110 ${(image_urls?.length ?? 0) > 1 ? 'group-hover:opacity-0' : ''}`}
                    />
                )}

                {/* Secondary Image on Hover */}
                {(image_urls?.length ?? 0) > 1 && (
                    <img
                        src={secondaryImageError ? PLACEHOLDER_IMAGE : image_urls![1]}
                        alt={name}
                        onError={() => setSecondaryImageError(true)}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-1000 scale-110 group-hover:scale-100"
                    />
                )}

                {/* Quick Add Overlay & Quick View Button - Desktop Only */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2 z-20">
                    {onQuickView && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
                            className="p-3 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto"
                            title="Quick View"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleAddToCart}
                        disabled={isOOS}
                        className={`p-3 rounded-full shadow-2xl transition-all pointer-events-auto ${isOOS ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:scale-110 active:scale-95'}`}
                        title="Add to Cart"
                    >
                        <ShoppingCart className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-2.5 md:p-3.5 flex flex-col flex-grow">
                <div className="flex flex-col gap-0.5 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 dark:text-primary/40">{category}</p>
                    <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-white line-clamp-2 leading-tight italic group-hover:text-primary transition-colors">
                        {name}
                    </h3>

                    {/* Variant Swatches (Daraz-style) */}
                    {pricing_matrix && pricing_matrix.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {pricing_matrix.slice(0, 5).map((v: any, i: number) => {
                                const combo = v.variant_combo || v.combination;
                                if (!combo) return null;
                                const colorVal = Object.entries(combo).find(([k]) => k.toLowerCase().includes('color') || k.toLowerCase().includes('colour'))?.[1];
                                if (!colorVal && !v.image_url) return null;

                                return (
                                    <div
                                        key={i}
                                        className="w-4 h-4 rounded-full border border-gray-100 dark:border-white/10 overflow-hidden bg-gray-100"
                                        title={String(colorVal || 'Variant')}
                                    >
                                        {v.image_url ? (
                                            <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full" style={{ backgroundColor: String(colorVal).toLowerCase() }} />
                                        )}
                                    </div>
                                );
                            })}
                            {pricing_matrix.length > 5 && (
                                <span className="text-[8px] font-bold opacity-30 flex items-center">+{pricing_matrix.length - 5}</span>
                            )}
                        </div>
                    )}

                    {avg_rating !== undefined && avg_rating > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 bg-yellow-400/5 w-fit px-1 py-0.5 rounded-md border border-yellow-400/10 scale-90 origin-left">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-400">
                                {avg_rating.toFixed(1)} <span className="opacity-40">({total_reviews || 0})</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-2 border-t border-gray-50 dark:border-white/5 flex items-end justify-between">
                    {/* Price Section */}
                    <div className="flex flex-col">
                        {compare_at_price && compare_at_price > displayOutPrice && (
                            <span className="text-[10px] text-gray-400 line-through font-bold">
                                Rs. {compare_at_price.toLocaleString()}
                            </span>
                        )}
                        <span className="text-base md:text-lg font-black italic tracking-tighter text-black dark:text-white leading-none">
                            {hasRange
                                ? `Rs. ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
                                : `Rs. ${displayOutPrice.toLocaleString()}`
                            }
                        </span>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isOOS}
                        className={`p-2 md:p-2.5 rounded-xl transition-all active:scale-90 hidden md:block ${isOOS ? 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-110'}`}
                    >
                        <ShoppingCart className="w-4 h-4 shadow-sm" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
