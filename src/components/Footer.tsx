import { MapPin, Phone, Mail, Instagram, Twitter, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProductStore } from '../stores/useProductStore';
import { memo } from 'react';

const POPULAR_SEARCHES = [
    "buy organic honey Pakistan", "balaki organic store", "raw sidr honey Lahore", "pure cold pressed oil Pakistan",
    "cash on delivery organic food", "fast organic delivery", "best pure honey price", "organic spices Pakistan",
    "buy desi ghee online", "organic herbal tea Pakistan", "natural skincare Lahore", "organic dry fruits",
    "chemical free food online", "balaki organic pakistan", "100% pure food store",
];

export const Footer = memo(() => {
    const products = useProductStore(s => s.products);

    // Store { name, sku } so we can build clickable links
    const dynamicCategories = products
        .filter(p => p.stock > 0)
        .reduce((acc: { [cat: string]: { name: string; sku: string }[] }, p) => {
            const cat = p.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            if (acc[cat].length < 7 && !acc[cat].find(x => x.name === p.name)) {
                acc[cat].push({ name: p.name, sku: p.sku });
            }
            return acc;
        }, {});

    const categoryEntries = Object.entries(dynamicCategories).slice(0, 6);

    return (
        <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 mt-10 no-print">

            {/* ── SEO Content Section ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border-b border-gray-100 dark:border-gray-800 py-12 px-5 text-foreground"
            >
                <div className="max-w-7xl mx-auto">

                    {/* About Balaki Organic */}
                    <div className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-100 mb-4">
                            Balaki Organic — Pure & Certified Organic Products in Pakistan
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">100% Pure & Farm Direct</h3>
                                <p>
                                    Balaki Organic is Pakistan's premier online store for 100% pure organic food, raw honey, cold-pressed oils,
                                    natural spices, herbal teas, and chemical-free superfoods. Delivered fresh from organic farms directly to your doorstep.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">Chemical & Additive Free</h3>
                                <p>
                                    Every item at Balaki Organic is strictly tested to be 100% free from artificial chemicals, preservatives, and GMOs.
                                    We prioritize your family's health and wellness above all.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">Nationwide Express Delivery</h3>
                                <p>
                                    Enjoy fast nationwide delivery across Lahore, Karachi, Islamabad, and every city in Pakistan. Cash on Delivery (COD) available on all orders with 100% satisfaction guaranteed.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Top Categories */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-8 mb-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-5">Top Categories &amp; Available Products</h3>
                        {categoryEntries.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                                {categoryEntries.map(([catName, productNames]) => (
                                    <div key={catName}>
                                        <p className="text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-2 tracking-wide">{catName}</p>
                                        <ul className="space-y-1">
                                            {(productNames as { name: string; sku: string }[]).map(({ name, sku }) => (
                                                <li key={sku}>
                                                    <a
                                                        href={`#product/${sku}`}
                                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                                        className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-primary hover:underline transition-all cursor-pointer font-medium"
                                                    >
                                                        {name}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                        {[1, 2, 3, 4].map(j => <div key={j} className="h-2.5 w-28 bg-gray-50 dark:bg-gray-800/60 rounded animate-pulse" />)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Popular Searches */}
                    <div className="sr-only border-t border-gray-100 dark:border-gray-800 pt-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Popular Searches on Balaki Organic</h3>
                        <div className="flex flex-wrap gap-2">
                            {POPULAR_SEARCHES.map(term => (
                                <span
                                    key={term}
                                    className="px-3 py-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full hover:text-primary hover:border-primary/30 cursor-pointer transition-colors"
                                >
                                    {term}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Main Footer Links ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="py-12 px-5"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-16 mb-12">

                        {/* Brand */}
                        <div className="space-y-5">
                            <img
                                src="/logo.svg"
                                alt="Balaki Organic Logo — 100% Pure Organic Store"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="w-14 h-14 rounded-full object-cover shadow-xl border-2 border-primary/20 p-1 cursor-pointer hover:scale-110 transition-transform"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-medium">
                                Pakistan's premier 100% pure & certified organic store. Fast delivery, secure payments, and uncompromised quality — only at Balaki Organic.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-2 items-center">
                                <span className="text-[14px] font-black italic text-[#1A1F71] tracking-tighter hover:scale-110 transition-all cursor-pointer">VISA</span>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 hover:scale-110 transition-all cursor-pointer" />
                                <div className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-all group/p" title="JazzCash Available">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#f85606] shadow-[0_0_8px_rgba(248,86,6,0.6)]" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter italic text-gray-800 dark:text-gray-200">JazzCash</span>
                                </div>
                                <div className="flex items-center gap-1.5 cursor-pointer hover:scale-110 transition-all group/p" title="EasyPaisa Available">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#3bb54a] shadow-[0_0_8px_rgba(59,181,74,0.6)]" />
                                    <span className="text-[10px] font-black uppercase tracking-tighter italic text-gray-800 dark:text-gray-200">EasyPaisa</span>
                                </div>
                                <div className="flex items-center gap-1.5 cursor-help opacity-60 hover:opacity-100 transition-all" title="Cash on Delivery">
                                    <span className="text-[10px] font-black uppercase tracking-tighter italic">COD</span>
                                </div>
                            </div>
                        </div>

                        {/* Legal Links */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-600">Legal &amp; Policies</h4>
                            <div className="flex flex-col gap-3">
                                {['Privacy Policy', 'Returns & Refunds', 'Shipping Policy', 'Terms & Conditions'].map((text, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            window.location.hash = `#${text.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`;
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="text-left text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-primary transition-colors uppercase tracking-widest cursor-pointer hover:underline"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-600">Get in Touch</h4>
                            <div className="space-y-4">
                                <a
                                    href="https://www.google.com/maps/search/Lahore,+Pakistan"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-primary/30">
                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <address className="not-italic text-xs font-bold uppercase tracking-wider cursor-pointer">Lahore, Pakistan</address>
                                </a>
                                <a
                                    href="tel:+923014444980"
                                    className="flex items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-primary/30">
                                        <Phone className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider cursor-pointer font-mono">+92 301 4444980</span>
                                </a>
                                <a
                                    href="mailto:support@balakiorganic.com"
                                    className="flex items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-primary/30">
                                        <Mail className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold tracking-wider cursor-pointer">support@balakiorganic.com</span>
                                </a>
                            </div>
                        </div>

                        {/* Socials */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-600">Follow Balaki Organic</h4>
                            <div className="flex gap-3">
                                {[
                                    { Icon: Instagram, label: 'Instagram', href: 'https://instagram.com/balaki_organic' },
                                    { Icon: Twitter, label: 'Twitter', href: 'https://twitter.com/balakiorganic' },
                                    { Icon: Facebook, label: 'Facebook', href: 'https://facebook.com/balakiorganic' },
                                ].map(({ Icon, label, href }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="w-10 h-10 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm text-gray-500 dark:text-gray-400"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
                                Stay updated with the latest fresh harvests, new arrivals, and exclusive offers from Balaki Organic Pakistan.
                            </p>
                        </div>
                    </div>

                    {/* Copyright bar */}
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">
                            © {new Date().getFullYear()} Balaki Organic Store Pakistan. All Rights Reserved.
                        </p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">
                            100% Pure Organic Store | Fast Nationwide Delivery | Cash on Delivery | Balaki Organic
                        </p>
                    </div>
                </div>
            </motion.div>
        </footer>
    );
});
