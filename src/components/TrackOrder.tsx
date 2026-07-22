import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, Package, Truck, CheckCircle, Clock, X, Eye, Camera, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const TrackOrder = ({ onClose, initialOrderId }: { onClose: () => void, initialOrderId?: string }) => {
    const [orderId, setOrderId] = useState(initialOrderId || '');
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-sync state when initialOrderId changes (e.g. from URL)
    useEffect(() => {
        if (initialOrderId) setOrderId(initialOrderId);
    }, [initialOrderId]);

    const handleTrack = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanId = orderId.trim();
        if (!cleanId) return;

        setLoading(true);
        setError('');
        setStatus(null);

        let data: any = null;

        try {
            const upperId = cleanId.toUpperCase();
            const isNumeric = /^\d+$/.test(cleanId);

            // Step 1: Exact order_number match (case-insensitive)
            if (!data) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .ilike('order_number', upperId)
                    .maybeSingle();
                data = d;
            }

            // Step 2: tracking_number match
            if (!data) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .ilike('tracking_number', upperId)
                    .maybeSingle();
                data = d;
            }

            // Step 3: customer_email match
            if (!data) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .ilike('customer_email', cleanId)
                    .maybeSingle();
                data = d;
            }

            // Step 4: Fuzzy order_number contains cleanId
            if (!data) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .ilike('order_number', `%${cleanId}%`)
                    .maybeSingle();
                data = d;
            }

            // Step 5: Numeric ID fallback (only for pure numbers)
            if (!data && isNumeric) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .eq('id', Number(cleanId))
                    .maybeSingle();
                data = d;
            }

            // Step 6: Phone number match (only for pure numbers)
            if (!data && isNumeric) {
                const { data: d } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .eq('phone', cleanId)
                    .maybeSingle();
                data = d;
            }

            // Step 7: Multi-endpoint API Fallback (Bypasses RLS using Service Role backend)
            if (!data) {
                const apiCandidates = Array.from(new Set([
                    import.meta.env.VITE_API_URL,
                    `${window.location.origin}/api`,
                    'http://localhost:5000/api'
                ].filter(Boolean)));

                for (const baseUrl of apiCandidates) {
                    try {
                        const cleanBase = (baseUrl as string).replace(/\/+$/, '');
                        const res = await fetch(`${cleanBase}/orders/track?orderId=${encodeURIComponent(cleanId)}`, {
                            signal: AbortSignal.timeout(5000)
                        });
                        if (res.ok) {
                            const apiRes = await res.json();
                            if (apiRes.success && apiRes.order) {
                                data = apiRes.order;
                                break;
                            }
                        }
                    } catch (_apiErr) {
                        // try next candidate
                    }
                }
            }

            if (!data) {
                setError('Order not found. Please check your Order ID or Phone number.');
            } else {
                setStatus(data);
            }
        } catch (err: any) {
            console.error('Tracking Error:', err);
            setError('Could not retrieve order. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Lock background scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // Auto-track if initial ID provided
    useEffect(() => {
        if (initialOrderId) {
            const timer = setTimeout(() => {
                handleTrack();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [initialOrderId]);

    const getStatusStep = (currentStatus: string) => {
        const steps = ['pending', 'processing', 'shipped', 'delivered'];
        return steps.indexOf(currentStatus.toLowerCase());
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] overflow-y-auto overscroll-contain track-order-portal"
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
        >
            <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 py-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-2xl bg-background border border-border rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative"
                >
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-white/10 bg-foreground/5 transition-colors z-10"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                    </button>

                    <div className="text-center mb-10 sm:mb-12 flex flex-col items-center">
                        <div className="relative group mb-6">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <img src="/logo.svg" alt="Balaki Organic Logo" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-primary/30 shadow-2xl relative z-10" />
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-4 uppercase text-foreground leading-none">
                            TRACK <span className="text-primary">ORDER</span>
                        </h2>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-foreground/40 max-w-xs sm:max-w-none">Premium Real-Time Logistics Monitoring</p>
                    </div>

                    <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 mb-12">
                        <div className="flex-grow relative group">
                            <div className="absolute -inset-1 bg-foreground/5 rounded-2xl group-focus-within:bg-primary/20 transition-all duration-500" />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-5 h-5 opacity-50 z-10" />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Order ID (e.g. BS123456)"
                                className="w-full bg-foreground/5 border border-border rounded-2xl py-5 pl-14 pr-6 text-base font-black outline-none focus:border-primary/50 text-foreground  placeholder:text-foreground/20 transition-all relative z-10 uppercase tracking-widest"
                            />
                        </div>
                        <button disabled={loading} className="px-10 py-5 bg-white text-black rounded-2xl font-black tracking-widest hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-2xl relative group overflow-hidden">
                            <span className="relative z-10 uppercase italic">{loading ? 'SEARCHING...' : 'LOCATE ORDER'}</span>
                            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </button>
                    </form>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest mb-10 flex items-center justify-center gap-3"
                        >
                            <X className="w-4 h-4" /> {error}
                        </motion.div>
                    )}

                    {status && (
                        <div className="space-y-12">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 pb-10 border-b border-border relative">
                                <div className="space-y-1">
                                    <h3 className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Authenticated ID</h3>
                                    <p className="text-3xl sm:text-4xl font-black text-foreground italic tracking-tighter">#{status.order_number}</p>
                                </div>
                                <div className="text-left sm:text-right space-y-1">
                                    <h3 className="text-[9px] font-black opacity-30 uppercase tracking-[0.3em] mb-1 text-foreground">Investment Value</h3>
                                    <p className="text-3xl sm:text-4xl font-black text-foreground italic tracking-tighter">Rs. {status.total_amount.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Tracker Steps */}
                            <div className="relative pt-4 pb-8">
                                <div className="flex justify-between items-center relative">
                                    {/* Connecting Line (Background) */}
                                    <div className="absolute top-[24px] sm:top-[28px] left-0 w-full h-[2px] bg-foreground/5 -z-10" />
                                    
                                    {/* Connecting Line (Progress) */}
                                    <div
                                        className="absolute top-[24px] sm:top-[28px] left-0 h-[2px] bg-primary -z-10 transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                        style={{ width: `${(getStatusStep(status.status) / 3) * 100}%` }}
                                    />

                                    {
                                        [
                                            { label: 'Pending', icon: Clock },
                                            { label: 'Processing', icon: Package },
                                            { label: 'Shipped', icon: Truck },
                                            { label: 'Delivered', icon: CheckCircle }
                                        ].map((step, index) => {
                                            const isActive = index <= getStatusStep(status.status);
                                            const isCurrent = index === getStatusStep(status.status);
                                            const Icon = step.icon;

                                            return (
                                                <div key={step.label} className="flex flex-col items-center gap-4 relative z-10 group">
                                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-700 border ${
                                                        isCurrent ? 'bg-primary border-primary text-foreground shadow-[0_0_30px_rgba(255,100,0,0.4)] scale-110' : 
                                                        isActive ? 'bg-white text-black border-white' : 
                                                        'bg-background border-border text-foreground/20'
                                                    }`}>
                                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isCurrent ? 'animate-bounce' : ''}`} />
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isActive ? 'text-foreground' : 'text-foreground/20'}`}>{step.label}</span>
                                                        {isCurrent && <span className="w-1 h-1 bg-primary rounded-full mt-2 animate-ping" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            </div>

                            {/* Items List (PREMIUM) */}
                            <div className="space-y-6 pt-10 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/30">CONSIGNMENT MANIFEST</h4>
                                    <span className="text-[9px] font-bold text-primary italic uppercase tracking-widest">{status.order_items?.length} TOTAL ENTITIES</span>
                                </div>
                                <div className="grid gap-3">
                                    {status.order_items?.map((item: any) => (
                                        <div key={item.id} className="group relative overflow-hidden rounded-[2rem] bg-foreground/[0.03] hover:bg-white/[0.05] border border-border p-5 transition-all duration-500 flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-black text-foreground flex items-center justify-center font-black text-lg italic border border-border shadow-2xl group-hover:scale-105 transition-transform">
                                                        {item.quantity}
                                                        <span className="text-[10px] absolute -top-1 -right-1 bg-primary px-1.5 py-0.5 rounded-lg not-italic">x</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black text-base text-foreground tracking-tight group-hover:text-primary transition-colors">{item.products?.name || 'Premium Item'}</p>
                                                    <div className="flex flex-col gap-1">
                                                        {(() => {
                                                            const combo = item.variant_combo || item.combination || {};
                                                            const variants = Object.entries(combo);
                                                            if (variants.length === 0) {
                                                                return <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Authentic Standard Edition</span>;
                                                            }
                                                            return (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {variants.map(([k, v]) => (
                                                                        <span key={k} className="text-[8px] font-black uppercase text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 tracking-widest">
                                                                            {k}: {String(v)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-foreground italic tracking-tighter group-hover:scale-110 transition-transform origin-right">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                                                <p className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest">Unit Price: {item.price.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {status.tracking_number && (
                                <div className="p-8 bg-foreground/[0.02] border border-border rounded-[2.5rem] space-y-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <Truck className="w-24 h-24" />
                                    </div>
                                    <div className="flex items-center gap-3 text-primary relative z-10">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-black uppercase tracking-[0.3em] text-xs text-foreground">Logistics Manifest</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-10 relative z-10">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">Carrier Network</p>
                                            <p className="font-black text-foreground text-lg italic tracking-tighter uppercase">{status.courier_name || 'Global Logistics'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">Tracking Reference</p>
                                            {(() => {
                                                const getTrackingUrl = (courier: string, num: string) => {
                                                    const c = courier?.toLowerCase() || '';
                                                    if (c.includes('tcs')) return `https://www.tcsexpress.com/track/${num}`;
                                                    if (c.includes('leopard')) return `https://www.leopardscourier.com/leopards-tracking?tracking_number=${num}`;
                                                    if (c.includes('m&p') || c.includes('m and p')) return `https://www.mulphilog.com/tracking-result?tracking_no=${num}`;
                                                    if (c.includes('trax')) return `https://trax.pk/tracking?tracking_number=${num}`;
                                                    if (c.includes('call')) return `https://callcourier.com.pk/tracking/?cn=${num}`;
                                                    return null;
                                                };
                                                const url = getTrackingUrl(status.courier_name, status.tracking_number);
                                                return url ? (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-black text-primary text-lg italic tracking-tighter select-all hover:text-foreground transition-colors flex items-center gap-2 group/link"
                                                    >
                                                        {status.tracking_number}
                                                        <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-all" />
                                                    </a>
                                                ) : (
                                                    <p className="font-black text-primary text-lg italic tracking-tighter select-all">{status.tracking_number}</p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    {/* Shipping Proof Section */}
                                    <div className="mt-6 pt-6 border-t border-border relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Visual Shipment Evidence</p>
                                            {status.shipping_proof_url && (
                                                <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified Dispatch</span>
                                            )}
                                        </div>
                                        {status.shipping_proof_url ? (
                                            <div
                                                className="w-full h-56 rounded-[2rem] overflow-hidden border border-border group/proof relative cursor-pointer shadow-2xl"
                                                onClick={() => window.open(status.shipping_proof_url, '_blank')}
                                            >
                                                <img src={status.shipping_proof_url} alt="Shipping Proof" className="w-full h-full object-cover transition-transform duration-700 group-hover/proof:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/proof:opacity-100 flex flex-col items-center justify-center transition-opacity duration-500">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 scale-75 group-hover/proof:scale-100 transition-transform duration-500">
                                                        <Eye className="w-6 h-6 text-foreground" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-foreground tracking-[0.3em]">Expand Documentation</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-40 rounded-[2rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 transition-opacity bg-foreground/[0.01]">
                                                <div className="w-10 h-10 rounded-full bg-foreground/[0.03] flex items-center justify-center">
                                                    <Camera className="w-5 h-5 text-foreground/10" />
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20 text-center px-10">Waiting for merchant to upload visual dispatch certification</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>,
        document.body
    );
};
