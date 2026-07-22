import { motion } from 'framer-motion';
import { Shield, RefreshCcw, Truck, FileText } from 'lucide-react';

const POLICIES = {
    privacy: {
        title: 'Privacy Policy',
        icon: Shield,
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="font-black text-xl mb-2">1. Data Collection</h3>
                    <p>We collect personal information (name, email, address, phone) solely for order processing and delivery.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">2. Data Usage</h3>
                    <ul className="list-disc pl-5 opacity-80 space-y-1">
                        <li>Order fulfillment and shipping updates.</li>
                        <li>Improving store experience.</li>
                        <li>Fraud prevention and security.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">3. Third-Party Sharing</h3>
                    <p className="mb-2">We share data only with essential partners:</p>
                    <ul className="list-disc pl-5 opacity-80 space-y-1">
                        <li><strong>Payment Processors:</strong> FastPay (for secure transactions).</li>
                        <li><strong>Couriers:</strong> TCS/LEOPARDS/PostEx (for delivery).</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">4. Security</h3>
                    <p>All data is encrypted. We do not store credit card details on our servers.</p>
                </div>
            </div>
        )
    },
    returns: {
        title: 'Return & Refund Policy',
        icon: RefreshCcw,
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="font-black text-xl mb-2">1. Returns</h3>
                    <p className="mb-2">We accept returns within <strong>7 days of delivery</strong>. To be eligible, items must be:</p>
                    <ul className="list-disc pl-5 opacity-80 space-y-1">
                        <li>Unused and in original packaging.</li>
                        <li>With all tags intact.</li>
                        <li><strong>Hygiene Exception:</strong> Makeup products can only be returned if the seal is unbroken.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">2. Refunds</h3>
                    <p className="mb-2">Once we inspect your return, we will notify you of approval.</p>
                    <ul className="list-disc pl-5 opacity-80 space-y-1">
                        <li><strong>Approved:</strong> Processed via original payment method (FastPay/Bank Transfer) within <strong>7–10 working days</strong>.</li>
                        <li><strong>Rejected:</strong> Items that do not meet criteria will be sent back at customer's expense.</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">3. Exchanges</h3>
                    <p>We only replace items if they are defective, damaged, or the wrong size/color was sent.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">4. Shipping Costs</h3>
                    <p>Customers are responsible for return shipping costs. Original shipping costs are non-refundable.</p>
                    <p className="mt-4 font-bold text-primary">Contact Support: support@balakiorganic.com</p>
                </div>
            </div>
        )
    },
    shipping: {
        title: 'Shipping Policy',
        icon: Truck,
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="font-black text-xl mb-2">1. Delivery Times</h3>
                    <ul className="list-disc pl-5 opacity-80 space-y-1">
                        <li><strong>Standard:</strong> 3-5 Business Days (Rs. 250).</li>
                        <li><strong>Express:</strong> 1-2 Business Days (Rs. 500).</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">2. Couriers</h3>
                    <p>We use trusted partners: TCS, LEOPARDS, and PostEx.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">3. Order Tracking</h3>
                    <p>You will receive a tracking ID via SMS/Email once your order is shipped.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">4. Delays</h3>
                    <p>We are not responsible for delays caused by courier services or public holidays.</p>
                </div>
            </div>
        )
    },
    terms: {
        title: 'Terms & Conditions',
        icon: FileText,
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="font-black text-xl mb-2">1. Acceptance</h3>
                    <p>By using Balaki Organic, you agree to these terms.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">2. Pricing</h3>
                    <p>Prices are subject to change without notice. We reserve the right to cancel orders due to pricing errors.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">3. Intellectual Property</h3>
                    <p>All content (images, text, logos) is property of Balaki Organic.</p>
                </div>
                <div>
                    <h3 className="font-black text-xl mb-2">4. Limitation of Liability</h3>
                    <p>We are not liable for any indirect damages arising from the use of our products.</p>
                </div>
            </div>
        )
    }
};

export const PolicyPage = ({ type }: { type: keyof typeof POLICIES }) => {
    const policy = POLICIES[type];
    const Icon = policy.icon;

    return (
        <div className="min-h-screen bg-background pt-32 pb-24 px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto glass p-12 rounded-[3rem] border-white/5 space-y-8"
            >
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <Icon className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase">{policy.title}</h1>
                </div>

                <div className="prose prose-invert max-w-none opacity-70 leading-relaxed text-lg">
                    {policy.content}
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-wrap gap-4">
                    <button
                        onClick={() => window.location.hash = ''}
                        className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform"
                    >
                        Return to Store
                    </button>
                    <button
                        onClick={() => window.open('tel:+923014444980')}
                        className="px-8 py-4 glass rounded-2xl font-black text-sm hover:bg-white/10 transition-colors"
                    >
                        Contact Support
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
