import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Upload, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { slugify } from '../lib/slugify';
import { useToastStore } from '../stores/useToastStore';
import { useCategories } from '../hooks/useCategories';

interface ProductFormProps {
    productId?: number;
    onClose?: () => void;
    onSuccess?: () => void;
}

export const ProductForm = ({ productId, onClose, onSuccess }: ProductFormProps) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { user } = useAuthStore();
    const { categories } = useCategories();
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        price: '',
        compare_at_price: '',
        category: '',
        stock: '',
        is_returnable: true,
        description: '', // Adding description which was missing from Admin form
        // New SEO and Universal Product fields
        seo_title: '',
        meta_description: '',
        slug: '',
        alt_text: '',
        tags: '',
        dynamic_attributes: {} as Record<string, string[]>,
        pricing_matrix: [] as any[],
        avg_rating: '0.0',
        total_reviews: '0',
        sale_percentage: '0',
        is_free_delivery: false
    });

    const widgetRef = useRef<any>(null);
    const toast = useToastStore(); // Added toast instance

    useEffect(() => {
        const initWidget = () => {
            if (!(window as any).cloudinary) return;

            widgetRef.current = (window as any).cloudinary.createUploadWidget(
                {
                    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                    sources: ['local', 'url', 'camera', 'facebook', 'instagram', 'google_drive', 'dropbox', 'image_search'],
                    multiple: true,
                    maxFiles: 5,
                    clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
                    styles: {
                        palette: {
                            window: "#111111",
                            windowBorder: "#222222",
                            tabIcon: "#f85606",
                            menuIcons: "#f85606",
                            textDark: "#FFFFFF",
                            textLight: "#CCCCCC",
                            link: "#f85606",
                            action: "#f85606",
                            inactiveTabIcon: "#666666",
                            error: "#F44235",
                            inProgress: "#f85606",
                            complete: "#20B832",
                            sourceBg: "#111111"
                        }
                    }
                },
                (error: any, result: any) => {
                    if (!error && result && result.event === "success") {
                        setImageUrls(prev => [...prev, result.info.secure_url]);
                        setUploading(false);
                    } else if (result.event === "display-changed") {
                        if (result.info === 'hidden') setUploading(false);
                    }
                }
            );
        };

        if ((window as any).cloudinary) {
            initWidget();
        } else {
            const script = document.createElement('script');
            script.src = "https://upload-widget.cloudinary.com/global/all.js";
            script.async = true;
            script.onload = initWidget;
            document.body.appendChild(script);
        }

        // Lock scroll on mount
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    // Auto-populate SEO based on Name, Category and SKU for uniqueness
    useEffect(() => {
        if (!formData.name && !formData.category) return;

        const baseSlug = slugify(formData.name);
        const uniqueSlug = formData.sku ? `${baseSlug}-${formData.sku.toLowerCase()}` : baseSlug;

        const autoTags = [
            formData.category,
            formData.name.split(' ')[0], // First word (often Brand/Type)
            'buy online',
            'pakistan'
        ].filter(Boolean).map(t => t.toLowerCase()).join(', ');

        const autoSeoTitle = formData.name ? `${formData.name} - Buy Online | Store` : '';
        const autoAltText = formData.name ? `Product image of ${formData.name}` : '';
        const autoMetaDesc = `Buy ${formData.name || 'this product'} online at the best price. Authentic ${formData.category || 'items'} with fast delivery.`;

        setFormData(prev => ({
            ...prev,
            slug: prev.slug || uniqueSlug,
            tags: prev.tags || autoTags,
            seo_title: prev.seo_title || autoSeoTitle,
            meta_description: prev.meta_description || autoMetaDesc,
            alt_text: prev.alt_text || autoAltText
        }));
    }, [formData.name, formData.category, formData.sku]);

    // Load existing product data when editing
    useEffect(() => {
        if (!productId) return;
        const loadProduct = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();
                if (error || !data) {
                    toast.show('Failed to load product data', 'error');
                    setLoading(false);
                    return;
                }
                setFormData({
                    name: data.name || '',
                    sku: data.sku || '',
                    price: String(data.price ?? ''),
                    compare_at_price: data.compare_at_price ? String(data.compare_at_price) : '',
                    category: data.category || '',
                    stock: String(data.stock ?? ''),
                    is_returnable: data.is_returnable ?? true,
                    description: data.description || '',
                    seo_title: data.seo_title || '',
                    meta_description: data.meta_description || '',
                    slug: data.slug || '',
                    alt_text: data.alt_text || '',
                    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
                    dynamic_attributes: data.dynamic_attributes || {},
                    pricing_matrix: data.pricing_matrix || [],
                    avg_rating: String(data.avg_rating ?? '0.0'),
                    total_reviews: String(data.total_reviews ?? '0'),
                    sale_percentage: String(data.sale_percentage ?? '0'),
                    is_free_delivery: data.is_free_delivery ?? false,
                });
                setImageUrls(data.image_urls || (data.image_url ? [data.image_url] : []));
            } catch (err: any) {
                toast.show('Error loading product: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        };
        loadProduct();
    }, [productId]);

    const handleUpload = () => {
        if (widgetRef.current) {
            widgetRef.current.open();
        } else {
            useToastStore.getState().show('Upload widget still loading...', 'error');
        }
    };

    const removeImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Helper to generate the cartesian product of all attributes to form the matrix
    const generatePricingMatrix = (attributes: Record<string, string[]>) => {
        const keys = Object.keys(attributes).filter(k => attributes[k].length > 0);
        if (keys.length === 0) return [];

        const combinations = keys.reduce((acc, key) => {
            const values = attributes[key];
            if (acc.length === 0) {
                return values.map(v => ({ [key]: v }));
            }
            const newAcc: any[] = [];
            acc.forEach(existing => {
                values.forEach(v => {
                    newAcc.push({ ...existing, [key]: v });
                });
            });
            return newAcc;
        }, [] as any[]);

        return combinations.map(combo => {
            // Try to preserve existing price/stock/image if this combo already existed
            const existingRow = formData.pricing_matrix.find(row => {
                return keys.every(k => row.variant_combo?.[k] === combo[k]);
            });

            return {
                variant_combo: combo,
                price: existingRow?.price || formData.price || '0',
                stock: existingRow?.stock || formData.stock || '0',
                image_url: existingRow?.image_url || null
            };
        });
    };

    const handleAddAttribute = (attrName: string) => {
        if (!attrName || formData.dynamic_attributes[attrName]) return;
        setFormData(prev => ({
            ...prev,
            dynamic_attributes: { ...prev.dynamic_attributes, [attrName]: [] }
        }));
    };

    const handleRemoveAttribute = (attrName: string) => {
        const newAttrs = { ...formData.dynamic_attributes };
        delete newAttrs[attrName];
        const newMatrix = generatePricingMatrix(newAttrs);
        const totalStock = newMatrix.reduce((sum, row) => sum + (parseInt(row.stock) || 0), 0).toString();

        setFormData(prev => ({
            ...prev,
            dynamic_attributes: newAttrs,
            pricing_matrix: newMatrix,
            stock: newMatrix.length > 0 ? totalStock : prev.stock
        }));
    };

    const handleAddOption = (attrName: string, optionValue: string) => {
        if (!optionValue || formData.dynamic_attributes[attrName].includes(optionValue)) return;
        const newAttrs = {
            ...formData.dynamic_attributes,
            [attrName]: [...formData.dynamic_attributes[attrName], optionValue]
        };
        setFormData(prev => ({
            ...prev,
            dynamic_attributes: newAttrs,
            pricing_matrix: generatePricingMatrix(newAttrs)
        }));
    };

    const handleRemoveOption = (attrName: string, optionIndex: number) => {
        const newAttrs = {
            ...formData.dynamic_attributes,
            [attrName]: formData.dynamic_attributes[attrName].filter((_, i) => i !== optionIndex)
        };
        const newMatrix = generatePricingMatrix(newAttrs);
        const totalStock = newMatrix.reduce((sum, row) => sum + (parseInt(row.stock) || 0), 0).toString();

        setFormData(prev => ({
            ...prev,
            dynamic_attributes: newAttrs,
            pricing_matrix: newMatrix,
            stock: newMatrix.length > 0 ? totalStock : prev.stock
        }));
    };

    const updateMatrixRow = (index: number, field: string, value: string) => {
        const newMatrix = [...formData.pricing_matrix];
        newMatrix[index] = { ...newMatrix[index], [field]: value };

        // Auto-calculate total stock if updating a stock field in matrix
        let totalStock = formData.stock;
        if (field === 'stock') {
            totalStock = newMatrix.reduce((sum, row) => sum + (parseInt(row.stock) || 0), 0).toString();
        }

        setFormData(prev => ({
            ...prev,
            pricing_matrix: newMatrix,
            stock: field === 'stock' ? totalStock : prev.stock
        }));
    };

    const handleUploadVariantImage = (index: number) => {
        if (!widgetRef.current) return;

        // Temporarily override the callback for variant image
        const variantWidget = (window as any).cloudinary.createUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                multiple: false,
                maxFiles: 1,
                clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
                styles: { /* same styles */ }
            },
            (error: any, result: any) => {
                if (!error && result && result.event === "success") {
                    updateMatrixRow(index, 'image_url', result.info.secure_url);
                }
            }
        );
        variantWidget.open();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (imageUrls.length === 0) {
                throw new Error('Please upload at least one product image');
            }

            if (!formData.sku.trim()) {
                throw new Error('SKU is required');
            }
            const updatedData = {
                merchant_id: user?.id,
                name: formData.name,
                sku: formData.sku.trim().toUpperCase(),
                price: parseFloat(formData.price),
                compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
                category: formData.category,
                stock: parseInt(formData.stock),
                image_url: imageUrls[0], // First image as main image
                image_urls: imageUrls,
                is_returnable: formData.is_returnable,
                description: formData.description,
                seo_title: formData.seo_title,
                meta_description: formData.meta_description,
                slug: formData.slug,
                alt_text: formData.alt_text,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                dynamic_attributes: formData.dynamic_attributes,
                pricing_matrix: formData.pricing_matrix,
                avg_rating: parseFloat(formData.avg_rating || '0'),
                total_reviews: parseInt(formData.total_reviews || '0'),
                sale_percentage: parseFloat(formData.sale_percentage || '0'),
                is_free_delivery: formData.is_free_delivery
            };

            let query;
            if (productId) {
                query = supabase.from('products').update(updatedData).eq('id', productId);
            } else {
                query = supabase.from('products').insert(updatedData);
            }

            const { error: submitError } = await query;
            if (submitError) throw submitError;

            toast.show(`Product ${productId ? 'updated' : 'added'} successfully!`, 'success');
            onSuccess?.();
            onClose?.();
        } catch (err) {
            useToastStore.getState().show('Error: ' + (err as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                data-lenis-prevent
                className="bg-background rounded-[2.5rem] w-full max-w-xl overflow-hidden border border-white/10 shadow-3xl max-h-[90vh] flex flex-col"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">{productId ? 'Edit Product' : 'Add New Product'}</h2>
                        <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1 text-primary">Merchant Portal</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all hover:scale-110 active:scale-90">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-grow">
                    <div className="space-y-6">
                        {/* Images Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Product Gallery</label>

                            <div className="grid grid-cols-4 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {imageUrls.map((url, index) => (
                                        <motion.div
                                            key={url}
                                            layout
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                            className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group"
                                        >
                                            <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            {index === 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[8px] font-black uppercase tracking-widest text-center py-1">
                                                    Main Image
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {imageUrls.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <div className="p-2 bg-foreground/5 rounded-xl group-hover:bg-primary/20 transition-colors">
                                            <Upload className="w-5 h-5 text-foreground/40 group-hover:text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">Upload</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Product Details</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-2"
                                    placeholder="Wireless Over-Ear Headphones"
                                />
                                {formData.name && (
                                    <p className="mt-2 text-[10px] font-black opacity-30 uppercase tracking-widest px-2">
                                        URL Slug: <span className="text-primary/60">{slugify(formData.name)}</span>
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">SKU ID</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-black mt-2"
                                        placeholder="TRZ-001"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Category</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-2 appearance-none"
                                    >
                                        <option value="">Choose...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Price</label>
                                        <div className="relative mt-2">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black opacity-30">Rs</span>
                                            <input
                                                required
                                                type="number"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 pl-10 outline-none focus:border-primary/50 transition-colors font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">MSRP</label>
                                        <div className="relative mt-2">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black opacity-30">Rs</span>
                                            <input
                                                type="number"
                                                value={formData.compare_at_price}
                                                onChange={e => setFormData({ ...formData, compare_at_price: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 pl-10 outline-none focus:border-primary/50 transition-colors font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Sale %</label>
                                        <input
                                            type="number"
                                            value={formData.sale_percentage}
                                            onChange={e => {
                                                const pct = parseFloat(e.target.value) || 0;
                                                const msrp = parseFloat(formData.compare_at_price) || parseFloat(formData.price) || 0;
                                                const newPrice = msrp > 0 ? (msrp * (1 - pct / 100)).toFixed(0) : formData.price;
                                                setFormData({ ...formData, sale_percentage: e.target.value, price: newPrice });
                                            }}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-2"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Stock</label>
                                        <input
                                            required
                                            type="number"
                                            value={formData.stock}
                                            onChange={e => setFormData({ ...formData, stock: e.target.value })}
                                            readOnly={formData.pricing_matrix.length > 0}
                                            className={`w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none transition-colors font-bold mt-2 ${formData.pricing_matrix.length > 0 ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary/50'}`}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${formData.is_returnable ? 'bg-primary' : 'bg-white/10'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, is_returnable: !prev.is_returnable }))}>
                                        <motion.div
                                            animate={{ x: formData.is_returnable ? 26 : 4 }}
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-xs font-black">Return Policy</p>
                                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">7-Day Returns</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                    <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${formData.is_free_delivery ? 'bg-green-500' : 'bg-white/10'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, is_free_delivery: !prev.is_free_delivery }))}>
                                        <motion.div
                                            animate={{ x: formData.is_free_delivery ? 26 : 4 }}
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-xs font-black">Free Delivery</p>
                                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Zero Shipping Fee</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Variants Configurator */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Variant Configuration</label>
                                {formData.category && (
                                    <span className="text-[10px] font-bold text-primary opacity-80 uppercase">
                                        Optimization: {formData.category === 'Electronics' ? 'RAM, Storage, Color' : formData.category === 'Fashion' ? 'Size, Color' : 'Custom'}
                                    </span>
                                )}
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6">
                                {/* Attribute Builder */}
                                <div className="space-y-4">
                                    {Object.entries(formData.dynamic_attributes).map(([attrName, options]) => (
                                        <div key={attrName} className="border border-white/10 rounded-xl p-4 space-y-4 bg-black/20">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-sm tracking-wide">{attrName}</h4>
                                                <button type="button" onClick={() => handleRemoveAttribute(attrName)} className="p-1 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {options.map((opt, i) => (
                                                    <div key={i} className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                                                        <span>{opt}</span>
                                                        <button type="button" onClick={() => handleRemoveOption(attrName, i)} className="opacity-50 hover:opacity-100 hover:text-red-400">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder={`Add ${attrName}...`}
                                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddOption(attrName, e.currentTarget.value.trim());
                                                                e.currentTarget.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            const input = (e.currentTarget as any).previousElementSibling as HTMLInputElement;
                                                            if (input.value.trim()) {
                                                                handleAddOption(attrName, input.value.trim());
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id="new-attr-input"
                                            placeholder="New Attribute (e.g. Color, Size, RAM)"
                                            className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 flex-grow"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById('new-attr-input') as HTMLInputElement;
                                                const val = input.value.trim();
                                                if (val) {
                                                    handleAddAttribute(val);
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add
                                        </button>
                                    </div>
                                </div>

                                {/* Pricing & Image Matrix */}
                                {formData.pricing_matrix.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Inventory Matrix</label>
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[10px] uppercase font-black opacity-50 bg-white/5">
                                                    <tr>
                                                        <th className="p-3 rounded-tl-lg">Variant</th>
                                                        <th className="p-3">Price (Rs)</th>
                                                        <th className="p-3">Pieces</th>
                                                        <th className="p-3 rounded-tr-lg">Image</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {formData.pricing_matrix.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-white/[0.02]">
                                                            <td className="p-3 font-semibold text-primary">
                                                                {Object.values(row.variant_combo).join(' / ')}
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    value={row.price}
                                                                    onChange={e => updateMatrixRow(idx, 'price', e.target.value)}
                                                                    className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-primary"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    value={row.stock}
                                                                    onChange={e => updateMatrixRow(idx, 'stock', e.target.value)}
                                                                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-primary"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                {row.image_url ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={row.image_url} alt="Variant" className="w-8 h-8 rounded-md object-cover border border-white/10" />
                                                                        <button type="button" onClick={() => updateMatrixRow(idx, 'image_url', '')} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUploadVariantImage(idx)}
                                                                        className="flex items-center gap-1 text-[10px] font-bold text-white/50 hover:text-primary transition-colors bg-white/5 px-2 py-1 rounded-md border border-white/10"
                                                                    >
                                                                        <Upload className="w-3 h-3" /> Upload
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search & Discovery (SEO) */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Search & Discovery (SEO)</label>

                        <div>
                            <label className="text-[10px] font-bold opacity-40 px-1">SEO Title</label>
                            <input
                                type="text"
                                value={formData.seo_title}
                                onChange={e => setFormData({ ...formData, seo_title: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-1"
                                placeholder="Auto-generated if left blank"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold opacity-40 px-1">Meta Description</label>
                            <textarea
                                value={formData.meta_description}
                                onChange={e => setFormData({ ...formData, meta_description: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors mt-1 resize-none h-24"
                                placeholder="Auto-generated if left blank"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold opacity-40 px-1">Search Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors mt-1 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold opacity-40 px-1">Image Alt Text</label>
                                <input
                                    type="text"
                                    value={formData.alt_text}
                                    onChange={e => setFormData({ ...formData, alt_text: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors mt-1 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Manual Rating Control */}
                    <div className="pt-4 border-t border-white/5 space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Manual Rating Control</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold opacity-40 px-1">Average Rating (1.0 - 5.0)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="5"
                                    value={formData.avg_rating}
                                    onChange={e => setFormData({ ...formData, avg_rating: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-1"
                                    placeholder="e.g. 4.8"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold opacity-40 px-1">Total Reviews Count</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.total_reviews}
                                    onChange={e => setFormData({ ...formData, total_reviews: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 outline-none focus:border-primary/50 transition-colors font-bold mt-1"
                                    placeholder="e.g. 124"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                            <span className="uppercase tracking-widest text-sm">Save Product Listing</span>
                        </button>
                    </div>
                </form>
            </motion.div >
        </motion.div >
    );
};
