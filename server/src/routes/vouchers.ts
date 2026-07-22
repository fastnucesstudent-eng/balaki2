import express from 'express';
import { supabase } from '../lib/supabase';
import nodemailer from 'nodemailer';

const router = express.Router();

// 1. Validate Voucher
router.post('/validate', async (req, res) => {
    try {
        const { code, userId, items } = req.body; // New: Expecting items array

        const { data: voucher, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !voucher) {
            return res.status(404).json({ success: false, error: 'Invalid voucher code' });
        }

        if (!voucher.is_active) {
            return res.status(400).json({ success: false, error: 'Voucher is not active' });
        }

        if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
            return res.status(400).json({ success: false, error: 'Voucher has expired' });
        }

        if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
            return res.status(400).json({ success: false, error: 'Voucher overall usage limit reached' });
        }

        // Per-user limit check
        if (userId) {
            const { count } = await supabase
                .from('voucher_usage')
                .select('*', { count: 'exact', head: true })
                .eq('voucher_id', voucher.id)
                .eq('user_id', userId);

            if (count && count >= (voucher.per_user_limit || 1)) {
                return res.status(400).json({ success: false, error: 'You have already used this voucher' });
            }
        }

        if (voucher.target_customer_id && voucher.target_customer_id !== userId) {
            return res.status(400).json({ success: false, error: 'This voucher is not valid for your account' });
        }

        // Calculate discount based on items
        // If merchant_id is set, only count products from that merchant
        let applicableSubtotal = 0;
        const targetItems = voucher.merchant_id 
            ? items.filter((item: any) => item.merchant_id === voucher.merchant_id)
            : items;

        if (targetItems.length === 0 && voucher.merchant_id) {
            return res.status(400).json({ success: false, error: 'This voucher is only valid for specific merchant products' });
        }

        applicableSubtotal = targetItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        if (applicableSubtotal < (voucher.min_spend || 0)) {
            return res.status(400).json({ success: false, error: `Minimum spend of Rs. ${voucher.min_spend} required on applicable items` });
        }

        // Calculate discount
        let discount = 0;
        if (voucher.type === 'percentage') {
            discount = (applicableSubtotal * voucher.value) / 100;
            // Apply max_discount cap if set
            if (voucher.max_discount && discount > voucher.max_discount) {
                discount = voucher.max_discount;
            }
        } else {
            discount = Math.min(voucher.value, applicableSubtotal);
        }

        res.json({ 
            success: true, 
            voucher: {
                id: voucher.id,
                code: voucher.code,
                discount: Math.round(discount),
                type: voucher.type,
                value: voucher.value,
                merchant_id: voucher.merchant_id,
                max_discount: voucher.max_discount
            } 
        });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Create Voucher (with Email)
router.post('/create', async (req, res) => {
    try {
        const { code, type, value, min_spend, expiry_date, usage_limit, merchant_id, target_customer_id, max_discount, per_user_limit } = req.body;

        const { data: voucher, error } = await supabase
            .from('vouchers')
            .insert([{
                code, type, value, min_spend, expiry_date, usage_limit, merchant_id, target_customer_id, max_discount, per_user_limit
            }])
            .select()
            .single();

        if (error) throw error;

        // If target customer is specified, send email
        if (target_customer_id) {
            const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', target_customer_id).single();
            if (profile?.email) {
                // Trigger email sending (simplified for now, using project SMTP settings)
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT),
                    secure: true,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.SMTP_FROM,
                    to: profile.email,
                    subject: '🎉 A special discount voucher just for you!',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #f97316;">Hello ${profile.full_name || 'Valued Customer'},</h2>
                            <p>We've assigned a special discount voucher to your account!</p>
                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                                <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Your Coupon Code</p>
                                <h1 style="margin: 10px 0; color: #1e293b; font-size: 32px; letter-spacing: 0.2em;">${code}</h1>
                                <p style="margin: 0; color: #059669; font-weight: bold;">
                                    ${type === 'percentage' ? `${value}% OFF` : `Rs. ${value} OFF`}
                                </p>
                            </div>
                            <p>Apply this code at checkout to save on your next order.</p>
                            ${min_spend ? `<p style="font-size: 12px; color: #94a3b8;">* Valid on orders over Rs. ${min_spend}</p>` : ''}
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Balaki Organic | 100% Pure & Certified Organic Store</p>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
            }
        }

        res.json({ success: true, voucher });

    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Update Voucher
router.patch('/:id', async (req, res) => {
    try {
        const { 
            is_active, max_discount, usage_limit, per_user_limit, 
            value, expiry_date, code, type, min_spend, target_customer_id 
        } = req.body;

        const updateData: any = {};
        if (is_active !== undefined) updateData.is_active = is_active;
        if (max_discount !== undefined) updateData.max_discount = max_discount ? parseFloat(max_discount) : null;
        if (usage_limit !== undefined) updateData.usage_limit = usage_limit ? parseInt(usage_limit) : null;
        if (per_user_limit !== undefined) updateData.per_user_limit = parseInt(per_user_limit);
        if (value !== undefined) updateData.value = parseFloat(value);
        if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
        if (code !== undefined) updateData.code = code;
        if (type !== undefined) updateData.type = type;
        if (min_spend !== undefined) updateData.min_spend = parseFloat(min_spend);
        if (target_customer_id !== undefined) updateData.target_customer_id = target_customer_id;

        const { data, error } = await supabase
            .from('vouchers')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, voucher: data });
    } catch (error: any) {
        console.error('Voucher Update Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Delete Voucher
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('vouchers')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Get Voucher Usage Stats
router.get('/stats/:id', async (req, res) => {
    try {
        const { data: usage, error } = await supabase
            .from('voucher_usage')
            .select('*, profiles:user_id(full_name, email)')
            .eq('voucher_id', req.params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, usage });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
