const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env
const env = fs.readFileSync('e:/ecommerce_website/.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, is_free_delivery, merchant_id')
        .ilike('name', '%wallet%');
    
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
