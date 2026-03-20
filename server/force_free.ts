import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Forcing all "leather wallet" products to is_free_delivery = true');
    const { data, error } = await supabase
        .from('products')
        .update({ is_free_delivery: true })
        .ilike('name', '%leather wallet%');
    
    if (error) console.error(error);
    else console.log('Successfully updated wallet status in DB');
}
run();
