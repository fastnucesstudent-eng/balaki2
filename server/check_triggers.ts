import { supabase } from './src/lib/supabase';

async function checkTriggers() {
    const { data: triggers, error } = await supabase.rpc('get_triggers');
    if (error) {
        // Fallback: check pg_trigger if permissions allow
        const { data, error: err2 } = await supabase.from('pg_trigger').select('*');
        if (err2) {
            console.error('Error:', err2);
        } else {
            console.log('Triggers:', data);
        }
    } else {
        console.log('Triggers:', triggers);
    }
}

checkTriggers();
