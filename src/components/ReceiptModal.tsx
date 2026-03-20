import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Printer, CheckCircle, MapPin, Mail, Phone, Truck } from 'lucide-react';

export const ReceiptModal = ({ order, onClose }: { order: any, onClose: () => void }) => {
    const trackUrl = `${window.location.origin}/#track-order?id=${order.order_number}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackUrl)}`;

    // Lock background scroll while modal is open (fixes Lenis hijacking scroll)
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl overflow-y-auto overscroll-contain receipt-modal-portal"
            data-lenis-prevent
        >
            <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-12">
                {/* ❌ Close button — sticky, large, RED, always visible */}
                <button
                    onClick={onClose}
                    className="sticky top-2 self-end z-[210] flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-2xl font-black text-sm tracking-widest shadow-xl transition-all mb-4"
                    aria-label="Close receipt"
                >
                    <X className="w-4 h-4" /> CLOSE
                </button>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white text-black w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] mb-8 print:shadow-none print:m-0 print:rounded-none"
                    id="receipt-print-area"
                >
                    {/* Header / Branding */}
                    <div className="bg-black p-10 text-white relative">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">TARZIFY</h2>
                                <p className="text-xs font-bold tracking-[0.2em] opacity-50 uppercase">Official Order Receipt</p>
                            </div>
                            <div className="text-right">
                                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Order Number</p>
                                    <p className="font-mono text-xl font-bold tracking-tighter">#{order.order_number}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-10 space-y-10">
                        {/* QR & Status Section */}
                        <div className="flex flex-col md:flex-row gap-10 items-center border-b pb-10 border-gray-100">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] scale-95 group-hover:scale-100 transition-transform duration-500" />
                                <img src={qrUrl} className="w-32 h-32 relative" alt="Scan to track" />
                                <p className="text-center text-[8px] font-black uppercase tracking-widest mt-2 opacity-30">Scan to Track</p>
                            </div>
                            <div className="flex-grow space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-full">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-extrabold text-sm uppercase tracking-widest">Order {order.status}</span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tighter">Your order is confirmed.</h3>
                                {order.tracking_number && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Tracking Information</p>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-primary" />
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
                                                const url = getTrackingUrl(order.courier_name, order.tracking_number);
                                                return url ? (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-black text-primary hover:underline"
                                                    >
                                                        {order.courier_name || 'Courier'}: {order.tracking_number}
                                                    </a>
                                                ) : (
                                                    <p className="text-sm font-black">{order.tracking_number}</p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm opacity-50 leading-relaxed max-w-sm">Thank you for choosing TARZIFY. Your premium selection is being processed and will be with you shortly.</p>
                            </div>
                        </div>

                        {/* Customer & Store Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <h4 className="font-black uppercase opacity-30 text-[10px] tracking-[0.2em]">Shipping Details</h4>
                                <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4 border border-gray-100">
                                    <div className="space-y-1">
                                        <p className="font-black text-lg">{order.profiles?.full_name || 'Valued Customer'}</p>
                                        <div className="flex items-start gap-3 opacity-60 text-sm leading-tight">
                                            <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                                            <span>{order.shipping_address}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 opacity-60 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            <span>{order.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-black uppercase opacity-30 text-[10px] tracking-[0.2em]">Store Information</h4>
                                <div className="p-6 rounded-[2rem] space-y-2 border border-black/5">
                                    <p className="font-black text-lg">TARZIFY HQ</p>
                                    <p className="text-xs opacity-50">Luxury Plaza, Gulberg III, Lahore, Pakistan</p>
                                    <div className="pt-4 space-y-2">
                                        <div className="flex items-center gap-2 text-xs opacity-60">
                                            <Mail className="w-4 h-4" />
                                            <span>customersupport.tarzify.com</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs opacity-60 italic">
                                            <span className="font-bold">Web:</span> tarzify.tarzify.com
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b-2 border-black pb-4">
                                <h4 className="font-black uppercase text-xs tracking-[0.2em]">Purchased Items</h4>
                                <span className="text-[10px] font-bold opacity-30 italic">{order.order_items?.length} items</span>
                            </div>
                            <div className="space-y-4">
                                {order.order_items?.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-black text-xs">
                                                {item.quantity}x
                                            </div>
                                            <div>
                                                <p className="font-black text-sm">{item.name || item.products?.name || 'Product'}</p>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] opacity-30 tracking-widest font-bold uppercase">{item.products?.sku || 'PREMIUM-ITEM'}</p>
                                                    {(() => {
                                                        const combo = item.variant_combo || item.combination || {};
                                                        const variants = Object.entries(combo);
                                                        if (variants.length === 0) return null;
                                                        return (
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {variants.map(([k, v]) => (
                                                                    <span key={k} className="text-[9px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                                                                        {k}: {String(v)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="font-black tracking-tighter">Rs. {( (parseFloat(String(item.price)) || 0) * item.quantity).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals & Proof */}
                        <div className="border-t-2 border-dashed pt-8 mt-10 space-y-10">
                            {/* Shipping Proof Evidence (Visible to Customer) */}
                            {order.shipping_proof_url && (
                                <div className="space-y-4">
                                    <h4 className="font-black uppercase opacity-30 text-[10px] tracking-[0.2em]">Merchant Shipping Proof</h4>
                                    <div 
                                        className="w-full h-64 rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl cursor-pointer group relative"
                                        onClick={() => window.open(order.shipping_proof_url, '_blank')}
                                    >
                                        <img 
                                            src={order.shipping_proof_url} 
                                            alt="Shipping Proof" 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl">View Full Evidence</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] opacity-40 italic font-medium text-center italic">This image was uploaded by the merchant as proof of dispatch.</p>
                                </div>
                            )}

                            <div className="space-y-3 mb-6 px-4">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold opacity-40 uppercase tracking-widest">Subtotal</span>
                                    <span className="font-black italic">Rs. {(() => {
                                        const sub = order.order_items?.reduce((sum: number, item: any) => {
                                            const p = parseFloat(String(item.price)) || 0;
                                            return sum + (p * item.quantity);
                                        }, 0) || 0;
                                        return sub.toLocaleString();
                                    })()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold opacity-40 uppercase tracking-widest">Shipping Charges</span>
                                    <span className="font-black italic text-primary">Rs. {(() => {
                                        const shipAmount = parseFloat(String(order.shipping_amount)) || 0;
                                        if (order.shipping_amount !== undefined && order.shipping_amount !== null) {
                                            return shipAmount.toLocaleString();
                                        }
                                        const sub = order.order_items?.reduce((sum: number, item: any) => {
                                            const p = parseFloat(String(item.price)) || 0;
                                            return sum + (p * item.quantity);
                                        }, 0) || 0;
                                        const discount = parseFloat(String(order.discount_amount)) || 0;
                                        const total = parseFloat(String(order.total_amount)) || 0;
                                        const ship = total - sub + discount;
                                        return ship.toLocaleString();
                                    })()}</span>
                                </div>
                                {parseFloat(String(order.discount_amount)) > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span className="font-bold uppercase tracking-widest">Voucher Discount</span>
                                        <span className="font-black italic">- Rs. {parseFloat(String(order.discount_amount)).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-50">Grand Total Amount</p>
                                    <p className="text-[10px] font-bold opacity-30 italic">Payment via {order.payment_method?.toUpperCase() || 'COD'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black tracking-tighter">Rs. {parseFloat(String(order.total_amount)).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-gray-100 bg-gray-50/50">
                        <div className="text-center md:text-left">
                            <p className="font-black text-sm tracking-tighter">AUTHENTIC PREMIUM INVOICE</p>
                            <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest">© 2026 TARZIFY Logisitics</p>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-3 px-10 py-5 bg-black text-white rounded-full font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                        >
                            <Printer className="w-5 h-5" />
                            PRINT DOCUMENT
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>,
        document.body
    );
};
