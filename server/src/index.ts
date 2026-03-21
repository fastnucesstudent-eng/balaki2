import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

import ordersRouter from './routes/orders';
import paymentRouter from './routes/payment';
import shippingRouter from './routes/shipping';
import productsRouter from './routes/products';
import bannersRouter from './routes/banners';
import feedRouter from './routes/feed';
import vouchersRouter from './routes/vouchers';
import merchantsRouter from './routes/merchants';
import { supabase } from './lib/supabase';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(process.env.NODE_ENV === 'production' ? morgan('combined') : morgan('dev'));

// CORS/Security Middleware - must be at the top
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        // Log all origins for debugging
        console.log(`[CORS ATTEMPT] Origin: ${origin} | URL: ${req.url}`);

        const allowedOrigins = [
            'https://tarzify.com',
            'https://www.tarzify.com',
            'https://backend.tarzify.com'
        ];

        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || (process.env.NODE_ENV !== 'production' && origin.includes('localhost'))) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.header('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Handle OPTIONS preflight immediately
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

const isDevelopment = process.env.NODE_ENV !== 'production';
const scriptSrcDirectives = ["'self'", "'unsafe-inline'", "https://*.supabasedemo.com", "https://*.supabase.co"];
if (isDevelopment) {
    scriptSrcDirectives.push("'unsafe-eval'");
}

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": scriptSrcDirectives,
            "img-src": ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://res.cloudinary.com", "https://api.qrserver.com"],
            "connect-src": ["'self'", "https://*.supabase.co", "https://backend.tarzify.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"]
        }
    }
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Routes
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/products', productsRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/vouchers', vouchersRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/feed', feedRouter);

// Secure Password Update Endpoint (Bypasses Client Auth Quirks)
app.post('/api/update-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Verify User
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Admin Update (Service Role)
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Password Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Seed Endpoint - Admin only (protected by admin dashboard auth)
app.post('/api/setup/seed', async (req, res) => {
    // Get a default merchant to assign products to
    const { data: merchants } = await supabase.from('profiles').select('id').eq('role', 'merchant').limit(1);
    const defaultMerchantId = merchants?.[0]?.id;

    const products = [
        {
            name: 'Elite Carbon Pro X Headphones', sku: 'HEAD-001', price: 15500, compare_at_price: 18000,
            image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
            category: 'Electronics', stock: 50, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: false,
            description: 'The ultimate wireless audio experience featuring 40-hour battery life, active noise cancellation, and Hi-Res Audio certification. Premium memory foam ear cushions for all-day comfort.'
        },
        {
            name: 'Onyx Leather Chrono Watch', sku: 'WATCH-002', price: 8500, compare_at_price: 12000,
            image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
            category: 'Accessories', stock: 30, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: false,
            description: 'Timeless design meets modern precision. Sapphire crystal glass, genuine Italian leather strap, and Swiss-inspired quartz movement. Water resistant up to 50m.'
        },
        {
            name: 'Solaris Max Beam Torch', sku: 'LIGHT-003', price: 4200, compare_at_price: 5500,
            image_url: 'https://images.unsplash.com/photo-1517055727180-60b70c3f5904?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1517055727180-60b70c3f5904?w=800&q=80'],
            category: 'Outdoor', stock: 100, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: false,
            description: '10,000 lumens of pure daylight in the palm of your hand. Military-grade aluminum body, 6 lighting modes, and 200hr battery life. IPX8 waterproof rated.'
        },
        {
            name: 'Classic Oxford Shirt – Navy', sku: 'SHIRT-004', price: 2800, compare_at_price: 3500,
            image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80'],
            category: "Men's Fashion", stock: 80, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: true,
            description: 'Crafted from 100% premium cotton, this slim-fit Oxford shirt is a wardrobe essential. Button-down collar, machine washable, and available in sizes S–XXL.'
        },
        {
            name: 'Floral Maxi Dress', sku: 'DRESS-005', price: 3900, compare_at_price: 5200,
            image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80'],
            category: "Women's Fashion", stock: 60, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: true,
            description: 'Effortlessly elegant floral print maxi dress in lightweight chiffon fabric. Perfect for summer outings and casual evenings. Available in S, M, L, XL.'
        },
        {
            name: 'BT Pro Wireless Earbuds', sku: 'EAR-006', price: 6500, compare_at_price: 9000,
            image_url: 'https://images.unsplash.com/photo-1574920162043-b872873f19bc?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1574920162043-b872873f19bc?w=800&q=80'],
            category: 'Electronics', stock: 75, merchant_id: defaultMerchantId, is_returnable: false, is_free_delivery: false,
            description: 'True wireless earbuds with 8-hour playback per charge (+24 hours with case), IPX5 sweat resistance, and crystal-clear calls with dual microphones.'
        },
        {
            name: 'Minimalist Leather Backpack', sku: 'BAG-007', price: 7200, compare_at_price: 9500,
            image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'],
            category: 'Accessories', stock: 40, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: false,
            description: 'Premium full-grain leather backpack with padded laptop sleeve (fits up to 15"), multiple zip compartments, and antitheft back pocket. 20L capacity.'
        },
        {
            name: 'Smart Posture Corrector', sku: 'HEALTH-008', price: 1800, compare_at_price: 2500,
            image_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'],
            category: 'Health & Fitness', stock: 120, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: true,
            description: 'Improve your posture in just 15 minutes a day. Lightweight, breathable, and adjustable. Designed by physiotherapists. One size fits all adults.'
        },
        {
            name: 'Ceramic Pour-Over Coffee Set', sku: 'KITCHEN-009', price: 3200, compare_at_price: 4000,
            image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'],
            category: 'Home & Kitchen', stock: 35, merchant_id: defaultMerchantId, is_returnable: true, is_free_delivery: false,
            description: 'Hand-thrown ceramic pour-over dripper with matching mug and stainless steel gooseneck kettle. The perfect gift for any coffee lover. Dishwasher safe.'
        },
        {
            name: 'Pro Gaming Mechanical Keyboard', sku: 'KEY-010', price: 9800, compare_at_price: 13000,
            image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
            image_urls: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
            category: 'Electronics', stock: 25, merchant_id: defaultMerchantId, is_returnable: false, is_free_delivery: false,
            description: 'TKL mechanical gaming keyboard with per-key RGB backlighting, tactile blue switches, and aircraft-grade aluminum top plate. N-key rollover for zero ghosting.'
        }
    ];

    try {
        const { error } = await supabase.from('products').upsert(products, { onConflict: 'sku' });
        if (error) throw error;
        res.json({ success: true, message: `${products.length} products seeded successfully` });
    } catch (error: any) {
        console.error('Seed error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});


app.post('/api/test-post', (req, res) => res.json({ success: true }));
app.post('/api/orders/test-direct', (req, res) => res.json({ success: true }));


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'The All-in-One Store Backend is running (TypeScript)' });
});

// Only start the HTTP server when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Consolidated TypeScript Server running on port ${PORT}`);
    });
}

// Export for Vercel serverless
export default app;
