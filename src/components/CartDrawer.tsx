import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
    const { items, removeItem, total } = useCartStore();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-background z-[70] shadow-2xl border-l border-white/10 flex flex-col"
                        data-lenis-prevent
                    >
                        <div className="p-6 border-b border-foreground/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-primary" />
                                <h2 className="text-xl font-bold">Your Cart</h2>
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
                                    {items.length}
                                </span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-6">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                                        <div className="relative w-32 h-32 bg-foreground/5 rounded-full flex items-center justify-center border-2 border-primary/10">
                                            <ShoppingBag className="w-12 h-12 text-primary opacity-50" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <p className="text-2xl font-black italic tracking-tighter uppercase">Your Bag is Empty</p>
                                        <p className="text-sm text-foreground/40 font-medium max-w-[200px] mx-auto">
                                            Discover our latest premium collection and find something you love.
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-3 bg-foreground text-background dark:bg-white dark:text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex gap-4 group">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-foreground/5 flex-shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-sm mb-1">{item.name}</h3>
                                            {item.variant_combo && Object.entries(item.variant_combo).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {Object.entries(item.variant_combo).map(([k, v]) => (
                                                        <span key={k} className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                            {k}: {String(v)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs opacity-50 mb-2">Quantity: {item.quantity}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 bg-foreground/5 rounded-lg p-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.quantity > 1) {
                                                                useCartStore.getState().updateQuantity(item.id, -1, item.variant_combo);
                                                            }
                                                        }}
                                                        disabled={item.quantity <= 1}
                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            useCartStore.getState().updateQuantity(item.id, 1, item.variant_combo);
                                                        }}
                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md transition-colors font-bold"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-primary leading-none">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                                            {item.compare_at_price && item.compare_at_price > item.price && (
                                                                <span className="text-[10px] text-gray-400 line-through">
                                                                    Rs. {(item.compare_at_price * item.quantity).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeItem(item.id, item.variant_combo);
                                                            }}
                                                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-8 border-t border-foreground/5 space-y-6">
                            <div className="flex items-center justify-between text-xl font-black tracking-tighter">
                                <span className="italic">Total</span>
                                <span className="text-primary tracking-normal">Rs. {total.toLocaleString()}</span>
                            </div>
                            <button
                                disabled={items.length === 0}
                                onClick={() => {
                                    window.location.hash = '#checkout';
                                    onClose();
                                }}
                                className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                            >
                                Checkout Now
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
