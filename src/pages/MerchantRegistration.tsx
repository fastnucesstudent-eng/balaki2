import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Building2, Tag, ChevronRight, ChevronLeft,
    Check, Loader2, Store, Eye, EyeOff, AlertCircle, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/useToastStore';
import { useCategories } from '../hooks/useCategories';

const STEPS = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
];

interface FormData {
    // Step 1
    fullName: string;
    email: string;
    password: string;
    contactNumber: string;
    // Step 2
    storeName: string;
    businessAddress: string;
    ntn: string;
    logoUrl: string;
    // Step 3
    selectedCategories: string[];
}

export const MerchantRegistration = ({ onBack }: { onBack: () => void }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const { categories } = useCategories();
    const toast = useToastStore();

    const [formData, setFormData] = useState<FormData>({
        fullName: '', email: '', password: '', contactNumber: '',
        storeName: '', businessAddress: '', ntn: '', logoUrl: '',
        selectedCategories: [],
    });

    const update = (field: keyof FormData, value: any) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const toggleCategory = (name: string) => {
        setFormData(prev => ({
            ...prev,
            selectedCategories: prev.selectedCategories.includes(name)
                ? prev.selectedCategories.filter(c => c !== name)
                : [...prev.selectedCategories, name]
        }));
    };

    const openLogoUpload = () => {
        if (!(window as any).cloudinary) {
            toast.show('Upload widget not ready, please try again.', 'error');
            return;
        }
        setUploadingLogo(true);
        (window as any).cloudinary.openUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                multiple: false,
                maxFiles: 1,
                cropping: true,
                croppingAspectRatio: 1,
                clientAllowedFormats: ['jpg', 'png', 'webp', 'jpeg'],
            },
            (err: any, result: any) => {
                setUploadingLogo(false);
                if (!err && result?.event === 'success') {
                    update('logoUrl', result.info.secure_url);
                }
            }
        );
    };

    // Generate slug from store name
    const generateSlug = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const validateStep = (): string => {
        if (step === 0) {
            if (!formData.fullName.trim()) return 'Full name is required.';
            if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) return 'A valid email is required.';
            if (formData.password.length < 8) return 'Password must be at least 8 characters.';
            if (!formData.contactNumber.trim()) return 'Contact number is required.';
        }
        if (step === 1) {
            if (!formData.storeName.trim()) return 'Store name is required.';
            if (!formData.businessAddress.trim()) return 'Business address is required.';
        }
        if (step === 2) {
            if (formData.selectedCategories.length === 0) return 'Please select at least one category.';
        }
        return '';
    };

    const handleNext = async () => {
        const err = validateStep();
        if (err) { setError(err); return; }
        setError('');

        if (step === 1) {
            setLoading(true);
            try {
                const slug = generateSlug(formData.storeName);
                const { data, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('store_slug', slug)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (data) {
                    setError('This store name is already taken. Please choose another one.');
                    setLoading(false);
                    return;
                }
            } catch (err: any) {
                console.error('Error checking store name:', err);
                setError('Failed to verify store name availability. Please try again.');
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        const err = validateStep();
        if (err) { setError(err); return; }
        setError('');
        setLoading(true);

        try {
            const slug = generateSlug(formData.storeName);

            // 1. Check if user already exists or needs signup
            let targetUserId = '';
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Session error:', sessionError);
            }

            if (session?.user) {
                targetUserId = session.user.id;
            } else {
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/#merchant`,
                        data: {
                            full_name: formData.fullName,
                            role: 'merchant',
                        }
                    }
                });

                if (signUpError) throw signUpError;
                if (!authData.user) throw new Error('Registration failed.');
                targetUserId = authData.user.id;
            }

            // 2. Upsert profile with all merchant data
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: targetUserId,
                    role: 'merchant',
                    full_name: formData.fullName,
                    email: formData.email,
                    contact_number: formData.contactNumber,
                    store_name: formData.storeName,
                    store_slug: slug,
                    business_address: formData.businessAddress,
                    ntn: formData.ntn || null,
                    logo_url: formData.logoUrl || null,
                    merchant_categories: formData.selectedCategories,
                    merchant_status: 'pending',
                });

            if (profileError) throw profileError;

            setSuccess(true);
        } catch (err: any) {
            console.error('Submit error:', err);
            const msg = err.message || '';
            if (msg.includes('aborted') || err.name === 'AbortError') {
                setError('Connection interrupted. Please click submit again.');
            } else {
                setError(msg || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-lg mx-auto space-y-8"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/10"
                    >
                        <Check className="w-12 h-12" />
                    </motion.div>
                    <div className="space-y-3">
                        <h1 className="text-4xl font-black tracking-tighter italic uppercase">Application Submitted!</h1>
                        <p className="opacity-50 font-medium leading-relaxed">
                            Your merchant account is under review. We'll notify you at <strong>{formData.email}</strong> once approved. This typically takes 24–48 hours.
                        </p>
                    </div>
                    <div className="glass p-6 rounded-3xl border border-foreground/10 text-left space-y-3">
                        <p className="text-xs font-black uppercase tracking-widest opacity-30">What happens next?</p>
                        {['Admin reviews your application', 'You receive an approval email', 'Your store goes live on the platform'].map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
                                <p className="text-sm font-medium">{s}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={onBack}
                        className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                    >
                        Back to Home
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10 md:mb-14">
                    <button onClick={onBack} className="p-2 hover:bg-foreground/5 rounded-full transition-colors flex-shrink-0">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic">Become a Merchant</h1>
                        <p className="text-xs md:text-sm opacity-40 font-medium mt-1">Set up your store on Tarzify in minutes</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* LEFT: Steps sidebar */}
                    <div className="lg:col-span-3">
                        <div className="glass rounded-3xl p-6 border border-foreground/5 lg:sticky lg:top-28">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-5">Progress</p>
                            <div className="flex flex-row lg:flex-col gap-3">
                                {STEPS.map((s, i) => {
                                    const Icon = s.icon;
                                    const done = i < step;
                                    const active = i === step;
                                    return (
                                        <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all flex-1 lg:flex-none ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : done ? 'bg-green-500/10 text-green-500' : 'opacity-30'}`}>
                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : done ? 'bg-green-500/20' : 'bg-foreground/10'}`}>
                                                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <div className="hidden sm:block lg:block">
                                                <p className="text-xs font-black uppercase tracking-wide">{s.label}</p>
                                                <p className="text-[10px] opacity-60">Step {i + 1} of {STEPS.length}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Info panel - Removed as per request */}
                        </div>
                    </div>

                    {/* RIGHT: Form */}
                    <div className="lg:col-span-9">
                        <div className="glass rounded-[2rem] p-6 md:p-10 border border-foreground/5 shadow-2xl">
                            <AnimatePresence mode="wait">
                                {/* ─── STEP 0: PERSONAL ─── */}
                                {step === 0 && (
                                    <motion.div key="step0" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="space-y-8">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tighter italic uppercase flex items-center gap-2"><User className="w-6 h-6 text-primary" /> Personal Details</h2>
                                            <p className="text-sm opacity-40 mt-1">Tell us about yourself</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <InputField label="Full Name" placeholder="Muhammad Ali" value={formData.fullName} onChange={v => update('fullName', v)} type="text" />
                                            <InputField label="Contact Number" placeholder="+92 300 1234567" value={formData.contactNumber} onChange={v => update('contactNumber', v)} type="tel" />
                                            <InputField label="Email Address" placeholder="you@example.com" value={formData.email} onChange={v => update('email', v)} type="email" className="sm:col-span-2" />
                                            <div className="sm:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Min. 8 characters"
                                                        value={formData.password}
                                                        onChange={e => update('password', e.target.value)}
                                                        className="w-full glass border border-foreground/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 ring-primary/30 pr-12"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ─── STEP 1: BUSINESS ─── */}
                                {step === 1 && (
                                    <motion.div key="step1" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="space-y-8">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tighter italic uppercase flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Business Details</h2>
                                            <p className="text-sm opacity-40 mt-1">Information about your store</p>
                                        </div>

                                        {/* Logo Upload */}
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 rounded-2xl bg-foreground/5 border-2 border-dashed border-foreground/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {formData.logoUrl ? (
                                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Store className="w-8 h-8 opacity-20" />
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-black text-sm">Store Logo</p>
                                                <p className="text-xs opacity-40">JPG, PNG or WebP. 1:1 ratio recommended.</p>
                                                <button onClick={openLogoUpload} disabled={uploadingLogo} className="flex items-center gap-2 px-4 py-2 glass border border-foreground/10 rounded-xl text-xs font-black hover:bg-foreground/5">
                                                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                    {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <InputField label="Store Name *" placeholder="My Awesome Store" value={formData.storeName} onChange={v => update('storeName', v)} type="text" />
                                            <InputField label="NTN / Tax ID (optional)" placeholder="1234567-8" value={formData.ntn} onChange={v => update('ntn', v)} type="text" />
                                            <InputField label="Business Address *" placeholder="Street, City, Province" value={formData.businessAddress} onChange={v => update('businessAddress', v)} type="text" className="sm:col-span-2" />
                                        </div>

                                        {formData.storeName && (
                                            <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-1">Your Store URL</p>
                                                <p className="text-sm font-black font-mono">tarzify.com/<span className="text-primary">store/{generateSlug(formData.storeName)}</span></p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}



                                {/* ─── STEP 2: CATEGORIES ─── */}
                                {step === 2 && (
                                    <motion.div key="step3" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="space-y-8">
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tighter italic uppercase flex items-center gap-2"><Tag className="w-6 h-6 text-primary" /> Product Categories</h2>
                                            <p className="text-sm opacity-40 mt-1">Select all categories you plan to sell in</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {categories.map(cat => {
                                                const selected = formData.selectedCategories.includes(cat.name);
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => toggleCategory(cat.name)}
                                                        className={`relative px-4 py-3 rounded-2xl text-sm font-black text-left transition-all border-2 ${selected ? 'bg-primary/10 border-primary text-primary' : 'glass border-foreground/10 opacity-60 hover:opacity-100'}`}
                                                    >
                                                        {selected && <Check className="w-3.5 h-3.5 absolute top-2.5 right-2.5" />}
                                                        {cat.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {formData.selectedCategories.length > 0 && (
                                            <p className="text-xs text-primary font-black">{formData.selectedCategories.length} categor{formData.selectedCategories.length === 1 ? 'y' : 'ies'} selected</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <p className="text-sm font-bold">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation */}
                            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-foreground/5">
                                {step > 0 && (
                                    <button
                                        onClick={() => { setStep(s => s - 1); setError(''); }}
                                        className="px-6 py-3.5 glass rounded-2xl font-black text-sm hover:bg-foreground/10 transition-all flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                                <button
                                    onClick={step === STEPS.length - 1 ? handleSubmit : handleNext}
                                    disabled={loading}
                                    className="flex-grow py-3.5 bg-primary text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : step === STEPS.length - 1 ? (
                                        <><Check className="w-5 h-5" /> Submit Application</>
                                    ) : (
                                        <>Continue to {STEPS[step + 1].label} <ChevronRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable input component
const InputField = ({
    label, placeholder, value, onChange, type = 'text', className = ''
}: {
    label: string; placeholder: string; value: string;
    onChange: (v: string) => void; type?: string; className?: string;
}) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{label}</label>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full glass border border-foreground/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 ring-primary/30 transition-shadow"
        />
    </div>
);

