import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Helper to send order email using Nodemailer & Hostinger SMTP
const sendOrderEmail = async (email: string, order: any, items: any, subtotal: number, shippingCost: number, total: number, shippingAddress: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP credentials missing, skipping email.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true, // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

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
                    ${variants ? `<div style="color: #f85606; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">${variants}</div>` : ''}
                    <div style="color: #757575; font-size: 12px;">Qty: ${item.quantity} | Rs. ${item.price.toLocaleString()} each</div>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 700; color: #212121; vertical-align: top;">
                    Rs. ${(item.price * item.quantity).toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Hooray! Your Order #${order.order_number} is Confirmed`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f6; color: #212121;">
                    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                        
                        <!-- Top Accent Bar -->
                        <div style="height: 6px; background-color: #f85606;"></div>

                        <!-- Logo Section -->
                        <div style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #eeeeee;">
                            <h1 style="margin: 0; color: #f85606; font-size: 32px; font-weight: 900; letter-spacing: -1px; font-style: italic;">TARZIFY</h1>
                            <p style="margin: 5px 0 0 0; color: #424242; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Elevating Your Lifestyle</p>
                        </div>

                        <!-- Success Header -->
                        <div style="padding: 40px 40px 30px; text-align: center;">
                            <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 15px;">
                                <tr>
                                    <td align="center" valign="middle" style="color: #f85606; font-size: 64px; font-weight: bold; line-height: 1;">
                                        &#10003;
                                    </td>
                                </tr>
                            </table>
                            <h2 style="margin: 0 0 10px 0; color: #212121; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Order Confirmed!</h2>
                            <p style="margin: 0; color: #424242; font-size: 16px; line-height: 1.5; font-weight: 500;">Hi there! We've received your order and we're getting it ready for shipment.</p>
                        </div>

                        <!-- Order Summary Box -->
                        <div style="padding: 0 40px 40px;">
                            <div style="background-color: #f9f9f9; border-radius: 12px; padding: 25px; border: 1px solid #eeeeee;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding-bottom: 15px; font-size: 11px; color: #424242; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Order ID</td>
                                        <td style="padding-bottom: 15px; font-size: 11px; color: #424242; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; text-align: right;">Date</td>
                                    </tr>
                                    <tr>
                                        <td style="font-size: 20px; color: #f85606; font-weight: 900; letter-spacing: -0.5px;">#${order.order_number}</td>
                                        <td style="font-size: 16px; color: #212121; font-weight: 800; text-align: right;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Items List -->
                            <div style="margin-top: 30px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    ${itemsRows}
                                </table>
                            </div>

                            <!-- Totals -->
                            <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #212121;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #424242; font-size: 14px; font-weight: 600;">Subtotal</td>
                                        <td style="padding: 8px 0; text-align: right; color: #212121; font-weight: 700; font-size: 15px;">Rs. ${subtotal.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #424242; font-size: 14px; font-weight: 600;">Shipping</td>
                                        <td style="padding: 8px 0; text-align: right; color: #212121; font-weight: 700; font-size: 15px;">Rs. ${shippingCost.toLocaleString()}</td>
                                    </tr>
                                    ${order.discount_amount > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 600;">Discount</td>
                                        <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 700; font-size: 15px;">- Rs. ${order.discount_amount.toLocaleString()}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 20px 0 0 0; color: #212121; font-size: 20px; font-weight: 900;">Total Amount</td>
                                        <td style="padding: 20px 0 0 0; text-align: right; color: #f85606; font-size: 24px; font-weight: 900;">Rs. ${total.toLocaleString()}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Payment & Shipping Info -->
                            <div style="margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 30px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                                            <h3 style="margin: 0 0 10px 0; font-size: 11px; color: #424242; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Shipping To</h3>
                                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #212121; font-weight: 700;">${shippingAddress}</p>
                                        </td>
                                        <td style="width: 50%; vertical-align: top;">
                                            <h3 style="margin: 0 0 10px 0; font-size: 11px; color: #424242; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Payment Method</h3>
                                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #212121; font-weight: 700;">${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online (FastPay)'}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Track Button -->
                            <div style="margin-top: 50px; text-align: center;">
                                <a href="https://tarzify.com/#track-order?id=${order.order_number}" style="display: inline-block; background-color: #f85606; color: #ffffff; padding: 20px 45px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 20px rgba(248, 86, 6, 0.3);">Track My Order Now</a>
                            </div>

                        </div>

                        <!-- Friendly Footer -->
                        <div style="background-color: #1a1a1a; padding: 40px; text-align: center; color: #ffffff;">
                            <div style="margin-bottom: 25px;">
                                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; letter-spacing: 1px;">QUESTIONS?</h4>
                                <p style="margin: 0; font-size: 14px; opacity: 0.8; font-weight: 500;">Email us anytime at <a href="mailto:support@tarzify.com" style="color: #f85606; text-decoration: none; font-weight: 800; border-bottom: 1px solid #f85606;">support@tarzify.com</a></p>
                            </div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 25px; font-size: 12px; opacity: 0.6; font-weight: 500;">
                                <p style="margin: 0 0 8px 0; letter-spacing: 0.5px;">&copy; 2026 TARZIFY. HIGH QUALITY LIFESTYLE STORE.</p>
                                <p style="margin: 0;">This is an automated confirmation email. Please do not reply.</p>
                            </div>
                        </div>

                    </div>
                </body>
                </html>
            `
        });
        console.log('Order email sent successfully via Hostinger SMTP.');
    } catch (error) {
        console.error('Nodemailer error:', error);
    }
};

const sendMerchantOrderEmail = async (merchantEmail: string, order: any, merchantItems: any, customerName: string, shippingAddress: string, phone: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const itemsRows = merchantItems.map((item: any) => {
        const variants = item.variant_combo && Object.entries(item.variant_combo).length > 0
            ? Object.entries(item.variant_combo).map(([k, v]) => `${k}: ${v}`).join(' | ')
            : '';

        return `
            <tr>
                <td style="padding: 15px 15px 15px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" width="60" height="60" style="border-radius: 8px; object-fit: cover;" alt="${item.name}">
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee;">
                    <div style="font-weight: 700; color: #212121; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
                    ${variants ? `<div style="color: #f85606; font-size: 11px; font-weight: 700; text-transform: uppercase;">${variants}</div>` : ''}
                    <div style="color: #757575; font-size: 12px; margin-top: 4px;">Quantity: ${item.quantity}</div>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 700; color: #f85606; vertical-align: top;">
                    Rs. ${(item.price * item.quantity).toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY Seller" <${process.env.SMTP_USER}>`,
            to: merchantEmail,
            subject: `New Order Received: #${order.order_number}`,
            html: `
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f4f4f6; color: #212121;">
                    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                        <div style="height: 6px; background-color: #f85606;"></div>
                        <div style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #eeeeee;">
                            <h1 style="margin: 0; color: #f85606; font-size: 28px; font-weight: 900; font-style: italic;">TARZIFY SELLER</h1>
                        </div>
                        <div style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 900;">New Sale!</h2>
                            <p style="font-size: 16px; color: #424242;">Congratulations! You just received a new order from <strong>${customerName}</strong>.</p>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #eeeeee;">
                                <h3 style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #757575;">Order Details</h3>
                                <p style="margin: 0; font-size: 16px; font-weight: 900; color: #f85606;">#${order.order_number}</p>
                                <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>Customer Phone:</strong> ${phone}</p>
                                <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Shipping Address:</strong><br>${shippingAddress}</p>
                            </div>

                            <table style="width: 100%; border-collapse: collapse;">
                                ${itemsRows}
                            </table>

                            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #212121;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 5px 0; font-size: 14px; color: #757575; font-weight: 600;">Subtotal</td>
                                        <td style="padding: 5px 0; font-size: 14px; color: #212121; font-weight: 700; text-align: right;">Rs. ${merchantItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-size: 14px; color: #757575; font-weight: 600;">Shipping</td>
                                        <td style="padding: 5px 0; font-size: 14px; color: #212121; font-weight: 700; text-align: right;">Rs. ${(order.shipping_amount || 0).toLocaleString()}</td>
                                    </tr>
                                    ${order.discount_amount > 0 ? `
                                    <tr>
                                        <td style="padding: 5px 0; font-size: 14px; color: #059669; font-weight: 600;">Voucher Discount</td>
                                        <td style="padding: 5px 0; font-size: 14px; color: #059669; font-weight: 700; text-align: right;">- Rs. ${order.discount_amount.toLocaleString()}</td>
                                    </tr>
                                    ` : ''}
                                    <tr>
                                        <td style="padding: 15px 0 0 0; font-size: 18px; color: #212121; font-weight: 900;">Grand Total</td>
                                        <td style="padding: 15px 0 0 0; font-size: 20px; color: #f85606; font-weight: 900; text-align: right;">Rs. ${order.total_amount.toLocaleString()}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="margin-top: 40px; text-align: center;">
                                <a href="https://tarzify.com/merchant" style="display: inline-block; background-color: #f85606; color: #ffffff; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase;">Go to Dashboard</a>
                            </div>
                        </div>
                        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; color: #ffffff; font-size: 10px; opacity: 0.6;">
                            <p>&copy; 2026 TARZIFY. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        console.log(`Merchant notification sent to ${merchantEmail}`);
    } catch (error) {
        console.error('Error sending merchant notification email:', error);
    }
};

const sendStatusUpdateEmail = async (email: string, order: any, status: string, trackingData?: any) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP credentials missing, skipping status update email.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const statusColors: Record<string, string> = {
        pending: '#f85606',
        shipped: '#2196f3',
        delivered: '#4caf50',
        cancelled: '#f44336'
    };

    const statusMessages: Record<string, string> = {
        shipped: 'Great news! Your package is on its way.',
        delivered: 'Hooray! Your order has been delivered.',
        pending: 'We are processing your order.',
        cancelled: 'Your order has been cancelled.'
    };

    const trackingHtml = trackingData?.tracking_number ? `
        <div style="margin: 30px 0; padding: 25px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #eeeeee;">
            <h3 style="margin: 0 0 15px 0; font-size: 11px; color: #424242; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Tracking Information</h3>
            <p style="margin: 0 0 5px 0; font-size: 14px; color: #212121; font-weight: 700;">Courier: ${trackingData.courier_name}</p>
            <p style="margin: 0; font-size: 16px; color: #f85606; font-weight: 900;">CN: ${trackingData.tracking_number}</p>
            ${trackingData.shipping_proof_url ? `<div style="margin-top: 15px;"><img src="${trackingData.shipping_proof_url}" style="width: 100%; max-width: 200px; border-radius: 8px;" alt="Shipping Proof"></div>` : ''}
        </div>
    ` : '';

    let reviewHtml = '';
    if (status === 'delivered') {
        try {
            // Fetch items for this order
            const { data: items } = await supabase
                .from('order_items')
                .select('*, products(name)')
                .eq('order_id', order.id);

            // Fetch existing reviews for this order
            const { data: existingReviews } = await supabase
                .from('reviews')
                .select('product_id')
                .eq('order_id', order.id);

            const reviewedProductIds = new Set(existingReviews?.map(r => r.product_id) || []);
            const itemsToReview = items?.filter((item: any) => !reviewedProductIds.has(item.product_id)) || [];

            if (itemsToReview.length > 0) {
                const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'tarzify-review-secret';
                // Production backend URL
                const baseUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://backend.tarzify.com/api' : 'http://localhost:5000/api');

                const itemsList = itemsToReview.map((item: any) => {
                    const stars = [1, 2, 3, 4, 5].map(star => {
                        const sig = crypto.createHmac('sha256', secret)
                            .update(`${order.id}:${item.product_id}:${order.user_id}:${star}`)
                            .digest('hex')
                            .substring(0, 16);

                        const rateUrl = `${baseUrl}/orders/rate-item?order_id=${order.id}&product_id=${item.product_id}&user_id=${order.user_id}&rating=${star}&sig=${sig}`;
                        return `<a href="${rateUrl}" style="text-decoration: none; font-size: 24px; color: #ffc107;">★</a>`;
                    }).join(' ');

                    const combo = item.variant_combo || item.combination || {};
                    const variantsStr = Object.entries(combo).length > 0
                        ? ' [' + Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(', ') + ']'
                        : '';

                    return `
                        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eeeeee; border-radius: 12px;">
                            <p style="margin: 0 0 10px 0; font-weight: 700; font-size: 14px; text-align: left;">${item.products?.name || 'Product'}${variantsStr}</p>
                            <div style="letter-spacing: 5px; text-align: left;">${stars}</div>
                            <p style="margin: 5px 0 0 0; font-size: 10px; color: #757575; text-align: left;">Click a star to rate instantly</p>
                        </div>
                    `;
                }).join('');

                reviewHtml = `
                    <div style="margin-top: 40px; border-top: 2px solid #f85606; padding-top: 30px; text-align: center;">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">Rate Your Experience</h3>
                        <p style="margin: 0 0 25px 0; font-size: 14px; color: #424242;">How did you like your items? Your feedback helps us improve!</p>
                        ${itemsList}
                    </div>
                `;
            }
        } catch (err) {
            console.error('Error fetching items for review email:', err);
        }
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order Update #${order.order_number}: ${status.toUpperCase()}`,
            html: `
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f4f4f6; color: #212121;">
                    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                        <div style="height: 6px; background-color: ${statusColors[status] || '#f85606'};"></div>
                        <div style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #eeeeee;">
                            <h1 style="margin: 0; color: #f85606; font-size: 32px; font-weight: 900; font-style: italic;">TARZIFY</h1>
                        </div>
                        <div style="padding: 40px;">
                            <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 900;">Order Update</h2>
                            <p style="font-size: 16px; color: #424242;">${statusMessages[status] || 'Your order status has changed.'}</p>
                            
                            <div style="margin: 20px 0; font-size: 14px; font-weight: 700; color: #757575;">
                                Order Number: <span style="color: #f85606;">#${order.order_number}</span><br>
                                New Status: <span style="color: ${statusColors[status] || '#f85606'}; text-transform: uppercase;">${status}</span>
                            </div>

                            ${trackingHtml}
                            ${reviewHtml}

                            <div style="margin-top: 40px; text-align: center;">
                                <a href="https://tarzify.com/#track-order?id=${order.order_number}" style="display: inline-block; background-color: #f85606; color: #ffffff; padding: 15px 35px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase;">Track Your Order</a>
                            </div>
                        </div>
                        <div style="background-color: #1a1a1a; padding: 30px; text-align: center; color: #ffffff; font-size: 12px; opacity: 0.6;">
                            <p>&copy; 2026 TARZIFY. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        console.log(`Status update email (${status}) sent to ${email}`);
    } catch (error) {
        console.error('Error sending status email:', error);
    }
};

router.post('/create', async (req, res) => {
    const { userId, items, total, shippingAddress, phone, paymentMethod, customerName, voucherId, discountAmount, shippingAmount } = req.body;

    // Validation: All fields mandatory
    if (!customerName || !shippingAddress || !phone || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required information. Please provide full name, address, and phone number.'
        });
    }

    const generateOrderId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomChar1 = chars.charAt(Math.floor(Math.random() * chars.length));
        const randomChar2 = chars.charAt(Math.floor(Math.random() * chars.length));
        const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6 digits
        return `${randomChar1}${randomChar2}${randomDigits}`;
    };

    try {
        // 1. Verify Stock for all items first (Global and Variant-Specific)
        const merchantMap: Record<string, string> = {};
        for (const item of items) {
            const { data: product, error: stockErr } = await supabase
                .from('products')
                .select('stock, name, pricing_matrix, merchant_id')
                .eq('id', item.id)
                .single();

            if (stockErr || !product) throw new Error(`Product ${item.id} not found`);
            if (product.merchant_id) merchantMap[item.id] = product.merchant_id;

            // Check specific variant stock if variant_combo exists
            if (item.variant_combo && product.pricing_matrix && Array.isArray(product.pricing_matrix)) {
                const variant = product.pricing_matrix.find((v: any) =>
                    JSON.stringify(v.variant_combo) === JSON.stringify(item.variant_combo)
                );

                if (variant) {
                    if (variant.stock < item.quantity) {
                        const variantStr = Object.entries(item.variant_combo).map(([k, v]) => `${k}: ${v}`).join(', ');
                        throw new Error(`Insufficient stock for "${product.name}" [${variantStr}]. Only ${variant.stock} left.`);
                    }
                } else {
                    // If variant not found in matrix, fall back to global stock or error?
                    // Usually, if a product has a matrix, the variant MUST exist.
                    if (product.stock < item.quantity) {
                        throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock} left.`);
                    }
                }
            } else {
                // Global stock check
                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock} left.`);
                }
            }
        }

        let order;
        let retries = 0;
        const maxRetries = 3;
        let finalDiscountAmount = 0;

        while (retries < maxRetries) {
            const customId = generateOrderId();
            finalDiscountAmount = 0;
            let actualVoucherId = null;

            if (voucherId) {
                const { data: voucherVerify } = await supabase
                    .from('vouchers')
                    .select('*')
                    .eq('id', voucherId)
                    .single();

                if (voucherVerify) {
                    actualVoucherId = voucherId;
                    const applicableItems = voucherVerify.merchant_id 
                        ? items.filter((item: any) => item.merchant_id === voucherVerify.merchant_id)
                        : items;
                    
                    const applicableSubtotal = applicableItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
                    
                    let serverDiscount = 0;
                    if (voucherVerify.type === 'percentage') {
                        serverDiscount = (applicableSubtotal * voucherVerify.value) / 100;
                        if (voucherVerify.max_discount && serverDiscount > voucherVerify.max_discount) {
                            serverDiscount = voucherVerify.max_discount;
                        }
                    } else {
                        serverDiscount = Math.min(voucherVerify.value, applicableSubtotal);
                    }
                    
                    finalDiscountAmount = Math.min(discountAmount || 0, Math.round(serverDiscount));
                }
            }

            const { data, error } = await supabase
                .from('orders')
                .insert({
                    user_id: userId,
                    total_amount: total,
                    status: 'pending',
                    shipping_address: shippingAddress,
                    phone: phone,
                    payment_method: paymentMethod || 'cod',
                    order_number: customId,
                    customer_name: customerName,
                    voucher_id: actualVoucherId,
                    discount_amount: finalDiscountAmount,
                    shipping_amount: shippingAmount || (total - items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) + finalDiscountAmount)
                })
                .select()
                .single();

            if (!error) {
                order = data;
                break;
            }
            if (error.code !== '23505') throw error;
            retries++;
        }

        if (!order) throw new Error("Failed to generate unique order ID");

        const orderItems = items.map((item: any) => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            variant_combo: item.variant_combo || {}
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // 2.2 Record Voucher Usage
        if (voucherId && userId) {
            try {
                const { error: usageError } = await supabase.from('voucher_usage').insert({
                    voucher_id: voucherId,
                    user_id: userId,
                    order_id: order.id
                });
                
                if (usageError) {
                    if (usageError.code === '23505') {
                        console.warn(`Voucher ${voucherId} already used by user ${userId}. Strict enforcement.`);
                        // Optional: Refund/Cancel order if usage fails?
                        // For now we just log it as the validate endpoint should have caught it.
                    } else {
                        throw usageError;
                    }
                } else {
                    // Increment used_count ONLY if usage record was created
                    await supabase.rpc('increment_voucher_usage', { v_id: voucherId });
                }
            } catch (err) {
                console.error('Error recording voucher usage:', err);
            }
        }

        // Fetch user email for notification
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData?.user?.email;

        // Send Confirmation Email via Hostinger SMTP
        const finalEmail = req.body.email || email; // Prefer provided email from body

        const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const shippingCost = shippingAmount !== undefined ? shippingAmount : (total - subtotal + (finalDiscountAmount || 0));

        // Send customer email BEFORE res.json() - Vercel kills background tasks after response
        if (finalEmail) {
            console.log(`Sending order email to: ${finalEmail}`);
            try {
                await sendOrderEmail(finalEmail, order, items, subtotal, shippingCost, total, shippingAddress);
                console.log('Customer email sent successfully');
            } catch (emailErr) {
                console.error('Customer email failed:', emailErr);
                // Don't fail the order if email fails
            }
        } else {
            console.warn('No email found for order notification. Skipping.');
        }

        // 2.5 Notify Merchants - await all in parallel before responding
        try {
            const merchantGroups: Record<string, any[]> = {};
            for (const item of items) {
                const merchantId = merchantMap[item.id];
                if (merchantId) {
                    if (!merchantGroups[merchantId]) merchantGroups[merchantId] = [];
                    merchantGroups[merchantId].push(item);
                }
            }

            // Fetch all merchant emails in parallel, then send emails in parallel
            const merchantEmailPromises = Object.entries(merchantGroups).map(async ([merchantId, merchantItems]) => {
                const { data: merchantProfile } = await supabase.from('profiles').select('email').eq('id', merchantId).single();
                if (merchantProfile?.email) {
                    await sendMerchantOrderEmail(merchantProfile.email, order, merchantItems, customerName, shippingAddress, phone);
                    console.log(`Merchant email sent to ${merchantProfile.email}`);
                }
            });

            await Promise.allSettled(merchantEmailPromises);
        } catch (mErr) {
            console.error('Error in merchant notification flow:', mErr);
        }

        // 3. Decrement stock
        for (const item of items) {
            await supabase.rpc('decrement_stock', {
                product_id: parseInt(item.id),
                amount: parseInt(item.quantity),
                v_combo: item.variant_combo || null
            });
        }
        // 4. Fetch the full order with its items to return to frontend
        const { data: fullOrder, error: fetchError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        name,
                        sku
                    )
                )
            `)
            .eq('id', order.id)
            .single();

        if (fetchError) {
            console.error('Error fetching created order:', fetchError);
            // Fallback to minimal response if fetch fails
            return res.json({ success: true, orderId: order.order_number, order: order });
        }

        res.json({ success: true, orderId: order.order_number, order: fullOrder });
    } catch (error: any) {
        console.error('Order creation error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

router.patch('/status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // 1. Update status
        const { data: order, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Fetch user email (orders table has customer_name, but we need email)
        const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
        const email = userData?.user?.email;

        // 3. Send notification
        if (email) {
            await sendStatusUpdateEmail(email, order, status);
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.patch('/assign-tracking/:id', async (req, res) => {
    const { id } = req.params;
    const { tracking_number, courier_name, shipping_proof_url } = req.body;

    try {
        // 1. Update status and tracking
        const { data: order, error } = await supabase
            .from('orders')
            .update({
                tracking_number,
                courier_name,
                shipping_proof_url,
                status: 'shipped' // Automatically move to shipped when tracking is assigned
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Fetch user email
        const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
        const email = userData?.user?.email;

        // 3. Send notification with tracking info
        if (email) {
            await sendStatusUpdateEmail(email, order, 'shipped', {
                tracking_number,
                courier_name,
                shipping_proof_url
            });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Direct Review Redirect from Email to Frontend
router.get('/rate-item', async (req, res) => {
    const { order_id, product_id, user_id, rating, sig } = req.query;

    if (!order_id || !product_id || !user_id || !rating || !sig) {
        return res.status(400).send('Invalid rating link.');
    }

    try {
        // 1. Verify Signature (just to be sure before redirecting)
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'tarzify-review-secret';
        const expectedSig = crypto.createHmac('sha256', secret)
            .update(`${order_id}:${product_id}:${user_id}:${rating}`)
            .digest('hex')
            .substring(0, 16);

        if (sig !== expectedSig) {
            return res.status(403).send('Invalid or expired rating link.');
        }

        // 2. Redirect to Frontend Review Page
        const baseUrl = process.env.FRONTEND_URL || 'https://tarzify.com';
        const redirectUrl = `${baseUrl}/#rate-product?order_id=${order_id}&product_id=${product_id}&user_id=${user_id}&rating=${rating}&sig=${sig}`;
        
        res.redirect(redirectUrl);
    } catch (error: any) {
        console.error('Review redirect error:', error);
        res.status(500).send('Error processing review link. Please try manually on the website.');
    }
});

// Full Review Submission API (Supports images and comments)
router.post('/submit-review', async (req, res) => {
    const { order_id, product_id, user_id, rating, comment, image_urls, sig } = req.body;

    if (!order_id || !product_id || !user_id || !rating) {
        return res.status(400).json({ success: false, error: 'Missing review data.' });
    }

    try {
        // 1. Verify Signature if provided (essential for email-triggered reviews)
        if (sig) {
            const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'tarzify-review-secret';
            const expectedSig = crypto.createHmac('sha256', secret)
                .update(`${order_id}:${product_id}:${user_id}:${rating}`)
                .digest('hex')
                .substring(0, 16);

            if (sig !== expectedSig) {
                return res.status(403).json({ success: false, error: 'Invalid review signature.' });
            }
        } else {
            // If no signature, the user MUST be the one who owns the order
            // (This check should also be handled by Supabase RLS, but we can double check here)
            const { data: order } = await supabase
                .from('orders')
                .select('user_id, status')
                .eq('id', order_id)
                .single();

            if (!order || order.user_id !== user_id) {
                return res.status(403).json({ success: false, error: 'Unauthorized to review this order.' });
            }
            if (order.status !== 'delivered') {
                return res.status(400).json({ success: false, error: 'Product must be delivered before reviewing.' });
            }
        }

        // 2. Strict Payload Validation
        const safeComment = (comment || '').substring(0, 2000); // Guard against massive text payloads
        
        const safeImageUrls = Array.isArray(image_urls) ? image_urls : [];
        if (safeImageUrls.length > 5) {
            return res.status(400).json({ success: false, error: 'Maximum 5 images allowed per review.' });
        }

        // URL White-listing: only allow Cloudinary URLs for security
        const isSecure = safeImageUrls.every(url => 
            typeof url === 'string' && url.startsWith('https://res.cloudinary.com/')
        );

        if (!isSecure) {
            return res.status(400).json({ success: false, error: 'Invalid image source found. Please use the official upload tool.' });
        }

        // 3. Upsert Review
        const { error } = await supabase
            .from('reviews')
            .upsert({
                order_id: Number(order_id),
                product_id: Number(product_id),
                user_id: String(user_id),
                rating: Number(rating),
                comment: safeComment,
                image_urls: safeImageUrls,
                created_at: new Date().toISOString()
            }, {
                onConflict: 'product_id,order_id'
            });

        if (error) throw error;

        res.json({ success: true, message: 'Review submitted successfully!' });
    } catch (error: any) {
        console.error('Review submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
