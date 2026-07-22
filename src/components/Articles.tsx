import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight, Calendar, X, Clock } from 'lucide-react';

export const Articles = () => {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchArticles = async () => {
            try {
                const { data, error } = await supabase
                    .from('articles')
                    .select('*')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (!mounted) return;
                if (error) throw error;
                if (data) setArticles(data);
            } catch (err: any) {
                // Ignore AbortError from React 18 strict mode unmount/remount
                if (err?.name === 'AbortError' || err?.message?.includes('AbortError') || err?.code === '') return;
                console.error('Error fetching articles:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchArticles();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (selectedArticle) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedArticle]);

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="font-black uppercase tracking-tighter italic">Loading stories...</p>
        </div>
    );

    if (articles.length === 0) return null;

    return (
        <section className="py-24 px-5 max-w-7xl mx-auto overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="space-y-2"
                >
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase leading-none">
                        Latest <span className="text-primary italic">Stories</span>
                    </h2>
                    <p className="text-xs md:text-sm font-bold opacity-40 uppercase tracking-[0.3em]">Insights & Organic Living</p>
                </motion.div>
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary hover:gap-5 transition-all"
                >
                    Explore Blog <ArrowRight className="w-4 h-4" />
                </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {articles.map((article, index) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="group cursor-pointer"
                        onClick={() => setSelectedArticle(article)}
                    >
                        {article.image_url && (
                            <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6 shadow-2xl shadow-black/5">
                                <img 
                                    src={article.image_url} 
                                    alt={article.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <div className="space-y-3 px-2">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(article.created_at).toLocaleDateString()}
                                </span>
                                <span className="w-1 h-1 bg-primary rounded-full" />
                                <span>Lifestyle</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tighter uppercase italic leading-tight group-hover:text-primary transition-colors">
                                {article.title}
                            </h3>
                            <p className="text-sm opacity-50 font-medium line-clamp-2 leading-relaxed">
                                {article.excerpt}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {selectedArticle && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10"
                    >
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedArticle(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <button 
                                onClick={() => setSelectedArticle(null)}
                                className="absolute top-6 right-6 z-[60] p-4 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full hover:rotate-90 transition-all text-white cursor-pointer shadow-xl"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="overflow-y-auto custom-scrollbar" data-lenis-prevent>
                                {selectedArticle.image_url && (
                                    <div className="aspect-[21/9] w-full relative">
                                        <img 
                                            src={selectedArticle.image_url} 
                                            className="w-full h-full object-cover" 
                                            alt={selectedArticle.title}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 via-transparent to-transparent" />
                                    </div>
                                )}

                                <div className="p-8 md:p-12 relative z-10">
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 bg-primary rounded-full" />
                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> 5 Min Read</span>
                                    </div>

                                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none mb-8 text-foreground">
                                        {selectedArticle.title}
                                    </h2>

                                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                                        <p className="text-lg md:text-xl font-bold opacity-60 mb-10 leading-relaxed italic border-l-4 border-primary pl-6 py-2 text-foreground">
                                            {selectedArticle.excerpt}
                                        </p>
                                        <div className="text-sm md:text-base opacity-80 leading-[1.8] whitespace-pre-wrap font-medium text-foreground">
                                            {selectedArticle.content}
                                        </div>
                                    </div>

                                    <div className="mt-16 pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black italic">B</div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-40">Published By</p>
                                                <p className="text-xs font-black uppercase tracking-wider text-foreground">Balaki Organic Editorial</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedArticle(null)}
                                            className="px-8 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                        >
                                            Back to Stories
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
