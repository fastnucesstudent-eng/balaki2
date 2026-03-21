import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Map internal categories to valid Google Product Category strings
const getGoogleCategory = (category: string): string => {
    const map: Record<string, string> = {
        // Electronics
        'Electronics': 'Electronics',
        'Mobile Phones': 'Electronics > Communications > Telephony > Mobile Phones',
        'Smartphones': 'Electronics > Communications > Telephony > Mobile Phones',
        'Laptops': 'Electronics > Computers > Laptops',
        'Computers': 'Electronics > Computers',
        'Tablets': 'Electronics > Computers > Tablet Computers',
        'Cameras': 'Cameras & Optics > Cameras',
        'Headphones': 'Electronics > Audio > Headphones',
        'Earbuds': 'Electronics > Audio > Headphones',
        'Speakers': 'Electronics > Audio > Audio Components > Speakers',
        'TV & Home Theater': 'Electronics > Video > Televisions',
        'Gaming': 'Electronics > Video Games',
        'Wearables': 'Electronics > Electronics Accessories > Wearable Technology',
        'Smart Watches': 'Electronics > Electronics Accessories > Wearable Technology > Smart Watches',
        'Printers': 'Electronics > Print, Copy, Scan & Fax > Printers, Copiers & Fax Machines',
        'Power Banks': 'Electronics > Electronics Accessories > Power > Portable Power Supplies',
        'Cables & Adapters': 'Electronics > Electronics Accessories > Cables',

        // Fashion
        "Men's Fashion": 'Apparel & Accessories > Clothing',
        "Women's Fashion": 'Apparel & Accessories > Clothing',
        'Clothing': 'Apparel & Accessories > Clothing',
        'T-Shirts': 'Apparel & Accessories > Clothing > Shirts & Tops',
        'Shirts': 'Apparel & Accessories > Clothing > Shirts & Tops',
        'Pants': 'Apparel & Accessories > Clothing > Pants',
        'Jeans': 'Apparel & Accessories > Clothing > Pants',
        'Dresses': 'Apparel & Accessories > Clothing > Dresses',
        'Kurtis': 'Apparel & Accessories > Clothing > Dresses',
        'Shalwar Kameez': 'Apparel & Accessories > Clothing',
        'Abayas': 'Apparel & Accessories > Clothing',
        'Jackets': 'Apparel & Accessories > Clothing > Outerwear',
        'Coats': 'Apparel & Accessories > Clothing > Outerwear',
        'Sweaters': 'Apparel & Accessories > Clothing > Sweaters',
        'Underwear': 'Apparel & Accessories > Clothing > Underwear & Socks',
        'Socks': 'Apparel & Accessories > Clothing > Underwear & Socks > Socks',
        'Swimwear': 'Apparel & Accessories > Clothing > Swimwear',

        // Footwear
        'Shoes': 'Apparel & Accessories > Shoes',
        'Footwear': 'Apparel & Accessories > Shoes',
        'Sandals': 'Apparel & Accessories > Shoes > Sandals',
        'Sneakers': 'Apparel & Accessories > Shoes > Athletic Shoes',
        'Heels': 'Apparel & Accessories > Shoes > Heels',
        'Boots': 'Apparel & Accessories > Shoes > Boots',
        'Slippers': 'Apparel & Accessories > Shoes > Slippers',

        // Accessories
        'Accessories': 'Apparel & Accessories',
        'Bags': 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
        'Handbags': 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags',
        'Backpacks': 'Apparel & Accessories > Handbags, Wallets & Cases > Backpacks',
        'Wallets': 'Apparel & Accessories > Handbags, Wallets & Cases > Wallets',
        'Jewelry': 'Apparel & Accessories > Jewelry',
        'Watches': 'Apparel & Accessories > Jewelry > Watches',
        'Sunglasses': 'Apparel & Accessories > Clothing Accessories > Sunglasses',
        'Belts': 'Apparel & Accessories > Clothing Accessories > Belts',
        'Caps & Hats': 'Apparel & Accessories > Clothing Accessories > Hats',
        'Scarves': 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls',

        // Home & Living
        'Home & Kitchen': 'Home & Garden > Kitchen & Dining',
        'Home Decor': 'Home & Garden > Decor',
        'Furniture': 'Furniture',
        'Bedding': 'Home & Garden > Linens & Bedding > Bedding',
        'Curtains': 'Home & Garden > Decor > Window Treatments > Curtains & Drapes',
        'Kitchen Appliances': 'Home & Garden > Kitchen & Dining > Kitchen Appliances',
        'Home Appliances': 'Home & Garden > Household Appliances',
        'Lighting': 'Home & Garden > Lighting',
        'Storage': 'Home & Garden > Household Supplies > Storage & Organization',

        // Beauty & Health
        'Beauty': 'Health & Beauty > Beauty',
        'Skin Care': 'Health & Beauty > Beauty > Skin Care',
        'Hair Care': 'Health & Beauty > Beauty > Hair Care',
        'Makeup': 'Health & Beauty > Beauty > Cosmetics',
        'Fragrances': 'Health & Beauty > Beauty > Fragrance',
        'Nail Care': 'Health & Beauty > Beauty > Nail Care',
        'Health & Fitness': 'Health & Beauty > Health Care',
        'Vitamins & Supplements': 'Health & Beauty > Health Care > Vitamins & Supplements',
        'Medical Supplies': 'Health & Beauty > Health Care > Medical Supplies & Equipment',

        // Sports
        'Sports': 'Sporting Goods',
        'Outdoor': 'Sporting Goods > Outdoor Recreation',
        'Gym & Fitness': 'Sporting Goods > Exercise & Fitness',
        'Cricket': 'Sporting Goods > Team Sports > Cricket',
        'Football': 'Sporting Goods > Team Sports > Soccer',
        'Cycling': 'Sporting Goods > Cycling',
        'Yoga': 'Sporting Goods > Exercise & Fitness > Yoga & Pilates',

        // Kids & Baby
        'Baby & Kids': 'Baby & Toddler',
        'Kids Clothing': 'Apparel & Accessories > Clothing > Baby & Toddler Clothing',
        'Toys': 'Toys & Games',
        'Kids Toys': 'Toys & Games',
        'School Supplies': 'Office Supplies > Educational Supplies',

        // Food & Grocery
        'Food & Grocery': 'Food, Beverages & Tobacco > Food Items',
        'Beverages': 'Food, Beverages & Tobacco > Beverages',
        'Organic Food': 'Food, Beverages & Tobacco > Food Items',

        // Books & Media
        'Books': 'Media > Books',
        'Stationery': 'Office Supplies',

        // Automotive
        'Automotive': 'Vehicles & Parts',
        'Car Accessories': 'Vehicles & Parts > Vehicle Parts & Accessories > Car & Truck Parts',

        // Tools & Hardware
        'Tools': 'Hardware > Tools',
        'Power Tools': 'Hardware > Tools > Power Tools',
    };
    return map[category] || 'Apparel & Accessories';
};

