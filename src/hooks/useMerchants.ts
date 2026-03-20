import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useMerchants = () => {
    const [merchants, setMerchants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMerchants = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'merchant')
                .eq('merchant_status', 'approved');

            if (data) {
                setMerchants(data);
            }
            setLoading(false);
        };

        fetchMerchants();
    }, []);

    return { merchants, loading };
};
