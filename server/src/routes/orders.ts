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

const sendOrderEmail = async (email: string, order: any, items: any, subtotal: number, shippingCost: number, discountAmount: number, total: number, shippingAddress: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';
    const trackUrl = `${frontendUrl}/#track-order?id=${order.order_number}`;

    const itemsRows = items.map((item: any) => {
        const variants = item.variant_combo && Object.entries(item.variant_combo).length > 0
            ? Object.entries(item.variant_combo).map(([k, v]) => `${k}: ${v}`).join(' | ')
            : '';
        return `
            <tr>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; width: 60px;" valign="top">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" width="60" height="60" style="border-radius: 8px; display: block; object-fit: cover;" alt="${item.name}">
                </td>
                <td style="padding: 15px 15px; border-bottom: 1px solid #eeeeee;">
                    <div style="font-family: Arial, sans-serif; font-weight: 700; color: #212121; font-size: 14px; margin-bottom: 4px;">${item.name}</div>
                    ${variants ? `<div style="font-family: Arial, sans-serif; color: #f85606; font-size: 11px; font-weight: 700; text-transform: uppercase;">${variants}</div>` : ''}
                    <div style="font-family: Arial, sans-serif; color: #757575; font-size: 12px;">Qty: ${item.quantity} | Rs. ${item.price.toLocaleString()} each</div>
                </td>
                <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-family: Arial, sans-serif; font-weight: 700; color: #212121;" valign="top">
                    Rs. ${(item.price * item.quantity).toLocaleString()}
                </td>
            </tr>`;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 4px; overflow: hidden;">
                            <!-- Header Logo -->
                            <tr>
                                <td align="center" style="padding: 40px 0 20px 0;">
                                    <img src="${frontendUrl}/logo.png" alt="TARZIFY" width="140" style="display: block; margin-bottom: 10px;">
                                    <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 2px;">ELEVATING YOUR LIFESTYLE</div>
                                </td>
                            </tr>
                            
                            <!-- Success Icon -->
                            <tr>
                                <td align="center" style="padding: 20px;">
                                    <div style="font-size: 48px; color: #f85606; line-height: 1;">✔</div>
                                    <h1 style="font-family: Arial, sans-serif; font-size: 28px; font-weight: 900; margin: 15px 0 0 0; text-transform: uppercase; font-style: italic;">Order Confirmed!</h1>
                                    <p style="font-family: Arial, sans-serif; color: #666; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0; padding: 0 40px;">Hi there! We've received your order and we're getting it ready for shipment.</p>
                                </td>
                            </tr>

                            <!-- Order Summary Box -->
                            <tr>
                                <td style="padding: 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 12px;">
                                        <tr>
                                            <td width="50%">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">ORDER ID</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; color: #f85606;">#${order.order_number}</div>
                                            </td>
                                            <td width="50%" align="right">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">DATE</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 700;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Items List -->
                            <tr>
                                <td style="padding: 0 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        ${itemsRows}
                                    </table>
                                </td>
                            </tr>

                            <!-- Totals -->
                            <tr>
                                <td style="padding: 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 2px solid #212121; padding-top: 15px;">
                                        <tr>
                                            <td style="font-family: Arial, sans-serif; font-size: 14px; padding: 5px 0; color: #666;">Subtotal</td>
                                            <td align="right" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700;">Rs. ${subtotal.toLocaleString()}</td>
                                        </tr>
                                                                                 <tr>
                                             <td style="font-family: Arial, sans-serif; font-size: 14px; padding: 5px 0; color: #27ae60;">Discount</td>
                                             <td align="right" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; color: #27ae60;">- Rs. ${discountAmount.toLocaleString()}</td>
                                         </tr>
                                        <tr>
                                            <td style="font-family: Arial, sans-serif; font-size: 14px; padding: 5px 0; color: #666;">Shipping</td>
                                            <td align="right" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700;">Rs. ${shippingCost.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; padding: 15px 0;">Total Amount</td>
                                            <td align="right" style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; color: #f85606;">Rs. ${total.toLocaleString()}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Shipping & Payment Info -->
                            <tr>
                                <td style="padding: 0 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="border-top: 1px solid #eeeeee;">
                                        <tr>
                                            <td width="50%" valign="top" style="padding-left: 0;">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 10px;">SHIPPING TO</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 600; line-height: 1.4; color: #333;">${shippingAddress}</div>
                                            </td>
                                            <td width="50%" valign="top" style="padding-right: 0;">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 10px;">PAYMENT METHOD</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 600; color: #333;">${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- CTA Button -->
                            <tr>
                                <td align="center" style="padding: 40px 20px;">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" bgcolor="#f85606" style="border-radius: 8px;">
                                                <a href="${trackUrl}" target="_blank" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; color: #ffffff; text-decoration: none; padding: 18px 40px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">TRACK MY ORDER NOW</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #111111; padding: 40px 20px; color: #ffffff;">
                                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">QUESTIONS?</div>
                                    <p style="font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 30px; opacity: 0.8;">Email us anytime at <a href="mailto:support@tarzify.com" style="color: #f85606; text-decoration: none; font-weight: 700;">support@tarzify.com</a></p>
                                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; width: 100%;">
                                        <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; opacity: 0.5;">© 2026 TARZIFY. HIGH QUALITY LIFESTYLE STORE.</div>
                                        <div style="font-family: Arial, sans-serif; font-size: 10px; margin-top: 10px; opacity: 0.3;">This is an automated confirmation email. Please do not reply.</div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${order.order_number} Confirmed`,
            html
        });
    } catch (error) { console.error('Email error:', error); }
};

const sendMerchantOrderEmail = async (merchantEmail: string, order: any, merchantItems: any, customerName: string, shippingAddress: string, phone: string) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';

    const itemsRows = merchantItems.map((item: any) => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
                <div style="font-family: Arial, sans-serif; font-weight: 700; color: #212121; font-size: 14px;">${item.name}</div>
                <div style="font-family: Arial, sans-serif; color: #757575; font-size: 12px;">Qty: ${item.quantity} | Rs. ${item.price.toLocaleString()} each</div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-family: Arial, sans-serif; font-weight: 700;">
                Rs. ${(item.price * item.quantity).toLocaleString()}
            </td>
        </tr>`).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Order Received</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #eeeeee;">
                            <!-- Header -->
                            <tr>
                                <td align="center" bgcolor="#f85606" style="padding: 30px;">
                                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; opacity: 0.8;">New Order Received</div>
                                    <h1 style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #ffffff; margin: 0; text-transform: uppercase;">You have a new sale!</h1>
                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="padding: 30px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; border-bottom: 2px solid #f85606; padding-bottom: 20px;">
                                        <tr>
                                            <td>
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">ORDER NUMBER</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; color: #212121;">#${order.order_number}</div>
                                            </td>
                                            <td align="right">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">CUSTOMER</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: #212121;">${customerName}</div>
                                            </td>
                                        </tr>
                                    </table>

                                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; color: #f85606; text-transform: uppercase; margin-bottom: 15px;">ITEMS TO SHIP</div>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                        ${itemsRows}
                                    </table>

                                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #f9f9f9; border-radius: 8px; margin-bottom: 30px;">
                                        <tr>
                                            <td>
                                                <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; color: #212121; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #dddddd; padding-bottom: 10px;">SHIPPING DETAILS</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
                                                    <div style="margin-bottom: 10px;"><strong>Address:</strong><br>${shippingAddress}</div>
                                                    <div><strong>Phone:</strong> <a href="tel:${phone}" style="color: #f85606; text-decoration: none; font-weight: 700;">${phone}</a></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>

                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center">
                                                <a href="${frontendUrl}/#merchant" target="_blank" style="font-family: Arial, sans-serif; background-color: #212121; color: #ffffff; padding: 15px 30px; border-radius: 6px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; font-size: 14px;">Process Order in Dashboard</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #f4f4f4; padding: 20px; color: #999999; font-family: Arial, sans-serif; font-size: 12px;">
                                    <p>© 2026 TARZIFY MERCHANT SERVICES. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY Seller" <${process.env.SMTP_USER}>`,
            to: merchantEmail,
            subject: `New Order: #${order.order_number}`,
            html
        });
    } catch (error) { console.error('Merchant email error:', error); }
};

