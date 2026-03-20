import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './server/.env' });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkConstraints() {
    console.log('Checking constraints for public.products...');
    try {
        const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'products' });
        
        if (error) {
            // If RPC doesn't exist, try a raw query via a temporary function if possible, 
            // but usually we can't do raw SQL via client. 
            // We'll use a standard query to info schema if permitted.
            const { data: info, error: infoErr } = await supabase
                .from('information_schema.key_column_usage')
                .select('*')
                .eq('table_name', 'products')
                .eq('table_schema', 'public');
            
            if (infoErr) throw infoErr;
            console.log('Constraints:', JSON.stringify(info, null, 2));
        } else {
            console.log('Constraints:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkConstraints();
