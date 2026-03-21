import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useAdminStats = () => {
    const { data: stats = {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        activeProducts: 0
    }, isLoading: loading, refetch } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            // Run all queries in parallel for maximum speed
            const [ordersRes, customersRes, productsRes] = await Promise.all([
                supabase.from('orders').select('total_amount'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
                supabase.from('products').select('*', { count: 'exact', head: true })
            ]);

            if (ordersRes.error) throw ordersRes.error;
            if (customersRes.error) throw customersRes.error;
            if (productsRes.error) throw productsRes.error;

            const totalRevenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
            const totalOrders = ordersRes.data?.length || 0;

            return {
                totalRevenue,
                totalOrders,
                totalCustomers: customersRes.count || 0,
                activeProducts: productsRes.count || 0
            };
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return { stats, loading, refetch };
};
