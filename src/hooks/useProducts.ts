import { useEffect } from 'react';
import { useProductStore, type Product } from '../stores/useProductStore';

export type { Product };

export const useProducts = (isAdmin = false) => {
    const { products, loading, error, fetchProducts, subscribe } = useProductStore();

    useEffect(() => {
        fetchProducts(false, isAdmin);
        return subscribe();
    }, [fetchProducts, subscribe, isAdmin]);

    return { products, loading, error, refetch: (force = false) => fetchProducts(force, isAdmin) };
};
