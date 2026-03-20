import { motion } from 'framer-motion';
import { useMerchants } from '../hooks/useMerchants';
import {
    Loader2, ChevronRight
} from 'lucide-react';

export const MerchantSection = () => {
    const { merchants, loading } = useMerchants();

    const handleMerchantClick = (slug: string) => {
        window.location.hash = `#store/${slug}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading && merchants.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (merchants.length === 0 && !loading) return null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                damping: 15,
                stiffness: 100
            }
        }
    };

    return (
        <section id="merchants" className="py-6 md:py-12 px-5 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic uppercase">Featured Stores</h2>
                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Shop directly from top merchants</p>
                </motion.div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-4"
            >
                {merchants.map((merchant) => (
                    <motion.div
                        key={merchant.id}
                        variants={itemVariants}
                        onClick={() => handleMerchantClick(merchant.store_slug)}
                        className="group cursor-pointer"
                    >
                        <div className="relative aspect-square rounded-[1.5rem] overflow-hidden shadow-lg border border-black/5 dark:border-white/5 transition-all group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:border-primary/20 bg-white dark:bg-zinc-900/50">
                            {/* Merchant Logo/Initial */}
                            <div className="w-full h-full flex items-center justify-center p-2 sm:p-3">
                                <div className="w-full h-full p-1.5 bg-foreground/5 rounded-xl flex items-center justify-center">
                                     {merchant.logo_url ? (
                                         <img 
                                             src={merchant.logo_url} 
                                             alt={merchant.store_name || merchant.full_name} 
                                             className="w-full h-full object-cover rounded-lg"
                                         />
                                     ) : (
                                         <div className="text-xl font-black text-primary uppercase italic">
                                             {(merchant.store_name || merchant.full_name)?.[0] || 'M'}
                                         </div>
                                     )}
                                </div>
                            </div>

                            {/* Info Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center">
                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight text-white leading-none italic block truncate">
                                    {merchant.store_name || merchant.full_name}
                                </span>
                                {(merchant.store_name || merchant.full_name)?.toLowerCase() !== merchant.store_slug?.toLowerCase() && (
                                    <span className="text-[6px] font-bold uppercase tracking-widest text-primary mt-0.5 block opacity-80">
                                        @{merchant.store_slug}
                                    </span>
                                )}
                            </div>

                            {/* Hover Visit Link */}
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-all duration-500">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-black flex items-center gap-1">
                                        VIEW STORE <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
};
