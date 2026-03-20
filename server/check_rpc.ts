import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
    console.log('Checking for exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
        console.log('exec_sql RPC not found or error:', error.message);
    } else {
        console.log('exec_sql RPC EXISTS!');
    }
}

checkRPC();
