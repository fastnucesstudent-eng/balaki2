import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Fetch products that are NOT deleted
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null);

        if (error) throw error;

        // Base URL of the website
        const baseUrl = 'https://tarzify.com';

        // Generate XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">';
        xml += '<channel>';
        xml += '<title>Tarzify Product Feed</title>';
        xml += `<link>${baseUrl}</link>`;
        xml += '<description>Pakistan\'s fastest-growing online ecommerce store.</description>';

        if (products) {
            products.forEach(product => {
                xml += '<item>';
                xml += `<g:id>${product.sku || product.id}</g:id>`;
                xml += `<title><![CDATA[${product.name}]]></title>`;
                xml += `<description><![CDATA[${product.description || product.name}]]></description>`;
                xml += `<link>${baseUrl}/#product/${product.sku || product.id}</link>`;
                xml += `<g:image_link>${product.image_url}</g:image_link>`;
                xml += `<g:condition>new</g:condition>`;
                xml += `<g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>`;
                xml += `<g:price>${product.price} PKR</g:price>`;
                xml += `<g:brand>Tarzify</g:brand>`;
                xml += `<g:google_product_category>${product.category}</g:google_product_category>`;
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
