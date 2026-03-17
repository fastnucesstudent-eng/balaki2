import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { Package, Clock, MapPin, ChevronRight, LogOut, Settings, ArrowLeft, Star, CheckCircle2, X } from 'lucide-react';
import { AccountSettingsModal } from '../components/AccountSettingsModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { PrivacySecurityModal } from '../components/PrivacySecurityModal';

export const ProfilePage = () => {
    const { user, signOut } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'to-review' | 'my-reviews'>('orders');
    const [showSettings, setShowSettings] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [selectedReviewImage, setSelectedReviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            const fetchData = async () => {
                setLoading(true);
                // Fetch Orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('*, order_items(*, products(*))')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                // Fetch Reviews
                const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select('*, products(name, image_url)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (ordersData) setOrders(ordersData);
                if (reviewsData) setReviews(reviewsData);
                setLoading(false);
            };
            fetchData();
        }
    }, [user]);

    const deliveredItemsToReview = orders
        .filter(o => o.status === 'delivered')
        .flatMap(o => o.order_items.map((item: any) => ({ ...item, order_id: o.id, order_number: o.order_number })))
        .filter(item => !reviews.some(r => r.order_id === item.order_id && r.product_id === item.product_id));

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background pt-32 pb-24 px-6 font-primary">
            {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
            {selectedOrder && <ReceiptModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
            {showPrivacy && <PrivacySecurityModal onClose={() => setShowPrivacy(false)} />}

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass p-8 rounded-[3rem] border-white/5 space-y-8 shadow-2xl">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-black">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">{user.user_metadata?.full_name || 'Member'}</h2>
                                <p className="text-sm opacity-50 font-medium">{user.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-8 border-t border-white/10">
                            <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all group ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-foreground/5 hover:bg-primary/10 hover:text-primary'}`}>
                                <Package className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                <span className="font-black text-sm uppercase tracking-widest">Order History</span>
                            </button>
                            <button onClick={() => setActiveTab('to-review')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all group ${activeTab === 'to-review' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-foreground/5 hover:bg-primary/10 hover:text-primary'}`}>
                                <Clock className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-black text-sm uppercase tracking-widest">To Review</span>
                                    {deliveredItemsToReview.length > 0 && <span className="bg-white text-primary text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{deliveredItemsToReview.length}</span>}
                                </div>
                            </button>
                            <button onClick={() => setActiveTab('my-reviews')} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all group ${activeTab === 'my-reviews' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-foreground/5 hover:bg-primary/10 hover:text-primary'}`}>
                                <ArrowLeft className="w-5 h-5 opacity-50 group-hover:opacity-100 rotate-180" />
                                <span className="font-black text-sm uppercase tracking-widest">My Reviews</span>
                            </button>
                            <div className="pt-4 space-y-2 border-t border-white/5 mt-4">
                                <button onClick={() => setShowSettings(true)} className="flex items-center gap-4 w-full p-4 rounded-2xl bg-foreground/5 hover:bg-primary/10 hover:text-primary transition-all group">
                                    <Settings className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                    <span className="font-black text-sm uppercase tracking-widest">Settings</span>
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="flex items-center gap-4 w-full p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all group"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-black text-sm uppercase tracking-widest">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Spacer for bottom */}
                    <div className="h-20" />
                </div>

                <div className="lg:col-span-8 space-y-12">
                    {activeTab === 'orders' && (
                        <>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter italic uppercase">Order History</h1>
                                <p className="opacity-50 mt-2 font-medium">Track and manage your past purchases.</p>
                            </div>

                            <div className="space-y-6">
                                {loading ? (
                                    [1, 2, 3].map(i => <div key={i} className="h-48 glass rounded-[2.5rem] animate-pulse" />)
                                ) : orders.length > 0 ? (
                                    orders.map((order: any) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6 hover:translate-x-2 transition-transform cursor-pointer group shadow-xl"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black">Order #{order.order_number}</p>
                                                        <p className="text-xs opacity-50 font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black tracking-tight">Rs. {order.total_amount.toLocaleString()}</p>
                                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>{order.status}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Estimated Delivery: 3 Days</span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[200px]">{order.shipping_address}</span>
                                                </div>
                                            </div>

                                            <div onClick={() => setSelectedOrder(order)} className="flex items-center justify-end text-primary group-hover:gap-2 transition-all">
                                                <span className="text-xs font-black uppercase tracking-widest">View Receipt</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-24 text-center glass rounded-[2.5rem] opacity-30 italic">
                                        <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-2xl font-black">No orders found yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'to-review' && (
                        <>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter italic uppercase">To Review</h1>
                                <p className="opacity-50 mt-2 font-medium">Items from your delivered orders waiting for your feedback.</p>
                            </div>

                            <div className="space-y-6">
                                {loading ? (
                                    [1, 2].map(i => <div key={i} className="h-32 glass rounded-[2.5rem] animate-pulse" />)
                                ) : deliveredItemsToReview.length > 0 ? (
                                    deliveredItemsToReview.map((item: any) => (
                                        <motion.div
                                            key={`${item.order_id}-${item.product_id}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass p-6 rounded-[2rem] border-white/5 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-foreground/5 shadow-lg flex-shrink-0">
                                                    <img src={item.products?.image_url} alt={item.products?.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg">{item.products?.name}</p>
                                                    <p className="text-xs opacity-50 font-bold uppercase tracking-wider">Order #{item.order_number}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => window.location.hash = `#rate-product?order_id=${item.order_id}&product_id=${item.product_id}&user_id=${user.id}`}
                                                className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase italic tracking-tighter text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                                            >
                                                Review Now
                                            </button>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-24 text-center glass rounded-[2.5rem] opacity-30 italic">
                                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-2xl font-black">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'my-reviews' && (
                        <>
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter italic uppercase">My Reviews</h1>
                                <p className="opacity-50 mt-2 font-medium">Your shared experiences and feedback.</p>
                            </div>

                            <div className="space-y-6">
                                {loading ? (
                                    [1, 2].map(i => <div key={i} className="h-40 glass rounded-[2.5rem] animate-pulse" />)
                                ) : reviews.length > 0 ? (
                                    reviews.map((review: any) => (
                                        <motion.div
                                            key={review.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-foreground/5">
                                                        <img src={review.products?.image_url} alt={review.products?.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black">{review.products?.name}</p>
                                                        <div className="flex gap-0.5 mt-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-foreground/10'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => window.location.hash = `#rate-product?order_id=${review.order_id}&product_id=${review.product_id}&user_id=${user.id}&rating=${review.rating}`}
                                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                                                >
                                                    Edit Review
                                                </button>
                                            </div>
                                            <p className="text-sm opacity-70 leading-relaxed font-medium">"{review.comment}"</p>
                                            {review.image_urls && review.image_urls.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {review.image_urls.map((url: string, i: number) => (
                                                        <img 
                                                            key={i} 
                                                            src={url} 
                                                            onClick={() => setSelectedReviewImage(url)}
                                                            className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-sm hover:scale-105 transition-transform cursor-pointer" 
                                                            alt="Review" 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-24 text-center glass rounded-[2.5rem] opacity-30 italic">
                                        <Star className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                        <p className="text-2xl font-black">No reviews posted yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            {/* Image Lightbox Modal */}
            {selectedReviewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedReviewImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedReviewImage(null); }}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={selectedReviewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    </div>
);
};
