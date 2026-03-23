import { supabase } from './src/lib/supabase';

async function checkTables() {
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (error) {
        // Fallback: list of known tables
        const tables = ['profiles', 'orders', 'order_items', 'products', 'banners', 'vouchers', 'shipping_rates'];
        for (const t of tables) {
            const { data: cols, error: err2 } = await supabase.from(t).select('*').limit(1);
            if (!err2) {
                console.log(`Table ${t} columns:`, Object.keys(cols[0] || {}));
            }
        }
    } else {
        console.log('Tables:', data.map(t => t.table_name));
    }
}

checkTables();
