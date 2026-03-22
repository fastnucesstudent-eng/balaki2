import { motion, type Variants } from 'framer-motion';
import { Zap } from 'lucide-react';

export const Hero = () => {

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const charVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                damping: 12,
                stiffness: 200
            }
        }
    };

    return (
        <section className="relative min-h-[50vh] md:min-h-[65vh] flex items-center justify-center pt-0 pb-12 md:pb-20 overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/20 rounded-full blur-[80px] md:blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-accent/20 rounded-full blur-[80px] md:blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="container mx-auto px-4 md:px-6 text-center z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center"
                >
                    <h1 className="font-black mb-6 md:mb-12 tracking-tighter flex flex-col items-center uppercase leading-none overflow-visible">
                        <div className="flex flex-wrap justify-center pb-4 md:pb-8 overflow-visible">
                            {"TARZIFY".split("").map((char, index) => (
                                <motion.span
                                    key={index}
                                    variants={charVariants}
                                    className="inline-block text-[3rem] sm:text-[5rem] md:text-[7.5rem] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic leading-none z-20 font-black px-1 md:px-2"
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </div>

                        <div className="relative group px-4 -mt-4 md:-mt-8 z-10 overflow-visible text-center flex flex-wrap justify-center">
                            {"Premium".split("").map((char, index) => (
                                <motion.span
                                    key={index}
                                    variants={charVariants}
                                    className="text-[1.5rem] sm:text-[3rem] md:text-[4.5rem] text-foreground inline-block leading-none font-bold px-1"
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </div>

                        <div className="relative group px-4 mt-1 z-0 overflow-visible text-center flex flex-wrap justify-center translate-y-[-5px] md:translate-y-0">
                            {"Lifestyle Store".split("").map((char, index) => (
                                <motion.span
                                    key={index}
                                    variants={charVariants}
                                    className={`text-[0.8rem] sm:text-[1.5rem] md:text-[2.2rem] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic leading-none inline-block font-bold px-1 ${char === " " ? "mx-1.5 md:mx-2" : ""}`}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </div>
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-foreground/60 max-w-2xl md:max-w-3xl mx-auto mb-5 md:mb-8 leading-relaxed font-medium px-4">
                        Discover a complete shopping ecosystem where premium quality meets unparalleled convenience. Delivered with trust and speed across Pakistan.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-6 md:px-0">
                        <button
                            onClick={() => {
                                window.location.hash = '#';
                                const el = document.getElementById('categories');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    window.scrollBy({ top: window.innerHeight * 0.3, behavior: 'smooth' });
                                }
                            }}
                            className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-sm md:text-lg hover:scale-105 transition-transform shadow-[0_15px_40px_rgba(0,0,0,0.1)]"
                        >
                            Shop the Collection
                        </button>

                        <button
                            onClick={() => {
                                if (window.location.hash === '#sale') {
                                    window.location.hash = '#';
                                    return;
                                }
                                const el = document.getElementById('catalog');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    window.location.hash = '#sale';
                                }
                            }}
                            className="sm:hidden w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-full font-black text-sm hover:scale-105 transition-transform shadow-[0_10px_30px_rgba(255,0,0,0.2)] animate-pulse"
                        >
                            <Zap className="w-4 h-4" />
                            {window.location.hash === '#sale' ? 'Show All Products' : 'Flash Sale Live'}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Hero Visual */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-20">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 md:gap-4 rotate-12 scale-125 md:scale-150">
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className="aspect-square glass rounded-xl md:rounded-2xl animate-pulse"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
