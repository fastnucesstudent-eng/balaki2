import { motion } from 'framer-motion';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { Loader2, ChevronRight } from 'lucide-react';

export const CategorySection = ({ activeCategory, onCategoryChange }: { activeCategory: string, onCategoryChange: (name: string) => void }) => {
    const { categories, loading: catsLoading } = useCategories();
    const { products, loading: productsLoading } = useProducts();

    const handleCategoryClick = (categoryName: string) => {
        onCategoryChange(categoryName);
        // Scroll to catalog
        const catalogEl = document.getElementById('catalog');
        if (catalogEl) {
            catalogEl.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if ((catsLoading || productsLoading) && categories.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Only show categories that have images AND have at least one product
    const activeCategoryNames = new Set(products.map(p => p.category));
    const displayCategories = categories.filter(c => c.image_url && activeCategoryNames.has(c.name));

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

    if (displayCategories.length === 0 && !catsLoading) return null;

    return (
        <section id="categories" className="py-6 md:py-12 px-5 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter italic uppercase">Categories</h2>
                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Explore our collections</p>
                </motion.div>
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    onClick={() => handleCategoryClick('All')}
                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'All' ? 'text-gray-400' : 'text-primary hover:gap-3'}`}
                >
                    View All {activeCategory === 'All' ? null : <ChevronRight className="w-4 h-4" />}
                </motion.button>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-6"
            >
                {displayCategories.map((category) => {
                    const isActive = activeCategory === category.name;
                    return (
                        <motion.div
                            key={category.id}
                            variants={itemVariants}
                            onClick={() => handleCategoryClick(category.name)}
                            className="group cursor-pointer"
                        >
                            <div className={`relative aspect-square rounded-2xl overflow-hidden shadow-xl border transition-all group-hover:scale-[1.03] group-hover:shadow-2xl ${isActive ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 scale-[1.03]' : 'border-black/5 dark:border-white/5'}`}>
                                {/* Full Image */}
                                <img
                                    src={category.image_url}
                                    alt={category.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />

                                {/* Gradient Overlay for Text Readability */}
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${isActive ? 'opacity-70' : 'opacity-100 group-hover:opacity-90'}`} />

                                {/* Center-aligned name at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-center">
                                    <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tighter drop-shadow-lg leading-none italic block transition-colors ${isActive ? 'text-primary' : 'text-white'}`}>
                                        {category.name}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
};
