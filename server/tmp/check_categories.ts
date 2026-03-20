import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CATEGORIES = [
    'Men\'s Clothing', 'Women\'s Clothing', 'Kids Clothing', 'Sportswear', 'Winter Wear', 'Formal Wear',
    'Smartphones', 'Laptops & PCs', 'Audio & Headphones', 'Gaming', 'Cameras', 'Accessories & Cables',
    'Skincare', 'Haircare', 'Fragrances', 'Vitamins & Supplements',
    'Home Decor', 'Kitchen', 'Bedding', 'Lighting',
    'Fitness Equipment', 'Outdoor & Camping', 'Cycling',
    'Toys & Games', 'Books & Stationery', 'Electronics'
];

async function syncCategories() {
    console.log('--- CATEGORY SYNC START ---');
    try {
        // 1. Fetch current categories
        const { data: existing, error: fetchError } = await supabase
            .from('categories')
            .select('name');

        if (fetchError) throw fetchError;

        const existingNames = new Set((existing || []).map(c => c.name));
        const toInsert = DEFAULT_CATEGORIES
            .filter(name => !existingNames.has(name))
            .map(name => ({ name }));

        console.log(`Found ${existingNames.size} existing categories.`);

        if (toInsert.length > 0) {
            console.log(`Seeding ${toInsert.length} new categories...`);
            const { error: insertError } = await supabase
                .from('categories')
                .insert(toInsert);

            if (insertError) throw insertError;
            console.log('SUCCESS: Categories seeded successfully.');
        } else {
            console.log('Categories are already up to date.');
        }

        // 2. Final verification
        const { count } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true });
        
        console.log(`Final category count: ${count}`);

    } catch (err: any) {
        console.error('Sync failed:', err.message);
    }
}

syncCategories();
