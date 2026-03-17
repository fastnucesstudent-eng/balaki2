import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CreditCard, Truck, MapPin, CheckCircle2, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';

const STEPS = ['Shipping', 'Delivery', 'Payment'];

interface ShippingRate {
    id: string;
    name: string;
    price: number;
    estimated_days: string;
}

export const CheckoutPage = ({ onBack }: { onBack: () => void }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const { items, total } = useCartStore();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [ratesError, setRatesError] = useState('');
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [step0Error, setStep0Error] = useState('');

    const [formData, setFormData] = useState({
        fullName: user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        shippingMethod: '', // Will be set once rates load
        paymentMethod: 'fastpay'
    });

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/shipping/calculate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}) // Send basic payload for now
                });
                const data = await res.json();
                if (data.success && data.rates.length > 0) {
                    setShippingRates(data.rates);
                    // Default to first option if not set
                    setFormData(prev => ({ ...prev, shippingMethod: data.rates[0].id }));
                } else {
                    setRatesError('Failed to load shipping rates.');
                }
            } catch (error) {
                console.error('Shipping fetch error:', error);
                setRatesError('Could not fetch shipping rates. Please check your connection.');
            }
        };
        fetchRates();
    }, []);

    // Auto-redirect to tracking after 5 seconds
    useEffect(() => {
        if (orderComplete && createdOrderId) {
            const timer = setTimeout(() => {
                window.location.hash = `#track-order?id=${createdOrderId}`;
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [orderComplete, createdOrderId]);

    const selectedRate = shippingRates.find(r => r.id === formData.shippingMethod) || shippingRates[0];
    
    // Check if any item in the cart qualifies for free delivery
    const hasFreeDeliveryItem = items.some(item => (item as any).is_free_delivery);
    const shippingCost = hasFreeDeliveryItem ? 0 : (selectedRate ? selectedRate.price : 0);
    const finalTotal = total + shippingCost;

    const handleNext = () => {
        // Step 0: validate phone + address before advancing
        if (currentStep === 0) {
            if (!formData.fullName.trim()) {
                setStep0Error('Full name is required.');
                return;
            }
            if (!formData.phone.trim()) {
                setStep0Error('Phone number is required.');
                return;
            }
            if (!formData.address.trim()) {
                setStep0Error('Shipping address is required.');
                return;
            }
            if (!formData.city.trim()) {
                setStep0Error('City is required.');
                return;
            }
            setStep0Error('');
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            handlePlaceOrder();
        }
    };

    const handlePlaceOrder = async () => {
        setLoading(true);
        try {
            if (!user?.id) throw new Error('User not logged in');

            // 1. Create the order in the backend
            const response = await fetch(`${import.meta.env.VITE_API_URL}/orders/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        image: item.image,
                        variant_combo: item.variant_combo
                    })),
                    total: finalTotal,
                    shippingAddress: `${formData.address}, ${formData.city}`,
                    phone: formData.phone,
                    paymentMethod: formData.paymentMethod,
                    customerName: formData.fullName,
                    email: formData.email
                })
            });

            const orderData = await response.json();
            if (!orderData.success) throw new Error(orderData.error || 'Order creation failed');
            setCreatedOrderId(orderData.orderId);

            // 2. Initiate Payment
            const paymentResponse = await fetch(`${import.meta.env.VITE_API_URL}/payment/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalTotal,
                    orderId: orderData.orderId,
                    phone: formData.phone
                })
            });

            const paymentData = await paymentResponse.json();
            if (!paymentData.success) throw new Error(paymentData.error || 'Payment initiation failed');

            // 3. Clear cart and show success (or redirect)
            setLoading(false);
            useCartStore.getState().clearCart();

            if (formData.paymentMethod === 'fastpay' && paymentData.payment_url) {
                // Redirect for FastPay
                window.location.href = paymentData.payment_url;
            } else {
                // Show success immediately for COD
                setOrderComplete(true);
            }
        } catch (err: any) {
            const toast = useToastStore.getState();
            if (err.message.includes('Insufficient stock')) {
                toast.show(err.message, 'error');
            } else {
                toast.show('Checkout Failed: ' + err.message, 'error');
            }
            setLoading(false);
        }
    };

    if (orderComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-8 flex flex-col items-center max-w-lg mx-auto bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-md shadow-2xl"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-20 md:w-32 h-20 md:h-32 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20"
                    >
                        <CheckCircle2 className="w-10 md:w-16 h-10 md:h-16" />
                    </motion.div>

                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white">Order Confirmed!</h1>
                        <p className="text-lg opacity-60 font-medium">Thank you for shopping. Your order has been placed successfully.</p>
                    </div>

                    {createdOrderId && (
                        <div className="bg-white/5 py-4 px-8 rounded-2xl border border-white/10">
                            <p className="text-sm uppercase tracking-widest opacity-50 mb-1">Order ID</p>
                            <p className="text-3xl font-black text-primary font-mono">#{createdOrderId}</p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        <button
                            onClick={() => window.location.hash = `#track-order?id=${createdOrderId}`}
                            className="bg-primary hover:bg-primary/90 text-white font-black px-12 py-5 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Truck className="w-5 h-5" />
                            Track My Order
                        </button>
                        <button
                            onClick={() => window.location.hash = ''}
                            className="bg-white/5 hover:bg-white/10 text-white font-black px-12 py-5 rounded-2xl transition-all border border-white/10"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 md:pt-32 pb-24 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

                {/* Left: Checkout Form */}
                <div className="lg:col-span-8 space-y-6 md:space-y-12 order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-6 sm:mb-8">
                        <button onClick={onBack} className="p-1.5 sm:p-2 hover:bg-foreground/5 rounded-full transition-colors">
                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <h1 className="text-xl md:text-4xl font-black tracking-tighter uppercase italic">Checkout</h1>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between max-w-md">
                        {STEPS.map((step, i) => (
                            <div key={step} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${i <= currentStep ? 'bg-primary text-white' : 'bg-foreground/10 opacity-30'}`}>
                                    {i + 1}
                                </div>
                                <span className={`text-sm font-bold uppercase tracking-widest ${i <= currentStep ? 'opacity-100' : 'opacity-30'}`}>
                                    {step}
                                </span>
                                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 opacity-20" />}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 text-primary">
                                    <MapPin className="w-6 h-6" />
                                    <h3 className="text-xl font-black">Shipping Address</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest opacity-30">Full Name</label>
                                        <input
                                            type="text"
                                            id="fullName"
                                            name="fullName"
                                            autoComplete="name"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full glass border border-foreground/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm md:text-base focus:ring-2 ring-primary/30 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest opacity-30">Phone Number</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            autoComplete="tel"
                                            placeholder="+92 3XX XXXXXXX"
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full glass border border-foreground/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm md:text-base focus:ring-2 ring-primary/30 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest opacity-30">Address</label>
                                        <input
                                            type="text"
                                            id="address"
                                            name="address"
                                            autoComplete="street-address"
                                            placeholder="Street address, Apartment, etc."
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full glass border border-foreground/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm md:text-base focus:ring-2 ring-primary/30 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest opacity-30">City</label>
                                        <input
                                            type="text"
                                            id="city"
                                            name="city"
                                            autoComplete="address-level2"
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full glass border border-foreground/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm md:text-base focus:ring-2 ring-primary/30 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Inline Validation Error */}
                                {step0Error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl"
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-bold">{step0Error}</span>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 text-primary">
                                    <Truck className="w-6 h-6" />
                                    <h3 className="text-xl font-black">Delivery Method</h3>
                                </div>

                                {ratesError && (
                                    <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-sm font-bold">{ratesError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {shippingRates.length === 0 && !ratesError ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : (
                                        shippingRates.map(rate => (
                                            <label key={rate.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-3xl cursor-pointer transition-all border-2 ${formData.shippingMethod === rate.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' : 'bg-foreground/5 border-transparent opacity-60'}`}>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="radio"
                                                        name="shipping"
                                                        className="w-5 h-5 text-primary focus:ring-0 border-none bg-foreground/10"
                                                        checked={formData.shippingMethod === rate.id}
                                                        onChange={() => setFormData({ ...formData, shippingMethod: rate.id, paymentMethod: rate.id })}
                                                    />
                                                    <div>
                                                        <p className="font-black">{rate.name}</p>
                                                        <p className="text-xs opacity-50">{rate.estimated_days} Business Days</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-primary">
                                                    {hasFreeDeliveryItem ? 'Free' : `Rs. ${rate.price.toLocaleString()}`}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 text-primary">
                                    <CreditCard className="w-6 h-6" />
                                    <h3 className="text-xl font-black">Payment Method</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-4">
                                        <div
                                            onClick={() => setFormData({ ...formData, paymentMethod: 'fastpay', shippingMethod: 'fastpay' })}
                                            className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'fastpay' ? 'border-primary bg-primary/5' : 'border-white/10 glass order-2 opacity-50'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center p-2 shadow-sm flex-shrink-0">
                                                        <span className="text-orange-500 font-black text-lg md:text-xl">FP</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm md:text-base truncate">FastPay / Cards</p>
                                                        <p className="text-[10px] md:text-xs opacity-50 truncate">Secure online payment</p>
                                                    </div>
                                                </div>
                                                {formData.paymentMethod === 'fastpay' && <CheckCircle2 className="text-primary w-6 h-6" />}
                                            </div>

                                            {formData.paymentMethod === 'fastpay' && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-6 pt-6 border-t border-primary/10 space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Card Details</label>
                                                        <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full bg-foreground/5 border-none rounded-xl p-4 font-mono tracking-widest outline-none focus:ring-2 ring-primary/30" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input type="text" placeholder="MM/YY" className="w-full bg-foreground/5 border-none rounded-xl p-4 font-mono outline-none focus:ring-2 ring-primary/30" />
                                                        <input type="text" placeholder="CVV" className="w-full bg-foreground/5 border-none rounded-xl p-4 font-mono outline-none focus:ring-2 ring-primary/30" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        <div
                                            onClick={() => setFormData({ ...formData, paymentMethod: 'cod', shippingMethod: 'cod' })}
                                            className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-white/10 glass order-2 opacity-50'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-foreground/5 rounded-lg md:rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                                                        <Truck className="w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm md:text-base truncate">Cash on Delivery</p>
                                                        <p className="text-[10px] md:text-xs opacity-50 truncate">Pay when you receive</p>
                                                    </div>
                                                </div>
                                                {formData.paymentMethod === 'cod' && <CheckCircle2 className="text-primary w-6 h-6" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="pt-8 flex gap-4">
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(s => s - 1)}
                                className="px-8 py-4 glass rounded-2xl font-black hover:bg-foreground/10 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={loading || (currentStep === 1 && shippingRates.length === 0)}
                            className="flex-grow py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                <>
                                    {currentStep === STEPS.length - 1 ? (formData.paymentMethod === 'fastpay' ? 'Pay Securely' : 'Place Order') : 'Continue to ' + STEPS[currentStep + 1]}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-4 order-1 lg:order-2">
                    <div className="glass p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 sticky top-32 space-y-6 md:space-y-8 shadow-2xl">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Summary</h3>

                        <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {items.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-foreground/5 flex-shrink-0">
                                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-sm truncate">{item.name}</p>
                                        <p className="text-xs opacity-50">{item.quantity} × Rs. {item.price.toLocaleString()}</p>
                                        {item.variant_combo && Object.entries(item.variant_combo as Record<string, string>).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(item.variant_combo as Record<string, string>).map(([k, v]) => (
                                                    <span key={k} className="text-[8px] font-black uppercase bg-foreground/5 px-2 py-0.5 rounded-full opacity-60">
                                                        {k}: {String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-black text-sm whitespace-nowrap">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-foreground/10 space-y-4">
                            <div className="flex justify-between text-sm opacity-50 font-bold">
                                <span>Subtotal</span>
                                <span>Rs. {total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-50 font-bold">
                                <span>Shipping</span>
                                {hasFreeDeliveryItem ? (
                                    <div className="flex flex-col items-end">
                                        <span className="line-through text-xs">Rs. {(selectedRate?.price || 0).toLocaleString()}</span>
                                        <span className="text-green-500 text-xs font-black uppercase">Free</span>
                                    </div>
                                ) : (
                                    <span>Rs. {shippingCost.toLocaleString()}</span>
                                )}
                            </div>
                            <div className="flex justify-between pt-4 text-2xl font-black tracking-tighter border-t border-foreground/10">
                                <span className="italic">Total</span>
                                <span className="text-primary">Rs. {finalTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary text-center">Premium Courier Partners</p>
                            <div className="flex justify-center gap-4 mt-2 opacity-50 grayscale transition-all hover:grayscale-0">
                                <span className="text-[10px] font-bold text-foreground">TCS</span>
                                <span className="text-[10px] font-bold text-foreground">LEOPARDS</span>
                                <span className="text-[10px] font-bold text-foreground">POSTEX</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
