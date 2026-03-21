import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, User as UserIcon, Search, Menu, LogOut, Shield, LayoutDashboard, X, ChevronRight, Package, Tag } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useCartStore } from '../stores/useCartStore';
import { useCartSync } from '../hooks/useCartSync';
import { useAuthStore } from '../stores/useAuthStore';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';

export const Navbar = memo(({
    onCartClick,
    onLoginClick,
    onSearch,
    onCategoryClick
}: {
    onCartClick: () => void,
    onLoginClick: () => void,
    onSearch: (q: string) => void,
    onCategoryClick?: (name: string) => void
}) => {
    const { categories } = useCategories();
    const { products } = useProducts();
    useCartSync(); // Initialize cart synchronization
    const cartItemsCount = useCartStore((state) => state.items.length);
    const { user, role, signOut } = useAuthStore();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Only show categories that have products
    const activeCategoryNames = new Set(products.map(p => p.category));
    const filteredCategories = categories.filter(c => activeCategoryNames.has(c.name));

    const handleSignOut = async () => {
        await signOut();
        setIsProfileOpen(false);
        setIsMenuOpen(false);
        window.location.hash = '';
    };

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 w-full z-50 px-2 sm:px-6 py-2 sm:py-4 transition-all duration-300 no-print ${isScrolled ? 'bg-background/80 backdrop-blur-xl border-b border-white/5 py-1 sm:py-2' : 'bg-transparent'}`}
        >
            <nav className="max-w-7xl mx-auto glass rounded-full px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-2xl border-white/10 gap-2">
                {/* Logo and Desktop Links */}
                <div className="flex items-center gap-8 min-w-0">
                    <div
                        onClick={() => { window.location.hash = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
                    >
                                <img
                                    src="/logo.png"
                                    alt="TARZIFY Logo"
                                    className="h-7 md:h-10 w-7 md:w-10 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform shadow-lg"
                                />
                                <span className="text-xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                                    TARZIFY
                                </span>
                            </div>
                            <div className="hidden lg:flex items-center gap-1 xl:gap-2 mr-auto">
                                {[
                                    { name: 'Home', href: '#', id: '' },
                                    { name: 'Featured Stores', href: '#merchants', id: 'merchants' },
                                    { name: 'Categories', href: '#categories', id: 'categories' },
                                    { name: 'Flash Sale', href: '#sale', id: 'sale', icon: 'zap' },
                                    { name: 'Used Items', href: '#used', id: 'used' },
                                    { name: 'Track Order', href: '#track-order', id: 'track-order' },
                                    { name: 'Profile', href: '#profile', id: 'profile' },
                                    ...(role === 'merchant' || role === 'admin' ? [{ name: 'Merchant', href: '#merchant', id: 'merchant' }] : []),
                                    ...(role === 'admin' ? [{ name: 'Admin', href: '#admin', id: 'admin' }] : [])
                                ].map((item) => {
                                    const isActive = (item.name === 'Home' && window.location.hash === '') || 
                                                   (window.location.hash === item.href);

                                    const handleClick = (e: React.MouseEvent) => {
                                        if (item.name === 'Home') {
                                            e.preventDefault();
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            window.location.hash = '';
                                            return;
                                        }

                                        // Toggle Logic
                                        if (window.location.hash === item.href) {
                                            e.preventDefault();
                                            window.location.hash = '';
                                            return;
                                        }

                                        const scrollTargets = ['merchants', 'categories', 'sale', 'used'];
                                        if (scrollTargets.includes(item.id)) {
                                            const targetId = (item.id === 'sale' || item.id === 'used') ? 'catalog' : item.id;
                                            const el = document.getElementById(targetId);
                                            if (el) {
                                                e.preventDefault();
                                                el.scrollIntoView({ behavior: 'smooth' });
                                                window.location.hash = item.href;
                                            }
                                        }
                                    };

                                    return (
                                        <a
                                            key={item.name}
                                            href={item.href}
                                            onClick={handleClick}
                                            className={`text-[11px] font-black uppercase tracking-tight xl:tracking-wide transition-all relative group whitespace-nowrap px-2 py-1 flex items-center gap-0.5 ${
                                                isActive ? 'text-primary' : 'text-foreground hover:text-primary'
                                            }`}
                                        >
                                            {item.icon === 'zap' && <span className="text-primary animate-pulse text-[12px]">⚡</span>}
                                            {item.name}
                                            <span className={`absolute -bottom-1 left-2 right-2 h-0.5 bg-primary transition-all ${
                                                isActive ? 'w-auto' : 'w-0 group-hover:w-auto'
                                            }`} />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Right Utilities */}
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            {/* Desktop Search Button */}
                            <button
                                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                                className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                                    isSearchExpanded ? 'bg-primary text-white scale-110 shadow-lg' : 'hover:bg-foreground/5 text-foreground/50 hover:text-primary'
                                }`}
                            >
                                {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </button>

                            {/* Mobile Search Icon */}
                            <button
                                onClick={() => setIsMobileSearchOpen(true)}
                                className="sm:hidden p-2 hover:bg-foreground/5 rounded-full transition-colors"
                            >
                                <Search className="w-5 h-5 opacity-50" />
                            </button>

                            <button onClick={onCartClick} className="relative p-2 hover:bg-foreground/5 rounded-full transition-colors group">
                                <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                {cartItemsCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-in zoom-in duration-300">
                                        {cartItemsCount}
                                    </span>
                                )}
                            </button>

                            <div className="h-6 w-px bg-foreground/10 mx-1 hidden sm:block" />

                            <ThemeToggle />

                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="p-1 rounded-full hover:bg-foreground/5 transition-all hover:scale-105"
                                    >
                                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-[12px] font-black border border-primary/20 text-primary shadow-sm hover:shadow-md transition-all">
                                            {user.email?.[0].toUpperCase()}
                                        </div>
                                    </button>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute right-0 mt-4 w-64 bg-background/95 backdrop-blur-3xl border border-white/20 rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                                            >
                                                <div className="p-4 border-b border-white/5 space-y-1 mb-2">
                                                    <p className="text-xs font-black uppercase tracking-widest opacity-30">Account</p>
                                                    <p className="font-black truncate">{user.email}</p>
                                                </div>

                                                <div className="space-y-1">
                                                    <button onClick={() => { setIsProfileOpen(false); window.location.hash = '#profile'; }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                        <UserIcon className="w-4 h-4 opacity-50" />
                                                        Account Settings
                                                    </button>

                                                    {(role === 'merchant' || role === 'admin') && (
                                                        <button onClick={() => { setIsProfileOpen(false); window.location.hash = '#merchant'; }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                            <LayoutDashboard className="w-4 h-4 opacity-50" />
                                                            Merchant Panel
                                                        </button>
                                                    )}

                                                    {role === 'admin' && (
                                                        <button onClick={() => { setIsProfileOpen(false); window.location.hash = '#admin'; }} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                            <Shield className="w-4 h-4 opacity-50" />
                                                            Admin Panel
                                                        </button>
                                                    )}

                                                    <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                        <LogOut className="w-4 h-4 opacity-50" />
                                                        Log Out
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button
                                onClick={onLoginClick}
                                className="p-2 rounded-full hover:bg-foreground/5"
                            >
                                <UserIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 hover:bg-foreground/5 rounded-full transition-colors">
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </nav>

                <AnimatePresence>
                    {isSearchExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -10 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -10 }}
                            className="max-w-7xl mx-auto px-4 sm:px-6 overflow-hidden mt-2 flex justify-end"
                        >
                            <div className="w-full sm:w-[350px] glass rounded-3xl p-2 bg-background/40 border-white/10 shadow-2xl backdrop-blur-2xl">
                                <div className="flex items-center bg-foreground/5 border border-foreground/10 rounded-2xl px-3 py-2 group/tray focus-within:ring-2 ring-primary/30 border-primary/50 transition-all">
                                    <Search className="w-4 h-4 opacity-30 group-focus-within/tray:text-primary group-focus-within/tray:opacity-100 transition-all" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search products..."
                                        onChange={(e) => onSearch(e.target.value)}
                                        className="bg-transparent border-none focus:outline-none text-xs px-3 w-full font-bold"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setIsSearchExpanded(false);
                                            if (e.key === 'Escape') setIsSearchExpanded(false);
                                        }}
                                    />
                                    <button 
                                        onClick={() => { onSearch(''); setIsSearchExpanded(false); }}
                                        className="p-1 hover:bg-foreground/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 opacity-50" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            <AnimatePresence>
                {isMobileSearchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-x-4 top-20 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col p-4 rounded-[2rem] border border-white/10 shadow-2xl"
                    >
                        <div className="w-full max-w-2xl flex flex-col gap-4">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-lg font-black italic tracking-tighter text-primary">SEARCH</span>
                                <button 
                                    onClick={() => { setIsMobileSearchOpen(false); onSearch(''); }}
                                    className="p-2 bg-foreground/5 rounded-full hover:bg-foreground/10 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search products..."
                                    onChange={(e) => onSearch(e.target.value)}
                                    className="w-full bg-foreground/5 border border-primary/20 rounded-xl py-3 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 ring-primary/20 transition-all placeholder:font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Quick Navigation</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {filteredCategories.slice(0, 4).map(cat => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => {
                                                setIsMobileSearchOpen(false);
                                                if (onCategoryClick) onCategoryClick(cat.name);
                                            }}
                                            className="px-4 py-2 bg-foreground/5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all shadow-sm"
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-2 text-center opacity-10 pointer-events-none">
                                <p className="text-xl font-black italic tracking-tighter uppercase">Tarzify</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Menu Content */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] md:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 h-[100dvh] w-72 bg-background border-r border-white/10 z-[70] md:hidden p-5 flex flex-col gap-5 shadow-2xl"
                        >
                            <div className="flex justify-between items-center shrink-0">
                                <span className="text-xl font-black italic tracking-tighter">MENU</span>
                                <button onClick={() => setIsMenuOpen(false)} className="p-1.5 glass rounded-full"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-10 no-scrollbar">
                                {/* Search at top for Mobile */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Search</p>
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-foreground/5 rounded-xl focus-within:ring-2 ring-primary/30 transition-all shadow-inner border border-white/5">
                                        <Search className="w-4 h-4 opacity-40 text-primary" />
                                        <input
                                            type="text"
                                            placeholder="Search items..."
                                            onChange={(e) => onSearch(e.target.value)}
                                            className="bg-transparent border-none focus:outline-none text-xs flex-grow font-bold placeholder:opacity-30"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Navigation</p>
                                    <div className="flex flex-col gap-1.5">
                                        {['Home', 'Shop'].map((item) => (
                                            <a
                                                key={item}
                                                href={item === 'Home' ? '#' : '#catalog'}
                                                onClick={() => setIsMenuOpen(false)}
                                                className="h-11 px-5 bg-foreground/5 rounded-xl flex items-center justify-between group hover:bg-primary/5 transition-all outline-none"
                                            >
                                                <span className="text-base font-black uppercase tracking-tighter italic group-hover:text-primary transition-colors">{item}</span>
                                                <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                            </a>
                                        ))}
                                        <a
                                            href="#sale"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="h-11 px-5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between group hover:bg-primary/20 transition-all outline-none"
                                        >
                                            <span className="text-base font-black uppercase tracking-tighter italic text-primary group-hover:scale-105 transition-transform">Flash Sale</span>
                                            <Tag className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                                        </a>
                                        <a
                                            href="#used"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="h-11 px-5 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between group hover:bg-accent/20 transition-all outline-none"
                                        >
                                            <span className="text-base font-black uppercase tracking-tighter italic text-accent group-hover:scale-105 transition-transform">Used Items</span>
                                            <ChevronRight className="w-4 h-4 text-accent" />
                                        </a>

                                        {!user && (
                                            <button
                                                onClick={() => { setIsMenuOpen(false); window.location.hash = '#merchant-register'; }}
                                                className="h-11 px-5 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between group hover:bg-accent/20 transition-all outline-none w-full"
                                            >
                                                <span className="text-base font-black uppercase tracking-tighter italic text-accent group-hover:scale-105 transition-transform">Sell on Tarzify</span>
                                                <ChevronRight className="w-4 h-4 text-accent" />
                                            </button>
                                        )}

                                        {/* Categories Collapsible */}
                                        <div className="space-y-1.5">
                                            <button
                                                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                                                className={`w-full h-11 px-5 rounded-xl flex items-center justify-between transition-all outline-none ${isCategoriesOpen ? 'bg-primary/10 text-primary' : 'bg-foreground/5 hover:bg-primary/5'}`}
                                            >
                                                <span className="text-base font-black uppercase tracking-tighter italic">Categories</span>
                                                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCategoriesOpen ? 'rotate-90 text-primary' : 'opacity-20'}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isCategoriesOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-foreground/[0.02] rounded-2xl border border-white/5"
                                                    >
                                                        <div className="p-1 grid grid-cols-1 gap-1 max-h-40 overflow-y-auto no-scrollbar">
                                                            {filteredCategories.length > 0 ? filteredCategories.map((cat) => (
                                                                <button
                                                                    key={cat.id}
                                                                    onClick={() => {
                                                                        setIsMenuOpen(false);
                                                                        if (onCategoryClick) onCategoryClick(cat.name);
                                                                        else window.location.hash = '#catalog';
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-primary/5 text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100 hover:text-primary transition-all flex items-center justify-between group"
                                                                >
                                                                    {cat.name}
                                                                    <div className="w-1 h-1 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform" />
                                                                </button>
                                                            )) : (
                                                                <p className="p-4 text-xs opacity-40 italic">No categories found...</p>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pb-8">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Account & Support</p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        <button onClick={() => { setIsMenuOpen(false); window.location.hash = '#track-order'; }} className="flex items-center gap-3 h-11 px-5 bg-foreground/5 rounded-xl hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest">
                                            <Package className="w-4 h-4 opacity-50" />
                                            Track Order
                                        </button>

                                        {user ? (
                                            <>
                                                {(role === 'merchant' || role === 'admin') && (
                                                    <button onClick={() => { setIsMenuOpen(false); window.location.hash = '#merchant'; }} className="flex items-center gap-3 h-11 px-5 bg-[#FFF8F5] text-[#FF4500] border border-orange-200 rounded-xl hover:scale-[1.01] transition-all text-[10px] font-black uppercase tracking-widest">
                                                        <LayoutDashboard className="w-4 h-4" />
                                                        Merchant Panel
                                                    </button>
                                                )}
                                                {role === 'admin' && (
                                                    <button onClick={() => { setIsMenuOpen(false); window.location.hash = '#admin'; }} className="flex items-center gap-3 h-11 px-5 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:scale-[1.01] transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                        <Shield className="w-4 h-4" />
                                                        Admin Dashboard
                                                    </button>
                                                )}
                                                <button onClick={() => { setIsMenuOpen(false); window.location.hash = '#profile'; }} className="flex items-center gap-3 h-11 px-5 bg-foreground/5 rounded-xl hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest">
                                                    <UserIcon className="w-4 h-4 opacity-50 text-foreground" />
                                                    My Account
                                                </button>
                                                <button onClick={handleSignOut} className="flex items-center gap-3 h-11 px-5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest text-left">
                                                    <LogOut className="w-4 h-4 opacity-50" />
                                                    Log Out
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => { setIsMenuOpen(false); onLoginClick(); }} className="mt-2 flex items-center gap-3 h-12 px-6 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all text-[10px] font-black uppercase tracking-widest justify-center">
                                                Sign In / Register
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5 space-y-6">
                                <div className="flex justify-center gap-6 opacity-30">
                                    <button className="text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">Instagram</button>
                                    <button className="text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">TikTok</button>
                                    <button className="text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors">Support</button>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-20 text-center">TARZIFY LUXURY &copy; 2026</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.header>
    );
});
