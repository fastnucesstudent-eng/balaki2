import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../lib/supabase';

const router = express.Router();

const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Notify Admin when Merchant requests a banner
router.post('/notify-admin', async (req, res) => {
    try {
        const { merchantName, merchantEmail, bannerUrl } = req.body;

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        console.log(`[BANNER NOTIFY] Sending notification to admin: ${adminEmail}`);
        console.log(`[BANNER NOTIFY] From merchant: ${merchantName} (${merchantEmail})`);

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('[BANNER NOTIFY] SMTP_USER or SMTP_PASS not configured!');
            return res.status(500).json({ error: 'SMTP credentials not configured' });
        }

        const transporter = getTransporter();
        
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `New Banner Request from ${merchantName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f85606;">New Banner Request</h2>
                    <p><strong>Merchant:</strong> ${merchantName} (${merchantEmail})</p>
                    <p>A new banner has been submitted for approval.</p>
                    <div style="margin: 20px 0;">
                        <img src="${bannerUrl}" style="width: 100%; max-width: 400px; border-radius: 10px;" alt="Banner Preview" />
                    </div>
                    <p>Please log in to the Admin Dashboard to approve or reject this request.</p>
                    <a href="${process.env.FRONTEND_URL || 'https://tarzify.com'}/admin" style="display: inline-block; padding: 10px 20px; background-color: #f85606; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Admin Dashboard</a>
                </div>
            `
        });

        console.log(`[BANNER NOTIFY] ✅ Email sent successfully to ${adminEmail}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error('[BANNER NOTIFY] ❌ Error:', error.message || error);
        res.status(500).json({ error: error.message });
    }
});

// Notify Merchant when Admin approves/rejects a banner
router.post('/notify-merchant', async (req, res) => {
    try {
        const { merchantEmail, status, adminComment, bannerUrl } = req.body;

        const transporter = getTransporter();
        
        const isApproved = status === 'approved';

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: merchantEmail,
            subject: `Banner Request ${isApproved ? 'Approved' : 'Rejected'} - TARZIFY`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'};">Banner Request ${isApproved ? 'Approved' : 'Rejected'}</h2>
                    <p>Your banner request has been reviewed by the admin.</p>
                    <div style="margin: 20px 0;">
                        <img src="${bannerUrl}" style="width: 100%; max-width: 400px; border-radius: 10px; opacity: ${isApproved ? 1 : 0.5};" alt="Banner Preview" />
                    </div>
                    ${adminComment ? `<p><strong>Admin Feedback:</strong> ${adminComment}</p>` : ''}
                    <p>${isApproved ? 'Your banner is now scheduled to go live.' : 'You can revise your request based on the feedback and submit again.'}</p>
                    <a href="${process.env.FRONTEND_URL || 'https://tarzify.com'}/merchant" style="display: inline-block; padding: 10px 20px; background-color: #f85606; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
                </div>
            `
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Notify Merchant Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
