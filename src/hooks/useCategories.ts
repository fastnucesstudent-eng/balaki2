import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

export interface Category {
    id: number;
    name: string;
    image_url?: string;
    created_at: string;
}

export const useCategories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToastStore();

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err: any) {
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
            console.error('Error fetching categories:', err);
            toast.show('Failed to load categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async (name: string, image_url?: string) => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, image_url }])
                .select()
                .single();

            if (error) throw error;
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.show('Category added successfully', 'success');
            return data;
        } catch (err: any) {
            console.error('Error adding category:', err);
            toast.show('Failed to add category: ' + err.message, 'error');
            return null;
        }
    };

    const updateCategory = async (id: number, updates: Partial<Category>) => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setCategories(prev => prev.map(c => c.id === id ? data : c));
            toast.show('Category updated successfully', 'success');
            return data;
        } catch (err: any) {
            console.error('Error updating category:', err);
            toast.show('Failed to update category', 'error');
            return null;
        }
    };

    const deleteCategory = async (id: number) => {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCategories(prev => prev.filter(c => c.id !== id));
            toast.show('Category removed', 'success');
            return true;
        } catch (err: any) {
            console.error('Error deleting category:', err);
            toast.show('Failed to delete category', 'error');
            return false;
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return { categories, loading, refetch: fetchCategories, addCategory, updateCategory, deleteCategory };
};
