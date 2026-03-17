import { motion } from 'framer-motion';
import { ShoppingCart, Star } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { generateProductURL } from '../lib/slugify';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

interface ProductCardProps {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    description?: string;
    rating?: number;
    stock?: number;
    sku: string;
    image_urls?: string[];
    compare_at_price?: number;
    avg_rating?: number;
    total_reviews?: number;
    pricing_matrix?: any[];
    onFly?: (e: React.MouseEvent) => void;
    sale_percentage?: number;
    is_free_delivery?: boolean;
}

export const ProductCard = (product: ProductCardProps) => {
    const { name, price, image, category, stock = 1, sku, image_urls = [], compare_at_price, avg_rating, pricing_matrix, onFly, sale_percentage = 0, is_free_delivery = false } = product;
    const addItem = useCartStore((state) => state.addItem);
    const [mainImageError, setMainImageError] = useState(false);
    const [secondaryImageError, setSecondaryImageError] = useState(false);

    // Calculate dynamic price range if pricing_matrix exists
    let minPrice = price;
    let maxPrice = price;
    let hasRange = false;

    if (pricing_matrix && pricing_matrix.length > 0) {
        const prices = pricing_matrix.map(v => v.price).filter(p => typeof p === 'number');
        if (prices.length > 0) {
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
            hasRange = minPrice !== maxPrice;
        }
    }

    const displayOutPrice = minPrice;

    // Calculate total stock if variants exist
    const totalStock = pricing_matrix && pricing_matrix.length > 0
        ? pricing_matrix.reduce((acc, v) => acc + (v.stock || 0), 0)
        : stock;

    const isOOS = totalStock === 0;

    const discount = compare_at_price && compare_at_price > displayOutPrice
        ? Math.round(((compare_at_price - displayOutPrice) / compare_at_price) * 100)
        : 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOOS) return;
        addItem(product);
        onFly?.(e);
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
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-zinc-800/20">
                {/* Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                    {sale_percentage > 0 && (
                        <div className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg uppercase italic">
                            -{sale_percentage}% OFF
                        </div>
                    )}
                    {is_free_delivery && (
                        <div className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg uppercase italic">
                            Free Delivery
                        </div>
                    )}
                    {/* OOS Overlay - Kept for functionality */}
                    {isOOS && (
                        <span className="px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full backdrop-blur-md">
                            Sold Out
                        </span>
                    )}
                </div>
                {image && (
                    <img
                        src={mainImageError ? PLACEHOLDER_IMAGE : image}
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

                {/* Badges Container */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                    {/* OOS Overlay */}
                    {isOOS && (
                        <span className="px-3 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full backdrop-blur-md">
                            Sold Out
                        </span>
                    )}
                    {/* Discount Badge */}
                    {discount > 0 && !isOOS && (
                        <span className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                            {discount}% OFF
                        </span>
                    )}
                </div>

                {/* Quick Add Overlay */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                            {pricing_matrix.slice(0, 5).map((v, i) => {
                                const combo = v.variant_combo || v.combination;
                                if (!combo) return null;
                                // Try to find a color value
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
                        <div className="flex items-center gap-1 mt-1 text-yellow-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                {avg_rating.toFixed(1)}
                                {product.total_reviews !== undefined && product.total_reviews > 0 && (
                                    <span className="ml-1 opacity-50">({product.total_reviews})</span>
                                )}
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
                        className={`p-2 md:p-2.5 rounded-xl transition-all active:scale-90 ${isOOS ? 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-110'}`}
                    >
                        <ShoppingCart className="w-4 h-4 shadow-sm" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
