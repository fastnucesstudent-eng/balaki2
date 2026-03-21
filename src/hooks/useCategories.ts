import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Category {
    id: number;
    name: string;
    image_url?: string;
    created_at: string;
}

const FALLBACK_CATEGORIES: Category[] = [
    { id: -1, name: 'General', created_at: new Date().toISOString() },
];

export const useCategories = () => {
    const queryClient = useQueryClient();
    const toast = useToastStore();

    const { data: categories = FALLBACK_CATEGORIES, isLoading: loading, refetch } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            return data && data.length > 0 ? data : FALLBACK_CATEGORIES;
        },
        initialData: FALLBACK_CATEGORIES,
        // Error handling fallback is handled by the default value in destructuring if needed, 
        // but throw here allows TanStack Query to retry.
    });

    const addCategory = async (name: string, image_url?: string) => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, image_url }])
                .select()
                .single();

            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
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
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
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
            await queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.show('Category removed', 'success');
            return true;
        } catch (err: any) {
            console.error('Error deleting category:', err);
            toast.show('Failed to delete category', 'error');
            return false;
        }
    };

    return { categories, loading, refetch, addCategory, updateCategory, deleteCategory };
};
