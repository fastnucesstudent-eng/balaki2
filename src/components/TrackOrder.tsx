import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, Package, Truck, CheckCircle, Clock, X, Eye, Camera } from 'lucide-react';
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
        if (!orderId.trim()) return;

        setLoading(true);
        setError('');
        setStatus(null);

        try {
            const id = orderId.trim().toUpperCase();
            
            // Use secure RPC for guest tracking
            const { data, error } = await supabase.rpc('get_order_status', { 
                p_order_number: id 
            });

            if (error) throw error;
            if (!data) {
                setError('Order not found. Please check your ID.');
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
                    className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative"
                >
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-white/10 bg-white/5 transition-colors z-10"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>

                    <div className="text-center mb-8 sm:mb-10 flex flex-col items-center">
                        <img src="/logo.png" alt="TARZIFY Logo" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-primary/30 shadow-2xl mb-4" />
                        <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-3 uppercase text-white">TRACK YOUR ORDER</h2>
                        <p className="text-xs sm:text-sm opacity-50 text-white font-medium max-w-xs sm:max-w-none">Enter your Order ID (e.g., BS123456) to see live status.</p>
                    </div>

                    <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10">
                        <div className="flex-grow relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary w-5 h-5 opacity-50" />
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Order ID (e.g. BS123456)"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-base font-bold outline-none focus:ring-2 ring-primary/50 text-white placeholder:text-white/20 transition-all"
                            />
                        </div>
                        <button disabled={loading} className="px-8 py-4 bg-primary text-white rounded-2xl font-black tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-lg shadow-primary/20">
                            {loading ? 'TRACKING...' : 'TRACK'}
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center text-xs font-black uppercase tracking-widest mb-8">
                            {error}
                        </div>
                    )}

                    {status && (
                        <div className="space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-white/5">
                                <div>
                                    <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1 text-white">Order ID</h3>
                                    <p className="text-xl sm:text-2xl font-black text-primary">#{status.order_number}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1 text-white">Total Amount</h3>
                                    <p className="text-xl sm:text-2xl font-black text-white">Rs. {status.total_amount.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Tracker Steps */}
                            <div className="relative flex justify-between">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-foreground/5 -z-10 -translate-y-1/2" />
                                <div
                                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-1000"
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
                                            <div key={step.label} className="flex flex-col items-center gap-2 sm:gap-4 bg-[#09090b] px-1 sm:px-2 relative z-10">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/10 opacity-30'} ${isCurrent ? 'animate-pulse ring-4 ring-primary/20 scale-110' : ''}`}>
                                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center ${isActive ? 'opacity-100 text-primary' : 'opacity-30 text-white'}`}>{step.label}</span>
                                            </div>
                                        );
                                    })
                                }
                            </div>

                            {/* Items List (NEW) */}
                            <div className="space-y-4 pt-8 border-t border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">ORDER ITEMS</h4>
                                <div className="space-y-3">
                                    {status.order_items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center group bg-white/5 p-4 rounded-3xl border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm">{item.products?.name || 'Product'}</p>
                                                    <div className="flex flex-col gap-0.5">
                                                        {(() => {
                                                            const combo = item.variant_combo || item.combination || {};
                                                            const variants = Object.entries(combo);
                                                            if (variants.length === 0) {
                                                                return <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Standard Edition</span>;
                                                            }
                                                            return (
                                                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                    {variants.map(([k, v]) => (
                                                                        <span key={k} className="text-[9px] font-black uppercase text-primary">
                                                                            {k}: {String(v)}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="font-black tracking-tighter text-sm italic opacity-50">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {status.tracking_number && (
                                <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-2">
                                    <div className="flex items-center gap-3 text-primary">
                                        <Truck className="w-5 h-5" />
                                        <h4 className="font-black uppercase tracking-widest text-sm">Shipping Information</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Courier Partner</p>
                                            <p className="font-black">{status.courier_name || 'Standard'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Tracking Number</p>
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
                                                        className="font-black text-primary select-all hover:underline flex items-center gap-1 group"
                                                    >
                                                        {status.tracking_number}
                                                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                ) : (
                                                    <p className="font-black text-primary select-all">{status.tracking_number}</p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    {/* Shipping Proof Section */}
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-3">Shipment Proof</p>
                                        {status.shipping_proof_url ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const win = window.open(status.shipping_proof_url, '_blank');
                                                        if (win) win.focus();
                                                    }}
                                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-tighter text-primary hover:opacity-80 transition-opacity mb-3"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View Full Shipment Proof
                                                </button>
                                                <div
                                                    className="w-full h-48 rounded-2xl overflow-hidden border border-white/10 group relative cursor-pointer"
                                                    onClick={() => window.open(status.shipping_proof_url, '_blank')}
                                                >
                                                    <img src={status.shipping_proof_url} alt="Shipping Proof" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Click to Expand</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* Placeholder — no proof uploaded yet */
                                            <div className="w-full h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 opacity-40">
                                                <Camera className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting shipment proof from merchant</span>
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
