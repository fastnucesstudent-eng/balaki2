import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking "orders" table schema...');
    
    // We can try to select one row and see the keys
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching from orders:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in "orders" table:', Object.keys(data[0]));
        if (Object.keys(data[0]).includes('discount_amount')) {
            console.log('SUCCESS: "discount_amount" column exists.');
        } else {
            console.log('FAILURE: "discount_amount" column is MISSING.');
        }
    } else {
        console.log('No rows found in "orders" table to inspect columns. Trying a different method...');
        // Fallback: try to insert a dummy row with discount_amount and see if it fails
        const { error: insertError } = await supabase
            .from('orders')
            .insert({ discount_amount: 0 })
            .select();
        
        if (insertError) {
            console.log('Insert test failed. Error detail:', insertError.message);
            if (insertError.message.includes('column "discount_amount" of relation "orders" does not exist')) {
                console.log('CONFIRMED: "discount_amount" column is MISSING.');
            } else {
                console.log('Insert failed for another reason:', insertError.message);
            }
        } else {
            console.log('Insert test succeeded. "discount_amount" column exists.');
        }
    }
}

checkSchema();
