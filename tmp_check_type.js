import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrderType() {
    console.log('--- ORDER TYPE CHECK ---');
    
    // 1. Check columns in 'orders'
    const { data: cols, error: err } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (err) {
        console.error('Error fetching from orders:', err);
        return;
    }

    if (cols && cols.length > 0) {
        const id = cols[0].id;
        console.log(`Order ID: ${id} | Type of ID in JS: ${typeof id}`);
        if (typeof id === 'string' && id.includes('-')) {
            console.log('Likely UUID');
        } else if (typeof id === 'number') {
            console.log('Likely BIGINT/INTEGER');
        }
    } else {
        console.log('No orders to check. Checking profiles instead to see ID type.');
        const { data: pCols } = await supabase.from('profiles').select('id').limit(1);
        if (pCols && pCols.length > 0) {
            console.log(`Profile ID: ${pCols[0].id} | Type: ${typeof pCols[0].id}`);
        }
    }
}

checkOrderType();
