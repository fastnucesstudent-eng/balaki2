import express from 'express';
import { supabase } from '../lib/supabase';
import { cloudinary } from '../lib/cloudinary';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

/**
 * POST /api/merchants/generate-qr
 * Generates a unique QR code for the merchant storefront and uploads it to Cloudinary.
 * Updates the merchant profile with the direct Cloudinary URL.
 */
router.post('/generate-qr', async (req, res) => {
    const { merchantId, storeSlug } = req.body;
    
    console.log(`[QR GEN] Request for merchant ${merchantId} (slug: ${storeSlug})`);

    if (!merchantId || !storeSlug) {
        return res.status(400).json({ error: 'Missing merchantId or storeSlug' });
    }

    try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://tarzify.com';
        const storeUrl = `${frontendUrl}/#store/${storeSlug}`;
        
        // Use an external QR generator API (QRServer) then pipe to Cloudinary for persistence
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(storeUrl)}`;

        console.log(`[QR GEN] Uploading to Cloudinary for merchant ${merchantId}...`);
        
        const uploadRes = await cloudinary.uploader.upload(qrApiUrl, {
            folder: 'tarzify/merchant_qrs',
            public_id: `qr_${merchantId}`,
            overwrite: true
        });

        console.log(`[QR GEN] Uploaded! URL: ${uploadRes.secure_url}`);

        // Persist the URL in Supabase profiles
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ qr_code_url: uploadRes.secure_url })
            .eq('id', merchantId);

        if (updateError) throw updateError;
        
        // 2. Fetch merchant email and name for notification
        const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', merchantId)
            .single();

        if (profile && profile.email) {
            const { sendMerchantApprovalEmail } = await import('../lib/email');
            try {
                await sendMerchantApprovalEmail(profile.email, profile.full_name || 'Merchant', storeSlug);
                console.log(`[QR GEN] Approval email sent to ${profile.email}`);
            } catch (emailErr) {
                console.error(`[QR GEN] Failed to send approval email:`, emailErr);
                // Don't crash for email failure, but log it
            }
        }

        res.json({ 
            success: true, 
            message: 'QR Code generated and approval email sent',
            qr_code_url: uploadRes.secure_url 
        });
    } catch (error: any) {
        console.error('[QR GEN] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/merchants/notify-approval
 * Explicitly sends an approval notification to the merchant.
 * Used if QR generation is skipped or as a fallback.
 */
router.post('/notify-approval', async (req, res) => {
    const { userId } = req.body;
    console.log(`[APPROVAL NOTIFY] Request for merchant ${userId}`);

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name, store_slug')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            throw new Error(profileError?.message || 'Merchant profile not found');
        }

        if (!profile.email) {
            throw new Error('Merchant profile has no email address');
        }

        const { sendMerchantApprovalEmail } = await import('../lib/email');
        await sendMerchantApprovalEmail(profile.email, profile.full_name || 'Merchant', profile.store_slug || 'your-store');
        
        console.log(`[APPROVAL NOTIFY] Success! Email sent to ${profile.email}`);
        res.json({ success: true, message: 'Approval email sent successfully' });
    } catch (error: any) {
        console.error('[APPROVAL NOTIFY] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
