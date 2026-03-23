import { supabase } from './src/lib/supabase';

async function checkSchema() {
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
    
    if (error) {
        // Fallback: fetch one record and check keys
        const { data, error: err2 } = await supabase.from('profiles').select('*').limit(1);
        if (err2) {
            console.error('Error:', err2);
        } else {
            console.log('Columns from data:', Object.keys(data[0] || {}));
        }
    } else {
        console.log('Columns from RPC:', cols);
    }
}

checkSchema();
