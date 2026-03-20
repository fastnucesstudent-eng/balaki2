import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log('Seeding test vouchers...');
    const vouchers = [
        {
            code: 'SAVE10',
            type: 'percentage',
            value: 10,
            min_spend: 500,
            is_active: true,
            usage_limit: 100
        },
        {
            code: 'FLAT500',
            type: 'fixed',
            value: 500,
            min_spend: 2000,
            is_active: true,
            usage_limit: 50
        }
    ];

    const { error } = await supabase.from('vouchers').upsert(vouchers, { onConflict: 'code' });
    if (error) console.error(error);
    else console.log('Successfully seeded test vouchers!');
}
seed();
