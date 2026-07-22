import React from 'react';
import { motion } from 'framer-motion';
import { 
    Tag, Package, Shield, 
    ShoppingBag, Ticket, Store,
    Share2
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

interface SidebarProps {
    onNavigate: (hash: string) => void;
    activeHash: string;
}

export const LeftSidebar: React.FC<SidebarProps> = ({ onNavigate, activeHash }) => {
    const { user, role } = useAuthStore();

    const menuItems = [
        { id: 'sale', label: 'Flash Sale', icon: Tag, color: 'text-primary', bg: 'bg-primary/10' },
        { id: 'used', label: 'Used Items', icon: ShoppingBag, color: 'text-accent', bg: 'bg-accent/10' },
        { id: 'track-order', label: 'Track Order', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ];

    const professionalItems = [];
    if (role === 'admin') {
        professionalItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' });
    }

    const accountItems = [
        { id: 'profile', label: 'Store Profile', icon: Store, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { id: 'vouchers', label: 'Vouchers', icon: Ticket, color: 'text-green-500', bg: 'bg-green-500/10' },
    ];

    const renderItem = (item: any) => {
        const isActive = activeHash === `#${item.id}`;
        return (
            <button
                key={item.id}
                onClick={() => onNavigate(`#${item.id}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group ${
                    isActive 
                    ? `${item.bg} ${item.color} shadow-lg shadow-black/5` 
                    : 'hover:bg-foreground/5 text-foreground/60 hover:text-foreground'
                }`}
            >
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-white shadow-sm' : 'bg-foreground/5 group-hover:bg-white'}`}>
                    <item.icon className={`w-4 h-4 ${isActive ? item.color : 'opacity-50 group-hover:opacity-100'}`} />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
                    {item.label}
                </span>
                {isActive && (
                    <motion.div 
                        layoutId="active-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-current animate-pulse" 
                    />
                )}
            </button>
        );
    };

    return (
        <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh-100px)] sticky top-[80px] left-0 p-4 border-r border-white/10 overflow-y-auto no-scrollbar gap-8">
            <div className="space-y-2">
                <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Quick Navigation</p>
                <div className="space-y-1">
                    {menuItems.map(renderItem)}
                </div>
            </div>

            <div className="space-y-2">
                <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Professional Tools</p>
                <div className="space-y-1">
                    {professionalItems.map(renderItem)}
                    <button
                        onClick={() => onNavigate('#share')}
                        className="w-full flex items-center gap-3 p-4 bg-primary text-white rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 group"
                    >
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Share2 className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest">Share Store</span>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">Account</p>
                <div className="space-y-1">
                    {accountItems.map(renderItem)}
                </div>
            </div>

            <div className="mt-auto p-4 bg-foreground/5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[8px] opacity-40 uppercase tracking-widest font-bold">{role || 'Customer'}</p>
                    </div>
                </div>
                <button 
                    onClick={() => onNavigate('#profile')}
                    className="w-full py-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                    Manage Account
                </button>
            </div>
        </aside>
    );
};
