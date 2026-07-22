import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Banner {
    id: number;
    image_url: string;
    link_url?: string;
    slide_duration: number;
}

export const HeroBanner = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const { data, error } = await supabase
                    .from('banners')
                    .select('*')
                    .eq('is_active', true)
                    .order('id', { ascending: true });

                if (error) {
                    // Silence AbortErrors
                    if (error.message?.includes('aborted') || error.name === 'AbortError') return;

                    // Check if it's the "table missing" error (42P01 in Postgres)
                    if (error.code === '42P01') {
                        console.warn('Banners table does not exist yet. Please run migration_banners_v3.sql');
                    } else {
                        console.error('Error fetching banners:', error);
                    }
                    setLoading(false);
                    return;
                }

                if (data) {
                    setBanners(data);
                }
            } catch (err) {
                console.error('Unexpected error in HeroBanner:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();

        // Realtime subscription
        const channel = supabase
            .channel('banners_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, fetchBanners)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;

        const duration = banners[currentIndex]?.slide_duration || 5000;
        const timer = setTimeout(() => {
            nextSlide();
        }, duration);

        return () => clearTimeout(timer);
    }, [currentIndex, banners]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    if (loading) return (
        <div className="w-full aspect-[16/7] md:aspect-[4/1] bg-foreground/5 rounded-[2rem] animate-pulse flex items-center justify-center">
            <p className="text-[10px] font-black uppercase opacity-20 italic tracking-widest">Loading Highlights...</p>
        </div>
    );

    if (banners.length === 0) return null;
    return (
        <section className="relative w-full max-w-[1400px] mx-auto px-4 md:px-6 mb-6 md:mb-12">
            <div className="relative aspect-[16/7] md:aspect-[4/1] rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={banners[currentIndex].id}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.8, ease: "circOut" }}
                        className="absolute inset-0"
                    >
                        <img 
                            src={banners[currentIndex].image_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {banners[currentIndex].link_url && (
                             <motion.a
                                href={banners[currentIndex].link_url}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-8 left-8 md:bottom-12 md:left-12 px-6 py-3 bg-white text-black rounded-full font-black uppercase italic text-xs md:text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                             >
                                Explore Now <ExternalLink className="w-4 h-4" />
                             </motion.a>
                        )}
                    </motion.div>
                </AnimatePresence>

                {banners.length > 1 && (
                    <>
                        {/* Navigation Arrows */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/20 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/20 backdrop-blur-md border border-white/10 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>

                        {/* Dots */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            {banners.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`h-1.5 rounded-full transition-all ${currentIndex === i ? 'w-8 bg-white' : 'w-1.5 bg-white/30'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};
