import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { useToastStore } from '../stores/useToastStore';
import { useState, useEffect } from 'react';

interface QuickViewModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
}

export const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
    const addItem = useCartStore((state) => state.addItem);
    const toast = useToastStore();

    // Variants State
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [activeVariantData, setActiveVariantData] = useState<any>(null);

    // Initialize default variants
    useEffect(() => {
        if (product?.dynamic_attributes) {
            const defaults: Record<string, string> = {};
            Object.entries(product.dynamic_attributes).forEach(([attr, options]) => {
                if (Array.isArray(options) && options.length > 0) {
                    defaults[attr] = options[0];
                }
            });
            setSelectedVariants(defaults);
        } else {
            setSelectedVariants({});
        }
    }, [product]);

    // Sync active variant data (price, stock, image) whenever selectedVariants change
    useEffect(() => {
        if (!product || !product.pricing_matrix || Object.keys(selectedVariants).length === 0) {
            setActiveVariantData(null);
            return;
        }

        const match = product.pricing_matrix.find((row: any) => {
            const combo = row.variant_combo || row.combination;
            if (!combo) return false;
            // Case-insensitive check for every key in dynamic_attributes
            return Object.keys(product.dynamic_attributes || {}).every(key => {
                const comboVal = Object.entries(combo).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
                return String(comboVal).toLowerCase() === String(selectedVariants[key] || '').toLowerCase();
            });
        });

        setActiveVariantData(match || null);
    }, [selectedVariants, product]);

    if (!product) return null;

    const displayPrice = activeVariantData?.price || product.price;
    const displayStock = activeVariantData?.stock ?? product.stock;

    const discount = product.compare_at_price && product.compare_at_price > displayPrice
        ? Math.round(((product.compare_at_price - displayPrice) / product.compare_at_price) * 100)
        : product.sale_percentage || 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (displayStock <= 0) return;
        addItem({ ...product, price: displayPrice }, 1, selectedVariants);
        toast.show(`${product.name} added to cart!`, 'success');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" data-lenis-prevent>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-3xl flex flex-col md:flex-row max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-10 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Image Section */}
                        <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-gray-50 dark:bg-zinc-800/50 relative">
                            <img
                                src={activeVariantData?.image_url || product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain p-8 md:p-12 transition-all duration-500"
                            />
                            {discount > 0 && (
                                <div className="absolute top-6 left-6 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl uppercase italic">
                                    {discount}% OFF
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="space-y-1 mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">{product.category}</p>
                                <h2 className="text-xl md:text-2xl font-black tracking-tighter italic uppercase leading-none">
                                    {product.name}
                                </h2>
                                {product.avg_rating > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1.5 origin-left scale-90">
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3.5 h-3.5 ${i < Math.floor(product.avg_rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{product.avg_rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-3xl font-black italic tracking-tighter text-primary">Rs. {displayPrice.toLocaleString()}</span>
                                    {product.compare_at_price > displayPrice && (
                                        <span className="text-base text-gray-400 line-through font-bold opacity-50">Rs. {product.compare_at_price.toLocaleString()}</span>
                                    )}
                                </div>
                                <p className="text-xs opacity-60 leading-relaxed font-medium line-clamp-2">
                                    {product.description || "No description available for this product."}
                                </p>
                            </div>

                            {/* Variants Selection */}
                            {product.dynamic_attributes && Object.keys(product.dynamic_attributes).length > 0 && (
                                <div className="space-y-5 mb-8 py-5 border-y border-foreground/5">
                                    {Object.entries(product.dynamic_attributes).map(([attrName, options]) => {
                                        if (!Array.isArray(options) || options.length === 0) return null;
                                        return (
                                            <div key={attrName} className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{attrName}</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {options.map((opt: string) => {
                                                        const isSelected = selectedVariants[attrName] === opt;
                                                        return (
                                                            <button
                                                                key={opt}
                                                                onClick={() => setSelectedVariants(prev => ({ ...prev, [attrName]: opt }))}
                                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border-2 transition-all ${isSelected
                                                                    ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                                    : 'border-foreground/5 text-foreground/60 bg-foreground/5 hover:border-primary/30'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    <Truck className="w-3.5 h-3.5 text-primary" />
                                    <div className="text-[9px] font-black uppercase tracking-tight">
                                        {product.is_free_delivery ? "Free Delivery" : "Fast Shipping"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                    <div className="text-[9px] font-black uppercase tracking-tight">Verified Policy</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={displayStock <= 0}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl ${displayStock > 0 ? 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95' : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {displayStock > 0 ? "Add to Cart" : "Out of Stock"}
                                </button>
                                <button
                                    onClick={() => {
                                        window.location.hash = `#product/${product.sku}`;
                                        onClose();
                                    }}
                                    className="w-full py-2 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    View Full Details
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
