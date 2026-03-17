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
import { supabase } from './lib/supabase';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(morgan('dev'));

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

// Seed Endpoint to ensure 8+ products
app.post('/api/setup/seed', async (req, res) => {
    // Get a default merchant to assign products to if none exists
    const { data: merchants } = await supabase.from('profiles').select('id').eq('role', 'merchant').limit(1);
    const defaultMerchantId = merchants?.[0]?.id;

    const products = [
        { name: 'Elite Carbon Pro X', sku: 'HEAD-001', price: 15500, compare_at_price: 18000, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'], category: 'Electronics', stock: 50, merchant_id: defaultMerchantId, description: 'The ultimate wireless audio experience with active noise cancellation.' },
        { name: 'Onyx Leather Chrono', sku: 'WATCH-002', price: 8500, compare_at_price: 12000, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'], category: 'Accessories', stock: 30, merchant_id: defaultMerchantId, description: 'Timeless design meeting modern precision.' },
        { name: 'Solaris Max Beam', sku: 'LIGHT-003', price: 4200, compare_at_price: 5500, image_url: 'https://images.unsplash.com/photo-1517055727180-60b70c3f5904?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1517055727180-60b70c3f5904?w=800&q=80'], category: 'Outdoor', stock: 100, merchant_id: defaultMerchantId, description: '10000 Lumens of pure daylight in the palm of your hand.' },
        { name: 'Vortex G-Series Mouse', sku: 'MOUSE-004', price: 6800, compare_at_price: 8500, image_url: 'https://images.unsplash.com/photo-1527814732934-94b1ec5d0927?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1527814732934-94b1ec5d0927?w=800&q=80'], category: 'Electronics', stock: 40, merchant_id: defaultMerchantId, description: 'Zero lag, maximum precision for competitive play.' },
        { name: 'FitPulse Active V2', sku: 'FIT-005', price: 5500, compare_at_price: 7500, image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80'], category: 'Accessories', stock: 75, merchant_id: defaultMerchantId, description: 'Track your health, own your progress.' },
        { name: 'ThunderBox 360', sku: 'SPK-006', price: 12000, compare_at_price: 15000, image_url: 'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&q=80'], category: 'Electronics', stock: 25, merchant_id: defaultMerchantId, description: 'Omni-directional sound for the perfect house party.' },
        { name: 'Apex Ridge Walker', sku: 'BOOT-007', price: 18500, compare_at_price: 22000, image_url: 'https://images.unsplash.com/photo-1520639889313-72702c18d1f0?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1520639889313-72702c18d1f0?w=800&q=80'], category: 'Outdoor', stock: 15, merchant_id: defaultMerchantId, description: 'Unmatched grip for the most demanding trails.' },
        { name: 'CloudSleep Travel Pro', sku: 'PILLOW-008', price: 2200, compare_at_price: 3500, image_url: 'https://images.unsplash.com/photo-1584305116359-ef81baaf2fd3?w=800&q=80', image_urls: ['https://images.unsplash.com/photo-1584305116359-ef81baaf2fd3?w=800&q=80'], category: 'Accessories', stock: 200, merchant_id: defaultMerchantId, description: 'Memory foam comfort for long-haul journeys.' }
    ];

    try {
        const { error } = await supabase.from('products').upsert(products, { onConflict: 'sku' });
        if (error) throw error;
        res.json({ success: true, message: 'Products seeded successfully with enhanced descriptions and metadata' });
    } catch (error: any) {
        console.error('Seed error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

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
