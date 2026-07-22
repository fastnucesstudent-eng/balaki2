import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface CartItem {
    id: number;
    name: string;
    price: number;
    compare_at_price?: number;
    image: string;
    quantity: number;
    stock: number; // Current available stock
    variant_combo?: Record<string, string>;
    is_free_delivery?: boolean;
    sale_percentage?: number;
    merchant_id?: string;
}

interface CartState {
    items: CartItem[];
    addItem: (product: any, quantity?: number, variant_combo?: Record<string, string>) => void;
    removeItem: (id: number, variant_combo?: Record<string, string>) => void;
    updateQuantity: (id: number, change: number, variant_combo?: Record<string, string>) => void;
    clearCart: () => void;
    setItems: (items: CartItem[]) => void;
    syncWithProducts: (availableProductIds: number[]) => void;
    total: number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (product, quantity = 1, variant_combo) => {
                const currentItems = get().items;

                // Matches by ID AND Variant Combo
                const existingItem = currentItems.find(item =>
                    item.id === product.id &&
                    JSON.stringify(item.variant_combo || {}) === JSON.stringify(variant_combo || {})
                );

                const availableStock = product.stock ?? 0;

                if (availableStock <= 0) return;
                let newItems: CartItem[];
                if (existingItem) {
                    const totalRequested = existingItem.quantity + quantity;
                    if (totalRequested > availableStock) {
                        useToastStore.getState().show(`Only ${availableStock} units available in stock.`, 'error');
                        return;
                    }
                    newItems = currentItems.map(item =>
                        (item.id === product.id && JSON.stringify(item.variant_combo || {}) === JSON.stringify(variant_combo || {}))
                            ? { ...item, quantity: totalRequested }
                            : item
                    );
                } else {
                    if (quantity > availableStock) {
                        useToastStore.getState().show(`Only ${availableStock} units available in stock.`, 'error');
                        return;
                    }
                    const itemImage = product.image || product.image_url;
                    newItems = [...currentItems, {
                        ...product,
                        image: itemImage,
                        compare_at_price: product.compare_at_price,
                        is_free_delivery: product.is_free_delivery,
                        sale_percentage: product.sale_percentage,
                        merchant_id: product.merchant_id,
                        quantity: quantity,
                        stock: availableStock,
                        variant_combo: variant_combo
                    }];
                }
                set({ items: newItems, total: newItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0) });

                // Sync to DB if logged in
                const user = (useAuthStore.getState() as any).user;
                if (user) {
                    const item = newItems.find(i =>
                        i.id === product.id &&
                        JSON.stringify(i.variant_combo || {}) === JSON.stringify(variant_combo || {})
                    );
                    if (item) {
                        supabase.from('cart_items').upsert({
                            user_id: user.id,
                            product_id: item.id,
                            quantity: item.quantity,
                            variant_combo: variant_combo || {}
                        }, { onConflict: 'user_id,product_id,variant_combo' }).then(() => {}, () => {});
                    }
                }
            },
            removeItem: (id, variant_combo) => {
                const newItems = get().items.filter(item =>
                    !(item.id === id && JSON.stringify(item.variant_combo || {}) === JSON.stringify(variant_combo || {}))
                );
                set({ items: newItems, total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0) });

                // Sync to DB if logged in
                const user = (useAuthStore.getState() as any).user;
                if (user) {
                    supabase.from('cart_items')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('product_id', id)
                        .eq('variant_combo', JSON.stringify(variant_combo || {}))
                        .then(() => {}, () => {});
                }
            },
            updateQuantity: (id, change, variant_combo) => {
                const currentItems = get().items;
                const item = currentItems.find(i =>
                    i.id === id &&
                    JSON.stringify(i.variant_combo || {}) === JSON.stringify(variant_combo || {})
                );
                if (!item) return;

                const newQuantity = item.quantity + change;
                if (newQuantity > item.stock) {
                    useToastStore.getState().show(`Only ${item.stock} units available.`, 'error');
                    return;
                }

                if (newQuantity < 1) return;

                const newItems = currentItems.map(i =>
                    (i.id === id && JSON.stringify(i.variant_combo || {}) === JSON.stringify(variant_combo || {}))
                        ? { ...i, quantity: newQuantity }
                        : i
                );
                set({ items: newItems, total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0) });

                // Sync to DB if logged in
                const user = (useAuthStore.getState() as any).user;
                if (user) {
                    supabase.from('cart_items').upsert({
                        user_id: user.id,
                        product_id: id,
                        quantity: newQuantity,
                        variant_combo: variant_combo || {}
                    }, { onConflict: 'user_id,product_id,variant_combo' }).then(() => {}, () => {});
                }
            },
            clearCart: () => {
                set({ items: [], total: 0 });
                try {
                    localStorage.removeItem('cart-storage');
                } catch (_e) {}
                // Sync to DB if logged in
                const user = (useAuthStore.getState() as any).user;
                if (user) {
                    supabase.from('cart_items')
                        .delete()
                        .eq('user_id', user.id)
                        .then(() => {}, () => {});
                }
            },
            setItems: (items) => set({
                items,
                total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
            }),
            syncWithProducts: (availableProductIds) => {
                const currentItems = get().items;
                const newItems = currentItems.filter(item => availableProductIds.includes(item.id));
                if (newItems.length !== currentItems.length) {
                    set({
                        items: newItems,
                        total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    });
                }
            },
            total: 0
        }),
        { name: 'cart-storage' }
    )
);
