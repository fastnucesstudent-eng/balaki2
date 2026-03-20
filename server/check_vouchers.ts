import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables in .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log('Checking for vouchers table...');
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .limit(1);
    
    if (error) {
        if (error.code === '42P01') {
            console.log('Table "vouchers" does not exist.');
        } else {
            console.error('Error checking table:', error);
        }
    } else {
        console.log('Table "vouchers" exists.');
    }
}
check();
