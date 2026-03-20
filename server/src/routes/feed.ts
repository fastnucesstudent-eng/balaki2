import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Fetch products and their merchant profiles
        const { data: products, error } = await supabase
            .from('products')
            .select('*, profiles!merchant_id(store_name)')
            .is('deleted_at', null);

        if (error) throw error;

        // Base URL of the website
        const baseUrl = process.env.FRONTEND_URL || 'https://tarzify.com';

        // Generate XML
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
                
                xml += '<item>';
                xml += `<g:id>${product.sku || product.id}</g:id>`;
                xml += `<title><![CDATA[${product.name}]]></title>`;
                xml += `<description><![CDATA[${product.description || product.name}]]></description>`;
                xml += `<link>${baseUrl}/#product/${product.sku || product.id}</link>`;
                xml += `<g:image_link>${product.image_url}</g:image_link>`;
                xml += `<g:condition>new</g:condition>`;
                xml += `<g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>`;
                
                // Price logic: if originalPrice > currentPrice, then currentPrice is sale_price
                if (originalPrice && originalPrice > currentPrice) {
                    xml += `<g:price>${originalPrice} PKR</g:price>`;
                    xml += `<g:sale_price>${currentPrice} PKR</g:sale_price>`;
                } else {
                    xml += `<g:price>${currentPrice} PKR</g:price>`;
                }
                
                xml += `<g:brand><![CDATA[${brand}]]></g:brand>`;
                xml += `<g:google_product_category><![CDATA[${product.category}]]></g:google_product_category>`;
                xml += `<g:product_type><![CDATA[${product.category}]]></g:product_type>`;
                
                if (product.is_free_delivery) {
                    xml += `<g:shipping><g:price>0.00 PKR</g:price></g:shipping>`;
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
