import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Upload, X, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

interface RateProductProps {
    params: {
        order_id: string;
        product_id: string;
        user_id?: string;
        rating?: string;
        sig?: string;
    };
    onComplete: () => void;
}

export const RateProduct = ({ params, onComplete }: RateProductProps) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const [rating, setRating] = useState(Number(params.rating) || 5);
    const [comment, setComment] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', params.product_id)
                    .single();

                if (error) throw error;
                setProduct(data);

                // If user is logged in, check for existing review for this order/product to pre-fill
                const { data: existingReview } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('order_id', params.order_id)
                    .eq('product_id', params.product_id)
                    .maybeSingle();

                if (existingReview) {
                    setRating(existingReview.rating);
                    setComment(existingReview.comment || '');
                    setImageUrls(existingReview.image_urls || []);
                }
            } catch (err: any) {
                console.error('Error fetching product/review:', err);
                useToastStore.getState().show('Failed to load product details.', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (params.product_id) fetchProduct();
    }, [params]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://upload-widget.cloudinary.com/global/all.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const openUploadWidget = () => {
        if (imageUrls.length >= 5) {
            useToastStore.getState().show('Max 5 images allowed', 'error');
            return;
        }

        if (!(window as any).cloudinary) {
            useToastStore.getState().show('Upload widget not loaded', 'error');
            return;
        }

        (window as any).cloudinary.openUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                multiple: true,
                maxFiles: 5 - imageUrls.length,
                clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
            },
            (error: any, result: any) => {
                if (!error && result && result.event === "success") {
                    setImageUrls(prev => [...prev, result.info.secure_url]);
                }
            }
        );
    };

    const handleRemoveImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://backend.tarzify.com/api');
            
            // We use our new backend API to handle signature verification and order ownership
            const res = await fetch(`${apiUrl}/orders/submit-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: params.order_id,
                    product_id: params.product_id,
                    user_id: params.user_id || (await supabase.auth.getUser()).data.user?.id,
                    rating,
                    comment,
                    image_urls: imageUrls,
                    sig: params.sig
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit review');

            setSuccess(true);
            useToastStore.getState().show('Review submitted successfully!', 'success');
            setTimeout(() => onComplete(), 2000);
        } catch (err: any) {
            console.error('Submit review error:', err);
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="font-black uppercase tracking-tighter opacity-30 italic">Loading review form...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 text-center px-6">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Product Not Found</h2>
                <button onClick={onComplete} className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20">Go Back Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-32 pb-20 px-6">
            <div className="max-w-2xl mx-auto">
                <button onClick={onComplete} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    Discard & Exit
                </button>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass p-12 rounded-[3rem] text-center space-y-6 shadow-2xl border-white/5"
                        >
                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black uppercase italic tracking-tighter">Review Submitted!</h1>
                                <p className="opacity-50 font-medium">Thank you for your valuable feedback.</p>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Redirecting you back...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass p-8 md:p-12 rounded-[3rem] shadow-2xl border-white/5 space-y-10"
                        >
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-foreground/5 flex-shrink-0 shadow-lg">
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="space-y-2 flex-grow">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Write a Review</p>
                                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter leading-none">{product.name}</h1>
                                    <p className="text-sm opacity-50 font-medium">Order #{params.order_id}</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-10">
                                {/* Rating Stars */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40">Overall Rating</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setRating(s)}
                                                className={`transition-all ${s <= rating ? 'text-yellow-400 scale-110' : 'text-foreground/10 hover:text-foreground/20'}`}
                                            >
                                                <Star className="w-10 h-10 fill-current border-none" strokeWidth={1} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment Box */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest opacity-40">Your Experience</label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Tell us what you loved (or didn't) about this product..."
                                        className="w-full bg-foreground/5 rounded-3xl p-6 min-h-[150px] outline-none focus:ring-2 ring-primary/30 transition-all font-medium text-sm md:text-base border border-white/5"
                                        required
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-widest opacity-40">Add Photos (Max 5)</label>
                                        <span className="text-[10px] opacity-30 font-bold">{imageUrls.length}/5 photos</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                        {imageUrls.map((url, i) => (
                                            <div key={i} className="aspect-square relative group rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                                <img src={url} alt={`Review ${i}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(i)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {imageUrls.length < 5 && (
                                            <button
                                                type="button"
                                                onClick={openUploadWidget}
                                                className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs opacity-50 hover:opacity-100"
                                            >
                                                <Upload className="w-6 h-6" />
                                                <span className="font-black uppercase tracking-tighter text-[9px]">Add Photo</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={submitting || !comment.trim()}
                                        className="w-full bg-primary text-white py-6 rounded-[2rem] font-black uppercase italic tracking-tighter text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Star className="w-6 h-6" />}
                                        {submitting ? 'Sharing Feedback...' : 'Post My Review'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
