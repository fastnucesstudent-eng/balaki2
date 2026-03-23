import express from 'express';
import nodemailer from 'nodemailer';
import { supabase } from '../lib/supabase';

const router = express.Router();

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

// Notify Admin when Merchant requests a banner
router.post('/notify-admin', async (req, res) => {
    try {
        const { merchantName, merchantEmail, bannerUrl } = req.body;
        console.log(`Sending banner request email for merchant: ${merchantName} (${merchantEmail})`);

        const transporter = getTransporter();
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: (process.env.ADMIN_EMAIL || 'admin@tarzify.com').trim(),
            subject: `[ACTION REQUIRED] New Banner Request from ${merchantName}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding: 40px 0; background-color: #f85606;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-style: italic; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">TARZIFY</h1>
                                <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; opacity: 0.8; text-transform: uppercase; letter-spacing: 2px;">Admin Notification</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px; font-weight: 900; font-style: italic; text-transform: uppercase;">New Banner Submission</h2>
                                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    A merchant has submitted a new banner request for the homepage. Please review the details below:
                                </p>
                                <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #fcfcfc; border: 1px solid #eeeeee; border-radius: 12px; margin-bottom: 25px;">
                                    <tr>
                                        <td width="30%" style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #999999;">Merchant</td>
                                        <td style="font-size: 15px; font-weight: bold; color: #1a1a1a;">${merchantName}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #999999;">Email</td>
                                        <td style="font-size: 15px; font-weight: bold; color: #1a1a1a;">${merchantEmail}</td>
                                    </tr>
                                </table>
                                
                                <div style="margin: 30px 0;">
                                    <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #999999; margin-bottom: 10px;">Banner Preview</p>
                                    <img src="${bannerUrl}" style="width: 100%; border-radius: 15px; border: 1px solid #eeeeee; box-shadow: 0 5px 15px rgba(0,0,0,0.05);" alt="Banner Preview" />
                                </div>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0 0 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="${(process.env.FRONTEND_URL || 'https://tarzify.com').trim()}/admin" style="background-color: #f85606; color: #ffffff; display: inline-block; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; font-style: italic; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(248,86,6,0.2);">Approve in Dashboard</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 30px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
                                <p style="color: #999999; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">&copy; 2026 TARZIFY. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </div>
            `
        });

        console.log('Admin notification email sent successfully:', info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Notify Admin Error:', error);
        res.status(500).json({ 
            error: 'Failed to send admin notification',
            details: error.message 
        });
    }
});

// Notify Merchant when Admin approves/rejects a banner
router.post('/notify-merchant', async (req, res) => {
    try {
        const { merchantEmail, status, adminComment, bannerUrl } = req.body;
        console.log(`Sending ${status} notification to merchant: ${merchantEmail}`);

        const transporter = getTransporter();
        
        const isApproved = status === 'approved';

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
            to: merchantEmail.trim(),
            subject: `[IMPORTANT] Your Banner Request was ${isApproved ? 'APPROVED' : 'REJECTED'} - TARZIFY`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 0;">
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 30px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.08);">
                        <tr>
                            <td align="center" style="padding: 50px 0; background-color: ${isApproved ? '#22c55e' : '#1a1a1a'};">
                                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-style: italic; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">TARZIFY</h1>
                                <div style="margin-top: 10px; padding: 5px 15px; background-color: rgba(255,255,255,0.2); border-radius: 20px; display: inline-block;">
                                    <p style="color: #ffffff; margin: 0; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Merchant Update</p>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 50px;">
                                <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'}; margin: 0 0 20px 0; font-size: 26px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.5px;">
                                    Request ${isApproved ? 'Approved' : 'Action Required'}
                                </h2>
                                <p style="color: #444444; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                                    Hello,<br><br>
                                    Your recent banner submission has been reviewed by our administration team. 
                                    ${isApproved 
                                        ? 'We are pleased to inform you that your banner is now approved and scheduled to go live on the TARZIFY homepage!' 
                                        : 'After careful review, your banner request could not be approved at this time.'}
                                </p>
                                
                                <div style="margin: 30px 0; padding: 20px; background-color: #fcfcfc; border: 2px dashed #eeeeee; border-radius: 20px;">
                                    <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #999999; margin: 0 0 10px 0; letter-spacing: 1px;">Target Banner Content</p>
                                    <img src="${bannerUrl}" style="width: 100%; border-radius: 12px; filter: ${isApproved ? 'none' : 'grayscale(0.8)'};" alt="Banner Preview" />
                                </div>

                                ${adminComment ? `
                                <div style="margin: 30px 0; padding: 25px; background-color: #fef2f2; border-left: 5px solid #ef4444; border-radius: 0 15px 15px 0;">
                                    <p style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #ef4444; margin: 0 0 8px 0; letter-spacing: 1px;">Admin Feedback</p>
                                    <p style="color: #1a1a1a; font-size: 15px; font-weight: 500; font-style: italic; margin: 0;">"${adminComment}"</p>
                                </div>` : ''}

                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                    ${isApproved 
                                        ? 'You can now monitor your banner performance and manage your active promotions directly from your dashboard.' 
                                        : 'Please review the feedback above, make the necessary adjustments to your banner design or link, and submit a new request.'}
                                </p>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0 0 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="${(process.env.FRONTEND_URL || 'https://tarzify.com').trim()}/merchant#banners" style="background-color: ${isApproved ? '#22c55e' : '#1a1a1a'}; color: #ffffff; display: inline-block; padding: 18px 45px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; font-style: italic; letter-spacing: 1px; box-shadow: 0 10px 20px ${isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.1)'};">Enter Dashboard</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 40px; background-color: #fafafa; border-top: 1px solid #eeeeee;">
                                <table width="100%">
                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <span style="font-size: 24px; font-style: italic; font-weight: 900; color: #dddddd;">TARZIFY</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <p style="color: #bbbbbb; font-size: 10px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Elevating Commerce Experience</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            `
        });

        console.log('Merchant notification email sent successfully:', info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Notify Merchant Error:', error);
        res.status(500).json({ 
            error: 'Failed to send merchant notification',
            details: error.message 
        });
    }
});

export default router;
