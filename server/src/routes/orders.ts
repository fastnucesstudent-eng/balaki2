import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';

const router = express.Router();
console.log('📦 Orders Router Initializing...');

// Helper to send email using Nodemailer & Hostinger SMTP
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST?.trim() || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT?.trim()) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER?.trim(),
            pass: process.env.SMTP_PASS?.trim()
        }
    });
};

const sendOrderEmail = async (email: string, order: any, items: any, subtotal: number, shippingCost: number, total: number, shippingAddress: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    const itemsRows = items.map((item: any) => {
        const variants = item.variant_combo && Object.entries(item.variant_combo).length > 0
            ? Object.entries(item.variant_combo).map(([k, v]) => `${k}: ${v}`).join(' | ')
            : '';
        return `
            <tr>
                <td style="padding: 15px 15px 15px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" width="60" height="60" style="border-radius: 8px; block-size: 60px; object-fit: cover;" alt="${item.name}">
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: 700; color: #212121; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
                    ${variants ? `<div style="color: #f85606; font-size: 11px; font-weight: 700; text-transform: uppercase;">${variants}</div>` : ''}
                    <div style="color: #757575; font-size: 12px;">Qty: ${item.quantity} | Rs. ${item.price.toLocaleString()} each</div>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 700; color: #212121;">
                    Rs. ${(item.price * item.quantity).toLocaleString()}
                </td>
            </tr>`;
    }).join('');

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${order.order_number} Confirmed`,
            html: `<h1>Order Confirmed!</h1><p>Hi! We've received your order #${order.order_number}.</p><table>${itemsRows}</table><p>Total: Rs. ${total.toLocaleString()}</p>`
        });
    } catch (error) { console.error('Email error:', error); }
};

const sendMerchantOrderEmail = async (merchantEmail: string, order: any, merchantItems: any, customerName: string, shippingAddress: string, phone: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    const itemsRows = merchantItems.map((item: any) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>Rs. ${item.price}</td></tr>`).join('');
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY Seller" <${process.env.SMTP_USER}>`,
            to: merchantEmail,
            subject: `New Order: #${order.order_number}`,
            html: `<h1>New Sale!</h1><p>Order #${order.order_number} from ${customerName}.</p><table>${itemsRows}</table>`
        });
    } catch (error) { console.error('Merchant email error:', error); }
};

const sendStatusUpdateEmail = async (email: string, order: any, status: string, trackingData?: any) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${order.order_number} Status: ${status.toUpperCase()}`,
            html: `<h1>Order Update</h1><p>Your order #${order.order_number} is now ${status}.</p>`
        });
    } catch (error) { console.error('Status email error:', error); }
};

const sendCancellationEmail = async (email: string, customerName: string, orderId: string, cancelledBy: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${orderId} Cancelled`,
            html: `<h1>Order Cancelled</h1><p>Hi ${customerName}, your order #${orderId} was cancelled by ${cancelledBy}.</p>`
        });
    } catch (error) { console.error('Cancellation email error:', error); }
};

const sendMerchantCancellationNotification = async (email: string, storeName: string, orderId: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${orderId} Cancelled by Customer`,
            html: `<h1>Order Cancelled</h1><p>Hi ${storeName}, order #${orderId} was cancelled by the customer.</p>`
        });
    } catch (error) { console.error('Merchant cancellation error:', error); }
};

router.post('/create', async (req, res) => {
    const { userId, items, total, shippingAddress, phone, paymentMethod, customerName, voucherId, discountAmount, shippingAmount } = req.body;
    if (!customerName || !shippingAddress || !phone || !items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing information' });
    }
    const generateOrderId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return chars.charAt(Math.floor(Math.random() * chars.length)) + chars.charAt(Math.floor(Math.random() * chars.length)) + Math.floor(100000 + Math.random() * 900000);
    };
    try {
        const merchantMap: Record<string, string> = {};
        for (const item of items) {
            const { data: product } = await supabase.from('products').select('*').eq('id', item.id).single();
            if (!product) throw new Error(`Product ${item.id} not found`);
            merchantMap[item.id] = product.merchant_id;
            if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
        }
        const order_number = generateOrderId();
        const { data: order, error: orderErr } = await supabase.from('orders').insert({
            user_id: userId, total_amount: total, status: 'pending', shipping_address: shippingAddress, phone, payment_method: paymentMethod || 'cod', order_number, customer_name: customerName, email: req.body.email, voucher_id: voucherId, discount_amount: discountAmount || 0, shipping_amount: shippingAmount || 0
        }).select().single();
        if (orderErr) throw orderErr;
        const orderItems = items.map((item: any) => ({ order_id: order.id, product_id: item.id, quantity: item.quantity, price: item.price, variant_combo: item.variant_combo || {}, user_id: userId }));
        await supabase.from('order_items').insert(orderItems);
        for (const item of items) {
            await supabase.rpc('decrement_stock', { product_id: parseInt(item.id), amount: parseInt(item.quantity), v_combo: item.variant_combo || null });
        }
        await sendOrderEmail(order.email, order, items, total - (shippingAmount || 0), shippingAmount || 0, total, shippingAddress);
        res.json({ success: true, orderId: order.order_number, order });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { data: order, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
        if (error) throw error;
        if (order.email) await sendStatusUpdateEmail(order.email, order, status);
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/assign-tracking/:id', async (req, res) => {
    const { id } = req.params;
    const { tracking_number, courier_name, shipping_proof_url } = req.body;
    try {
        const { data: order, error } = await supabase.from('orders').update({ tracking_number, courier_name, shipping_proof_url, status: 'shipped' }).eq('id', id).select().single();
        if (error) throw error;
        if (order.email) await sendStatusUpdateEmail(order.email, order, 'shipped', { tracking_number, courier_name, shipping_proof_url });
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/cancel-customer/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    try {
        const { data: order } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single();
        if (!order || order.user_id !== userId) throw new Error('Unauthorized');
        if (order.status !== 'pending') throw new Error('Cannot cancel');
        const diff = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
        if (diff > 24) throw new Error('Expired');
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
        for (const item of order.order_items) {
            await supabase.rpc('increment_stock', { product_id: item.product_id, amount: item.quantity, v_combo: item.variant_combo });
        }
        await sendCancellationEmail(order.email, order.customer_name, order.order_number, 'you');
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.get('/cancel-merchant/:id', (req, res) => res.json({ message: 'GET reached' }));
router.post('/cancel-merchant/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    console.log(`[CANCEL MERCHANT] Order ID: ${id}, User ID: ${userId}`);
    try {
        const { data: order } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).single();
        if (!order || ['shipped', 'delivered', 'cancelled'].includes(order.status)) {
            throw new Error('Order cannot be cancelled in its current state');
        }
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
        for (const item of order.order_items) {
            await supabase.rpc('increment_stock', { product_id: item.product_id, amount: item.quantity, v_combo: item.variant_combo });
        }
        await sendCancellationEmail(order.email, order.customer_name, order.order_number, 'the merchant');
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

export default router;
