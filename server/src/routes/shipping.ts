import express from 'express';

const router = express.Router();

router.post('/calculate', async (req, res) => {
    try {
        const { items = [] } = req.body;
        console.log(`[Shipping] Request received with ${items.length} items`);
        
        const BASE_PRICE_STANDARD = 250;
        const merchantGroups: Record<string, number> = {};
        
        items.forEach((item: any) => {
            const mId = item.merchant_id || 'unknown';
            if (!merchantGroups[mId]) merchantGroups[mId] = 0;
            
            // LOG the flag for this item
            console.log(`Item ${item.name}: is_free_delivery = ${item.is_free_delivery} (Type: ${typeof item.is_free_delivery})`);
            
            const isFree = (item.is_free_delivery === true || item.is_free_delivery === 'true');
            if (!isFree) {
                merchantGroups[mId] += (item.quantity || 1);
            }
        });

        let totalShippingUnits = 0;
        Object.entries(merchantGroups).forEach(([mId, paidQty]) => {
            if (paidQty > 0) {
                const units = Math.ceil(paidQty / 2);
                totalShippingUnits += units;
                console.log(`Merchant ${mId}: PaidQty ${paidQty} -> Units ${units}`);
            }
        });

        console.log('Final shipping units:', totalShippingUnits);
        const standardPrice = totalShippingUnits * BASE_PRICE_STANDARD;
        const codPrice = standardPrice > 0 ? standardPrice + 50 : 0;

        const rates = [
            { id: 'fastpay', name: 'LOCAL - Standard (PayFast)', price: standardPrice, estimated_days: '3-5' },
            { id: 'cod', name: 'LOCAL - Cash on Delivery (COD)', price: codPrice, estimated_days: '3-5' }
        ];

        console.log('Sending back LOCAL rates:', JSON.stringify(rates));
        res.json({ success: true, rates });
    } catch (error: any) {
        console.error('Shipping calculation error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;
