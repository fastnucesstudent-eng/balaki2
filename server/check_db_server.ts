import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking products for "wallet"...');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, is_free_delivery, merchant_id')
        .ilike('name', '%wallet%');
    
    if (error) {
        console.error('Query error:', error);
    } else {
        console.log('Product Data:', JSON.stringify(data, null, 2));
    }
}

check();
