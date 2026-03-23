import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useMerchants = () => {
    const { data: merchants = [], isLoading: loading } = useQuery({
        queryKey: ['merchants-approved'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'merchant')
                .eq('merchant_status', 'approved');

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    return { merchants, loading };
};