const sendStatusUpdateEmail = async (email: string, order: any, status: string, trackingData?: any) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const transporter = getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';
    const trackUrl = `${frontendUrl}/#track-order?id=${order.order_number}`;

    let statusTitle = '';
    let statusIcon = '';
    let statusMessage = '';
    let statusColor = '#f85606';

    if (status === 'shipped') {
        statusTitle = 'Order Shipped!';
        statusIcon = '🚚';
        statusMessage = `Great news! Your order #${order.order_number} has been shipped and is on its way to you.`;
    } else if (status === 'delivered') {
        statusTitle = 'Order Delivered!';
        statusIcon = '🎁';
        statusMessage = `Your order #${order.order_number} has been delivered. We hope you love your new purchase!`;
        statusColor = '#27ae60';
    } else if (status === 'cancelled') {
        statusTitle = 'Order Cancelled';
        statusIcon = '❌';
        statusMessage = `Your order #${order.order_number} has been cancelled.`;
        statusColor = '#e74c3c';
    } else {
        statusTitle = `Order ${status.toUpperCase()}`;
        statusIcon = '📦';
        statusMessage = `Your order #${order.order_number} status has been updated to ${status}.`;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${statusTitle}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 4px; overflow: hidden;">
                            <!-- Header Logo -->
                            <tr>
                                <td align="center" style="padding: 40px 0 20px 0;">
                                    <img src="${frontendUrl}/logo.png" alt="TARZIFY" width="140" style="display: block; margin-bottom: 10px;">
                                    <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 2px;">ELEVATING YOUR LIFESTYLE</div>
                                </td>
                            </tr>
                            
                            <!-- Status Icon -->
                            <tr>
                                <td align="center" style="padding: 20px;">
                                    <div style="font-size: 48px; line-height: 1;">${statusIcon}</div>
                                    <h1 style="font-family: Arial, sans-serif; font-size: 28px; font-weight: 900; margin: 15px 0 0 0; text-transform: uppercase; font-style: italic; color: ${statusColor};">${statusTitle}</h1>
                                    <p style="font-family: Arial, sans-serif; color: #666; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0; padding: 0 40px;">${statusMessage}</p>
                                </td>
                            </tr>

                            <!-- Order Summary Box -->
                            <tr>
                                <td style="padding: 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 12px;">
                                        <tr>
                                            <td width="50%">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">ORDER ID</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; color: #f85606;">#${order.order_number}</div>
                                            </td>
                                            <td width="50%" align="right">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">STATUS</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: ${statusColor}; text-transform: uppercase;">${status}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            ${trackingData && status === 'shipped' ? `
                            <!-- Tracking Info -->
                            <tr>
                                <td style="padding: 0 20px 20px 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #f8f9fa; border-radius: 12px;">
                                        <tr>
                                            <td width="50%">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">COURIER</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700;">${trackingData.courier_name}</div>
                                            </td>
                                            <td width="50%" align="right">
                                                <div style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; margin-bottom: 4px;">TRACKING NUMBER</div>
                                                <div style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; color: #f85606;">${trackingData.tracking_number}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            ` : ''}

                            <!-- CTA Button -->
                            <tr>
                                <td align="center" style="padding: 20px 20px 40px 20px;">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" bgcolor="${statusColor}" style="border-radius: 8px;">
                                                <a href="${trackUrl}" target="_blank" style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; color: #ffffff; text-decoration: none; padding: 18px 40px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">VIEW ORDER DETAILS</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #111111; padding: 40px 20px; color: #ffffff;">
                                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">QUESTIONS?</div>
                                    <p style="font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 30px; opacity: 0.8;">Email us anytime at <a href="mailto:support@tarzify.com" style="color: #f85606; text-decoration: none; font-weight: 700;">support@tarzify.com</a></p>
                                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; width: 100%;">
                                        <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; opacity: 0.5;">© 2026 TARZIFY. HIGH QUALITY LIFESTYLE STORE.</div>
                                        <div style="font-family: Arial, sans-serif; font-size: 10px; margin-top: 10px; opacity: 0.3;">This is an automated status update email. Please do not reply.</div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Order #${order.order_number} Update: ${status.toUpperCase()}`,
            html
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
        // 0. Parallelize Initial Fetches (Voucher + Products)
        const productIds = items.map((i: any) => i.id);
        const fetches: any[] = [
            supabase.from('products').select('*').in('id', productIds)
        ];
        
        if (voucherId && userId) {
            fetches.push(supabase.from('vouchers').select('*').eq('id', voucherId).single());
            fetches.push(supabase.from('voucher_usage')
                .select('*', { count: 'exact', head: true })
                .eq('voucher_id', voucherId)
                .eq('user_id', userId));
        }

        const fetchResults = await Promise.all(fetches);
        const products = fetchResults[0].data;
        
        if (voucherId && userId) {
            const voucher = fetchResults[1].data;
            const voucherUsageCount = fetchResults[2].count;

            if (voucher) {
                if (!voucher.is_active || (voucher.expiry_date && new Date(voucher.expiry_date) < new Date())) {
                    return res.status(400).json({ success: false, error: 'Voucher is no longer valid' });
                }
                if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
                    return res.status(400).json({ success: false, error: 'Voucher usage limit reached' });
                }
                if (voucherUsageCount && voucherUsageCount >= (voucher.per_user_limit || 1)) {
                    return res.status(400).json({ success: false, error: 'You have already used this voucher' });
                }
            }
        }
        
        const merchantMap: Record<string, string> = {};
        for (const item of items) {
            const product = products?.find(p => p.id === item.id);
            if (!product) throw new Error(`Product ${item.id} not found`);
            merchantMap[item.id] = product.merchant_id;
            if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
            
            // Enrich item for the email!
            item.name = product.name;
            item.image = product.image_url;
        }

        const order_number = generateOrderId();
        console.log(`[ORDER] Creating order ${order_number} (Build: 2026-03-23-V2)`);
        const { data: order, error: orderErr } = await supabase.from('orders').insert({
            user_id: userId, total_amount: total, status: 'pending', shipping_address: shippingAddress, phone, payment_method: paymentMethod || 'cod', order_number, customer_name: customerName, email: req.body.email, voucher_id: voucherId, discount_amount: discountAmount || 0, shipping_amount: shippingAmount || 0
        }).select().single();
        if (orderErr) throw orderErr;

        const orderItems = items.map((item: any) => ({ 
            order_id: order.id, 
            product_id: item.id, 
            quantity: item.quantity, 
            price: item.price, 
            variant_combo: item.variant_combo || {}, 
            user_id: userId 
        }));
        await supabase.from('order_items').insert(orderItems);

        // Group items by merchant and prepare notifications
        const merchantItemsMap: Record<string, any[]> = {};
        for (const item of items) {
            const mid = merchantMap[item.id];
            if (!merchantItemsMap[mid]) merchantItemsMap[mid] = [];
            merchantItemsMap[mid].push(item);
        }

        // 1. Send Merchant Notifications (NON-BLOCKING but robust)
        for (const [merchantId, mItems] of Object.entries(merchantItemsMap)) {
            (async () => {
                try {
                    // Query profiles table for email (more reliable than auth.admin)
                    const { data: profile, error: pErr } = await supabase
                        .from('profiles')
                        .select('email')
                        .eq('id', merchantId)
                        .single();
                    
                    if (pErr) throw pErr;
                    if (profile?.email) {
                        console.log(`[ORDER] Sending merchant email to ${profile.email}`);
                        await sendMerchantOrderEmail(profile.email, order, mItems, customerName, shippingAddress, phone);
                        console.log(`[ORDER] Merchant notification sent to ${profile.email}`);
                    } else {
                        console.warn(`[ORDER] No email found for merchant ${merchantId}`);
                    }
                } catch (err) {
                    console.error(`[ORDER] Merchant notification failed for ${merchantId}:`, err);
                }
            })();
        }

        // 2. Decrement Stock (Parallelized)
        await Promise.all(items.map((item: any) => 
            supabase.rpc('decrement_stock', { 
                product_id: parseInt(item.id), 
                amount: parseInt(item.quantity), 
                v_combo: item.variant_combo || null 
            })
        ));

        // 3. Send Customer Email (NON-BLOCKING)
        const rawSubtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
        sendOrderEmail(
            order.email, 
            order, 
            items, 
            rawSubtotal, 
            shippingAmount || 0, 
            discountAmount || 0,
            total, 
            shippingAddress
        );

        // 4. Update Voucher Usage if applied (STRICT/BLOCKING to prevent bypass)
        if (voucherId) {
            try {
                const { data: vData } = await supabase.from('vouchers').select('used_count').eq('id', voucherId).single();
                if (vData) {
                    await Promise.all([
                        supabase.from('vouchers').update({ used_count: (vData.used_count || 0) + 1 }).eq('id', voucherId),
                        supabase.from('voucher_usage').insert({ voucher_id: voucherId, user_id: userId, order_id: order.id })
                    ]);
                    console.log(`[ORDER] Voucher ${voucherId} usage recorded for user ${userId}`);
                }
            } catch (vErr) {
                console.error('[ORDER] Voucher usage record failed:', vErr);
            }
        }

        res.json({ success: true, orderId: order.order_number, order });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const { data: order, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
        if (error) throw error;
        // Non-blocking email sending
        if (order.email) sendStatusUpdateEmail(order.email, order, status);
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

router.patch('/assign-tracking/:id', async (req, res) => {
    const { id } = req.params;
    const { tracking_number, courier_name, shipping_proof_url } = req.body;
    try {
        const { data: order, error } = await supabase.from('orders').update({ tracking_number, courier_name, shipping_proof_url, status: 'shipped' }).eq('id', id).select().single();
        if (error) throw error;
        // Non-blocking email sending
        if (order.email) sendStatusUpdateEmail(order.email, order, 'shipped', { tracking_number, courier_name, shipping_proof_url });
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
        // Non-blocking email sending
        if (order.email) sendCancellationEmail(order.email, order.customer_name, order.order_number, 'you');
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
        // Non-blocking email sending
        if (order.email) sendCancellationEmail(order.email, order.customer_name, order.order_number, 'the merchant');
        res.json({ success: true });
    } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
});

export default router;
