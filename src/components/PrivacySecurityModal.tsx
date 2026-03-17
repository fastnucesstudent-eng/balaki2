import { motion } from 'framer-motion';
import { X, Lock, Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

export const PrivacySecurityModal = ({ onClose }: { onClose: () => void }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            // Use Server-Side Endpoint to bypass client auth issues
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("No active session found.");

            const API_URL = import.meta.env.VITE_API_URL || 'https://backend.tarzify.com/api';
            const response = await fetch(`${API_URL}/update-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Update failed");

            // Success - No error to throw

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: any) {
            console.error('Password Update Error:', err);
            setMessage({ type: 'error', text: err.message || "Failed to update password." });
            // Alert for user visibility
            useToastStore.getState().show(`Update Failed: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-background w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -mr-16 -mt-16" />

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-foreground/5 z-50 cursor-pointer"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Security Center</h2>
                    <p className="opacity-60 text-sm font-medium">Protect your premium account.</p>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50">Update Password</h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Layer</span>
                        </div>

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {message.text}
                            </motion.div>
                        )}

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">New Password</label>
                                <div className="flex items-center gap-3 bg-foreground/5 p-4 rounded-2xl focus-within:ring-2 ring-primary/30 transition-all">
                                    <Key className="w-5 h-5 opacity-30" />
                                    <input
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm font-bold w-full"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Confirm Password</label>
                                <div className="flex items-center gap-3 bg-foreground/5 p-4 rounded-2xl focus-within:ring-2 ring-primary/30 transition-all">
                                    <Key className="w-5 h-5 opacity-30" />
                                    <input
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm font-bold w-full"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Processing...' : 'Secure Account'}
                            </button>
                        </form>
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50">Data & Privacy</h3>
                        <div className="p-4 bg-foreground/5 rounded-2xl space-y-2">
                            <p className="text-[10px] font-bold opacity-60">To request account deletion or data portability, please contact our support team at <span className="text-primary italic">customersupport@tarzify.com</span></p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
