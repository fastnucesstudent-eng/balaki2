import { supabase } from './src/lib/supabase';

async function checkBannersSchema() {
    const { data, error } = await supabase.from('banners').select('*').limit(1);
    if (error) {
        console.error('Error fetching banners:', error);
    } else {
        console.log('Banners columns:', Object.keys(data[0] || {}));
        if (data.length === 0) {
            console.log('Table is empty, trying to fetch schema via information_schema if possible...');
            // Fallback: This might fail on some Supabase configs but worth a try
            const { data: schema, error: schemaErr } = await supabase.from('information_schema.columns').select('column_name').eq('table_name', 'banners');
            if (schemaErr) {
                console.error('Schema error:', schemaErr);
            } else {
                console.log('Schema columns:', schema.map(c => c.column_name));
            }
        }
    }
}

checkBannersSchema();
