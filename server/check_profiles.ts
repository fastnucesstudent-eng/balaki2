import { supabase } from './src/lib/supabase';

async function checkSchema() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Profile columns:', Object.keys(data[0] || {}));
    }
}

checkSchema();
