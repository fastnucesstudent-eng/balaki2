import { supabase } from './src/lib/supabase';

async function checkRLS() {
    // We can check if we can insert a dummy record (it will fail if RLS blocks it)
    // Or try to fetch the policies if we have enough permissions (unlikely via RPC usually)
    // But we can check the 'banners' table status
    const { data: policies, error } = await supabase.rpc('get_policies_for_table', { table_name: 'banners' });
    if (error) {
        console.log('RPC get_policies_for_table not found or failed.');
        // Try a manual insert in a transaction-like way (we'll delete it immediately if it works)
        console.log('Testing manual insert with service role maybe? No, let\'s try regular client.');
    } else {
        console.log('Policies:', policies);
    }
}

checkRLS();
