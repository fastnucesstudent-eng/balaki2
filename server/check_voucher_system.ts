import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVoucherSystem() {
    console.log('Checking Voucher System status...');
    
    // 1. Check if vouchers table exists
    const { error: vouchersError } = await supabase.from('vouchers').select('id').limit(1);
    if (vouchersError) {
        console.log('vouchers table: MISSING or Error -', vouchersError.message);
    } else {
        console.log('vouchers table: EXISTS');
    }

    // 2. Check if voucher_usage table exists
    const { error: usageError } = await supabase.from('voucher_usage').select('id').limit(1);
    if (usageError) {
        console.log('voucher_usage table: MISSING or Error -', usageError.message);
    } else {
        console.log('voucher_usage table: EXISTS');
    }

    // 3. Check orders table for voucher_id and discount_amount
    const { data: orderData, error: orderError } = await supabase.from('orders').select('*').limit(1);
    if (!orderError && orderData && orderData.length > 0) {
        const columns = Object.keys(orderData[0]);
        console.log('orders columns:', columns);
        console.log('voucher_id existence:', columns.includes('voucher_id'));
        console.log('discount_amount existence:', columns.includes('discount_amount'));
    } else if (orderError) {
        console.log('Error checking orders table:', orderError.message);
    } else {
        console.log('No orders to inspect.');
        // Try insert test for voucher_id
        const { error: vIdError } = await supabase.from('orders').insert({ voucher_id: '00000000-0000-0000-0000-000000000000' });
        console.log('voucher_id insert test error:', vIdError?.message);
    }
}

checkVoucherSystem();