router.get('/', async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*, profiles!merchant_id(store_name)')
            .is('deleted_at', null);

        if (error) throw error;

        const baseUrl = process.env.FRONTEND_URL || 'https://tarzify.com';

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">';
        xml += '<channel>';
        xml += '<title>Tarzify Product Feed</title>';
        xml += `<link>${baseUrl}</link>`;
        xml += '<description>Pakistan\'s fastest-growing online ecommerce store.</description>';

        if (products) {
            products.forEach((product: any) => {
                const currentPrice = product.price;
                const originalPrice = product.compare_at_price;
                const brand = product.profiles?.store_name || 'Tarzify';
                const googleCategory = getGoogleCategory(product.category || '');

                const encodedId = encodeURIComponent(product.sku || product.id);
                const encodedLink = `${baseUrl}/#product/${encodedId}`;
                const encodedImageUrl = product.image_url ? product.image_url.replace(/ /g, '%20') : '';

                xml += '<item>';
                xml += `<g:id><![CDATA[${product.sku || product.id}]]></g:id>`;
                xml += `<title><![CDATA[${product.name}]]></title>`;
                xml += `<description><![CDATA[${product.description || product.name}]]></description>`;
                xml += `<link><![CDATA[${encodedLink}]]></link>`;
                xml += `<g:image_link><![CDATA[${encodedImageUrl}]]></g:image_link>`;
                xml += `<g:condition>${product.is_used ? 'used' : 'new'}</g:condition>`;
                xml += `<g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>`;
                xml += `<g:identifier_exists>no</g:identifier_exists>`;

                // Price logic
                if (originalPrice && originalPrice > currentPrice) {
                    xml += `<g:price>${originalPrice} PKR</g:price>`;
                    xml += `<g:sale_price>${currentPrice} PKR</g:sale_price>`;
                } else {
                    xml += `<g:price>${currentPrice} PKR</g:price>`;
                }

                xml += `<g:brand><![CDATA[${brand}]]></g:brand>`;
                xml += `<g:google_product_category><![CDATA[${googleCategory}]]></g:google_product_category>`;
                xml += `<g:product_type><![CDATA[${product.category}]]></g:product_type>`;

                // Shipping — always included with required country sub-attribute
                if (product.is_free_delivery) {
                    xml += `<g:shipping><g:country>PK</g:country><g:service>Free Delivery</g:service><g:price>0.00 PKR</g:price></g:shipping>`;
                } else {
                    xml += `<g:shipping><g:country>PK</g:country><g:service>Standard</g:service><g:price>200.00 PKR</g:price></g:shipping>`;
                }

                // Additional images
                if (product.image_urls && Array.isArray(product.image_urls)) {
                    product.image_urls.slice(1, 5).forEach((imgUrl: string) => {
                        const encodedAdditionalImg = imgUrl.replace(/ /g, '%20');
                        xml += `<g:additional_image_link><![CDATA[${encodedAdditionalImg}]]></g:additional_image_link>`;
                    });
                }

                xml += '</item>';
            });
        }

        xml += '</channel>';
        xml += '</rss>';

        res.set('Content-Type', 'application/xml');
        res.send(xml);

    } catch (err: any) {
        console.error('Feed error:', err);
        res.status(500).send('Error generating feed');
    }
});

export default router;
