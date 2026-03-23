import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Reusable Email Service using Hostinger SMTP
 */
export const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT?.trim()) || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim()
    }
});

export const sendMerchantApprovalEmail = async (email: string, fullName: string, storeSlug: string) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';
    const storeUrl = `${frontendUrl}/#store/${storeSlug}`;
    const loginUrl = `${frontendUrl}/#login`;

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; background: #f9f9f9; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${frontendUrl}/logo.png" alt="TARZIFY" width="80" style="border-radius: 50%; border: 2px solid #f85606;">
            </div>
            <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <h1 style="color: #f85606; font-size: 24px; font-weight: 800; margin-bottom: 20px; font-style: italic;">CONGRATULATIONS!</h1>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    Hi <strong>${fullName}</strong>,<br><br>
                    Exciting news! Your merchant application for <strong>${storeSlug.toUpperCase()}</strong> has been <strong>APPROVED</strong>. You are now an official partner of the Tarzify ecosystem.
                </p>
                <div style="background: #fff8f5; border: 1px dashed #f85606; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                    <p style="font-size: 14px; margin: 0; color: #f85606; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Private Store URL:</p>
                    <a href="${storeUrl}" style="font-size: 18px; font-weight: 800; color: #333; text-decoration: none;">${storeUrl}</a>
                </div>
                <p style="font-size: 15px; margin-bottom: 30px;">
                    You can now start listing your products and tracking your orders from your dedicated Merchant Panel.
                </p>
                <div style="text-align: center;">
                    <a href="${loginUrl}" style="background: #f85606; color: white; padding: 15px 35px; border-radius: 12px; font-weight: 800; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Access My Dashboard</a>
                </div>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>&copy; 2026 Tarzify Inc. All rights reserved.</p>
                <p>If you have any questions, contact our merchant support team.</p>
            </div>
        </div>
    `;

    return emailTransporter.sendMail({
        from: process.env.SMTP_FROM || `"TARZIFY" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Welcome to Tarzify! Your Store is Approved 🚀`,
        html
    });
};

export const sendMerchantRegistrationNotificationToAdmin = async (merchantData: any) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tarzify.com';
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eeeeee; border-radius: 12px;">
            <div style="background-color: #f85606; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900;">New Merchant Registration</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <p style="font-size: 16px; color: #333;">A new merchant has registered and is awaiting approval.</p>
                <table width="100%" border="0" cellspacing="0" cellpadding="10" style="margin: 20px 0; border: 1px solid #f0f0f0; border-radius: 8px;">
                    <tr bgcolor="#f9f9f9">
                        <td width="30%" style="font-weight: bold; color: #666;">Store Name</td>
                        <td style="color: #333;">${merchantData.storeName}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: #666;">Owner Name</td>
                        <td style="color: #333;">${merchantData.fullName}</td>
                    </tr>
                    <tr bgcolor="#f9f9f9">
                        <td style="font-weight: bold; color: #666;">Email</td>
                        <td style="color: #333;">${merchantData.email}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: #666;">Phone</td>
                        <td style="color: #333;">${merchantData.contactNumber}</td>
                    </tr>
                    <tr bgcolor="#f9f9f9">
                        <td style="font-weight: bold; color: #666;">Address</td>
                        <td style="color: #333;">${merchantData.businessAddress}</td>
                    </tr>
                </table>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${frontendUrl}/admin" style="background-color: #212121; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Review Application in Dashboard</a>
                </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0;">
                <p>This is an automated system notification.</p>
            </div>
        </div>
    `;

    return emailTransporter.sendMail({
        from: process.env.SMTP_FROM || `"TARZIFY System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `ACTION REQUIRED: New Merchant Application - ${merchantData.storeName}`,
        html
    });
};
