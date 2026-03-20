import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';

export const AuthPage = ({ type = 'login', onClose }: { type?: 'login' | 'signup', onClose?: () => void }) => {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(type);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log(`🔐 Attempting ${mode}...`, { email });
            if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        emailRedirectTo: import.meta.env.VITE_SITE_URL || window.location.origin
                    }
                });
                if (error) {
                    console.error('❌ Signup error:', error);
                    throw error;
                }
                // Supabase returns a user with empty identities if the email already exists
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setError('An account with this email already exists. Please sign in instead.');
                    setMode('login');
                    return;
                }
                console.log('✅ Signup successful, verification email sent.');
                useToastStore.getState().show('Verification email sent! Check your inbox.', 'success');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    console.error('❌ Login error:', error);
                    throw error;
                }
                console.log('✅ Login successful:', data.user?.email);
                useToastStore.getState().show('Welcome back!', 'success');
            }
        } catch (err: any) {
            console.error('❌ Auth attempt failed:', err.message);
            setError(err.message || 'An unexpected error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}#reset-password`
            });
            if (error) throw error;
            useToastStore.getState().show('Password reset email sent! Check your inbox.', 'success');
            setMode('login');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass w-full max-w-md p-10 rounded-[2.5rem] border-white/10 shadow-2xl relative overflow-hidden"
            >
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-10 p-2 hover:bg-foreground/5 rounded-full transition-colors opacity-50 hover:opacity-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.png" alt="TARZIFY Logo" className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 shadow-2xl" />
                </div>

                <div className="text-center mb-10">
                    <h2 className="text-4xl font-black tracking-tighter mb-2 text-white">
                        {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                    </h2>
                    <p className="text-base font-medium text-white/70">
                        {mode === 'login' ? 'The premium shopping experience awaits.' : mode === 'signup' ? 'Join the All-in-One Store today.' : 'Enter your email to receive a reset link.'}
                    </p>
                </div>

                {/* Animated Segmented Control */}
                {mode !== 'forgot' && (
                    <div className="flex bg-white/5 backdrop-blur-md rounded-full p-1.5 mb-8 relative border border-white/10 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`relative flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-full transition-colors z-10 ${mode === 'login' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Sign In
                            {mode === 'login' && (
                                <motion.div
                                    layoutId="activeTabAuth"
                                    className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/30"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('signup')}
                            className={`relative flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-full transition-colors z-10 ${mode === 'signup' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                        >
                            Sign Up
                            {mode === 'signup' && (
                                <motion.div
                                    layoutId="activeTabAuth"
                                    className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/30"
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                            )}
                        </button>
                    </div>
                )}

                {mode === 'forgot' ? (
                    <form onSubmit={handleForgotPassword} className="space-y-6">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-opacity" />
                            <input
                                type="email"
                                id="resetEmail"
                                name="resetEmail"
                                placeholder="Enter your email address"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 ring-primary/50 transition-all outline-none text-white placeholder:text-white/40 font-medium"
                            />
                        </div>

                        {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

                        <button
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Send Reset Link
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(null); }}
                            className="w-full text-center text-sm text-white/50 hover:text-white font-bold transition-colors"
                        >
                            ← Back to Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleAuth} className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {mode === 'signup' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                                    className="relative group"
                                >
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-opacity" />
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        placeholder="Full Name"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 ring-primary/50 transition-all outline-none text-white placeholder:text-white/40 font-medium"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-opacity" />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Email Address"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 ring-primary/50 transition-all outline-none text-white placeholder:text-white/40 font-medium"
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-opacity" />
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 ring-primary/50 transition-all outline-none text-white placeholder:text-white/40 font-medium"
                            />
                        </div>

                        {mode === 'login' && (
                            <div className="text-right -mt-3">
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError(null); }}
                                    className="text-xs font-bold text-primary/80 hover:text-primary transition-colors hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

                        <button
                            disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    {mode === 'login' ? 'Sign In securely' : 'Create my account'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Merchant CTA */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-xs text-white/40 font-medium">
                        Want to sell on Tarzify?{' '}
                        <button
                            type="button"
                            onClick={() => { onClose?.(); window.location.hash = '#merchant-register'; }}
                            className="text-primary font-black hover:underline"
                        >
                            Apply as a Merchant →
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
