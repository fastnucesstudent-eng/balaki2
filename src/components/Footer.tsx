import { MapPin, Phone, Mail, Instagram, Twitter, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProductStore } from '../stores/useProductStore';
import { memo } from 'react';

const POPULAR_SEARCHES = [
    "buy online Pakistan", "tarzify online store", "online shopping Lahore", "online shopping Karachi",
    "cash on delivery Pakistan", "fast delivery Pakistan", "best prices online", "branded products Pakistan",
    "buy mobile phones online", "buy clothes online Pakistan", "buy shoes online", "buy electronics Pakistan",
    "men's clothing online", "women's fashion Pakistan", "tarzify ecommerce store", "discount shopping Pakistan",
    "buy watches online", "buy earbuds Pakistan", "buy laptops online Pakistan", "tarzify deals",
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

                    {/* About Tarzify */}
                    <div className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-100 mb-4">
                            How Tarzify Transformed Online Shopping in Pakistan
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">Pakistan's Favourite Ecommerce Store</h3>
                                <p>
                                    Tarzify is Pakistan's fastest-growing online ecommerce store, delivering premium products to customers
                                    across Lahore, Karachi, Islamabad, and every city in Pakistan. Whether you are looking for men's fashion,
                                    women's clothing, electronics, home decor, or beauty products — Tarzify has it all. Shop with confidence
                                    with our cash on delivery option, secure checkout, and fast nationwide shipping.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">Shop from Verified Merchants</h3>
                                <p>
                                    Every product listed on Tarzify comes from verified merchants and trusted sellers across Pakistan.
                                    We believe in quality-first online shopping, which is why every order is carefully reviewed before
                                    dispatch. Tarzify sellers offer the best prices on branded and unbranded products, making us your
                                    number one destination for online shopping in Pakistan with guaranteed authenticity.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-black text-gray-700 dark:text-gray-300 uppercase text-[11px] tracking-wide mb-2">Exclusive Offers &amp; Fast Delivery</h3>
                                <p>
                                    Tarzify offers exclusive discounts, seasonal sales, and daily deals across all categories. Our
                                    logistics network covers the entire country, ensuring your order arrives within 2–5 business days.
                                    With multiple payment methods including cash on delivery, EasyPaisa, and JazzCash, buying online
                                    at Tarzify has never been easier or more convenient for customers across all of Pakistan.
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

                    {/* Popular Searches (HIDDEN FROM UI, KEPT FOR SEO) */}
                    <div className="sr-only border-t border-gray-100 dark:border-gray-800 pt-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Popular Searches on Tarzify</h3>
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
                                src="/logo.png"
                                alt="Tarzify Logo — Online Shopping Pakistan"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="w-14 h-14 rounded-full object-cover shadow-xl border-2 border-primary/20 p-1 cursor-pointer hover:scale-110 transition-transform"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-medium">
                                Pakistan's premium ecommerce store. Fast delivery, secure payments, and quality products — only at Tarzify.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-2 items-center">
                                {/* Inline SVG for Visa Logo — Refined Proportions */}
                                <svg className="h-3.5 w-auto hover:scale-110 transition-all cursor-pointer" viewBox="0 0 444 141" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M129.537 0l-22.56 141h-34.912L51.527.185c-1.393-.556-3.483-1.485-6.613-1.485H0l.928 2.041c28.718 7.234 47.693 23.364 55.454 44.5 2.784 7.604 5.378 14.84 5.378 21.332 0 4.266-.372 8.718-.372 13.541H96.34L117.859 0h11.678zm102.343 61.64c0-21.703-30.053-22.815-29.867-32.46.185-3.153 3.153-6.492 9.274-7.42 2.968-.371 11.129-.741 20.589 3.525l3.71 1.854 3.339-20.774c-5.564-2.226-12.798-4.266-21.516-4.266-24.113 0-41.177 12.798-41.548 31.16-.371 23.928 33.387 25.411 33.2 37.097-.185 3.524-4.266 7.419-10.758 8.161-8.532.927-16.137-1.484-22.629-4.266l-3.339-1.669-3.71 22.073c6.863 3.153 16.51 5.564 26.524 5.564 25.596 0 42.661-12.798 42.661-31.531l0 .001zM288.75 0l-26.339 141h31.903l26.339-141H288.75zm123.532 0l-25.226 91.065-10.194-46.742c-2.411-12.242-8.347-16.137-18.734-16.508l-55.823-1.669c10.016 4.451 16.137 7.79 20.403 14.468 3.524 5.379 5.379 12.613 6.863 21.887l15.024 72.887 34.162.186L444 0h-31.718z" fill="#2563EB"/>
                                </svg>
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
                                    href="tel:+923094561786"
                                    className="flex items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-primary/30">
                                        <Phone className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider cursor-pointer font-mono">+92 309 456 1786</span>
                                </a>
                                <a
                                    href="mailto:support@tarzify.com"
                                    className="flex items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors group"
                                >
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 group-hover:border-primary/30">
                                        <Mail className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold tracking-wider cursor-pointer">support@tarzify.com</span>
                                </a>
                            </div>
                        </div>

                        {/* Socials */}
                        <div className="space-y-5">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 dark:text-gray-600">Follow Tarzify</h4>
                            <div className="flex gap-3">
                                {[
                                    { Icon: Instagram, label: 'Instagram', href: 'https://instagram.com/tarzifyofficial' },
                                    { Icon: Twitter, label: 'Twitter', href: 'https://twitter.com/tarzify' },
                                    { Icon: Facebook, label: 'Facebook', href: 'https://facebook.com/tarzify' },
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
                                Stay updated with the latest deals, new arrivals, and exclusive offers from Tarzify Pakistan.
                            </p>
                        </div>
                    </div>

                    {/* Copyright bar */}
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">
                            © {new Date().getFullYear()} Tarzify Ecommerce Store Pakistan. All Rights Reserved.
                        </p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">
                            Online Shopping Pakistan | Fast Delivery | Cash on Delivery | Tarzify
                        </p>
                    </div>
                </div>
            </motion.div>
        </footer>
    );
});
