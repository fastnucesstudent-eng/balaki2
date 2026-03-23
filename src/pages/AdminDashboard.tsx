import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ShoppingBag, Package, Users, Bell, Settings, ArrowUpRight, Search, Plus, Save, Loader2, Menu, X, Trash2, Eye, Upload, Edit2, Image as ImageIcon, Store, Check, Ban } from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';
import { useProducts } from '../hooks/useProducts';
import { supabase } from '../lib/supabase';
import { useAdminStats } from '../hooks/useAdminStats';
import { ProductForm } from '../components/ProductForm';
import { useToastStore } from '../stores/useToastStore';
import { useCategories } from '../hooks/useCategories';

export const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const { products, loading: productsLoading, refetch } = useProducts(true);
    const { stats, loading: statsLoading, refetch: refetchStats } = useAdminStats();
    const { categories, addCategory, updateCategory, deleteCategory, loading: categoriesLoading } = useCategories();

    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [localStock, setLocalStock] = useState<Record<number, number>>({});
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryImage, setNewCategoryImage] = useState('');
    const [uploadingCategory, setUploadingCategory] = useState(false);
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [tempName, setTempName] = useState('');

    // Data States
    const [orders, setOrders] = useState([] as any[]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [carts, setCarts] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedOrderToView, setSelectedOrderToView] = useState<any | null>(null);
    const [articleToDelete, setArticleToDelete] = useState<number | null>(null);
    const [merchants, setMerchants] = useState<any[]>([]);
    const [merchantLoading, setMerchantLoading] = useState(false);

    // Banners State
    const [banners, setBanners] = useState<any[]>([]);
    const [newBanner, setNewBanner] = useState({
        image_url: '',
        link_url: '',
        start_at: new Date().toISOString().slice(0, 16),
        end_at: '',
        slide_duration: 5000,
        display_order: 0
    });

    // Articles State
    const [articles, setArticles] = useState<any[]>([]);
    const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [newArticle, setNewArticle] = useState({
        title: '',
        excerpt: '',
        content: '',
        image_url: '',
        status: 'published' as 'draft' | 'published'
    });

    // Vouchers State
    const [allVouchers, setAllVouchers] = useState<any[]>([]);
    const [selectedVoucherStats, setSelectedVoucherStats] = useState<any[]>([]);
    const [showVoucherForm, setShowVoucherForm] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Fetch Notifications (Pending Actions)
    const fetchNotifications = async () => {
        try {
            const { data: merchants } = await supabase.from('profiles').select('id, full_name, store_name, created_at').eq('role', 'merchant').eq('merchant_status', 'pending');
            const { data: banners } = await supabase.from('banners').select('id, image_url, created_at').eq('status', 'pending');

            const mDocs = (merchants || []).map(m => ({
                id: m.id,
                type: 'merchant',
                title: 'New Merchant',
                message: `${m.full_name} registered ${m.store_name}`,
                date: m.created_at,
                targetTab: 'merchants'
            }));

            const bDocs = (banners || []).map(b => ({
                id: b.id,
                type: 'banner',
                title: 'Banner Request',
                message: 'New banner awaiting approval',
                image: b.image_url,
                date: b.created_at,
                targetTab: 'banners'
            }));

            setNotifications([...mDocs, ...bDocs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (err) { console.error('Notification fetch error:', err); }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Polling every 60s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const isAnyModalOpen = showVoucherForm || showMobileMenu || editingProductId !== null || selectedOrderToView !== null || articleToDelete !== null;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showVoucherForm, showMobileMenu, editingProductId, selectedOrderToView, articleToDelete]);
    const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
    const [deletingVoucherId, setDeletingVoucherId] = useState<string | number | null>(null);
    const [newVoucher, setNewVoucher] = useState({
        code: '',
        type: 'percentage' as 'percentage' | 'fixed',
        value: 0,
        min_spend: 0,
        expiry_date: '',
        usage_limit: '' as any,
        target_customer_id: null as string | null,
        max_discount: '' as any,
        per_user_limit: 1
    });

    useEffect(() => {
        const initialStock: Record<number, number> = {};
        products.forEach(p => initialStock[p.id] = p.stock);
        setLocalStock(initialStock);
    }, [products]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://upload-widget.cloudinary.com/global/all.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const openUploadWidget = (callback: (url: string) => void) => {
        if (!(window as any).cloudinary) {
            useToastStore.getState().show('Upload widget not loaded', 'error');
            return;
        }

        (window as any).cloudinary.openUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                multiple: false,
                maxFiles: 1,
                clientAllowedFormats: ["jpg", "png", "webp", "jpeg"],
            },
            (error: any, result: any) => {
                if (!error && result && result.event === "success") {
                    callback(result.info.secure_url);
                }
            }
        );
    };

    const handleUploadClick = (categoryToEdit?: any) => {
        setUploadingCategory(true);
        openUploadWidget((url) => {
            if (categoryToEdit) {
                handleUpdateCategoryImage(categoryToEdit.id, url);
            } else {
                setNewCategoryImage(url);
            }
            setUploadingCategory(false);
        });
    };

    // Fetch Orders/Customers/Carts on tab change
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            if (activeTab === 'orders') {
                const { data } = await supabase
                    .from('orders')
                    .select('*, customer:profiles!user_id(id, full_name, email), order_items(*, products(*))')
                    .order('created_at', { ascending: false });
                if (data) {
                    const mapped = data.map((order: any) => ({ ...order, profiles: order.customer }));
                    setOrders(mapped);
                }
            }
            if (activeTab === 'customers') {
                const { data } = await supabase.from('profiles').select('*').eq('role', 'customer');
                if (data) setCustomers(data);
            }
            if (activeTab === 'carts') {
                // Fetch all cart items joined with products and profiles
                const { data } = await supabase
                    .from('cart_items')
                    .select('*, products(*), user:profiles!user_id(id, full_name, email)')
                    .order('created_at', { ascending: false });

                if (data) {
                    // Group by user
                    const grouped = data.reduce((acc: any, item: any) => {
                        const userId = item.user_id;
                        const itemTimestamp = item.updated_at || item.created_at;

                        if (!acc[userId]) {
                            acc[userId] = {
                                user: item.user,
                                items: [],
                                total: 0,
                                last_updated: itemTimestamp
                            };
                        } else if (new Date(itemTimestamp) > new Date(acc[userId].last_updated)) {
                            // Keep the latest timestamp
                            acc[userId].last_updated = itemTimestamp;
                        }

                        acc[userId].items.push(item);
                        acc[userId].total += item.products.price * item.quantity;
                        return acc;
                    }, {});
                    setCarts(Object.values(grouped));
                }
            }
            if (activeTab === 'banners') {
                const { data, error } = await supabase
                    .from('banners')
                    .select('*, merchant:profiles!merchant_id(email, full_name)')
                    .order('display_order', { ascending: true });
                if (error) {
                    if (error.code === '42P01') {
                        console.warn('Banners table missing in AdminDashboard');
                    } else {
                        useToastStore.getState().show(error.message, 'error');
                    }
                    setDataLoading(false);
                    return;
                }
                if (data) setBanners(data);
            }
            if (activeTab === 'articles') {
                const { data, error: _error } = await supabase
                    .from('articles')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (_error) {
                    if (_error.code === '42P01') {
                        console.warn('Articles table missing');
                    } else {
                        useToastStore.getState().show(_error.message, 'error');
                    }
                    setDataLoading(false);
                    return;
                }
                if (data) setArticles(data);
            }
            if (activeTab === 'vouchers') {
                const { data, error: _errorV } = await supabase
                    .from('vouchers')
                    .select('*, merchant:profiles!merchant_id(email, full_name)')
                    .order('created_at', { ascending: false });
                if (data) setAllVouchers(data);
                if (_errorV) console.error(_errorV);
            }
            if (activeTab === 'merchants') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'merchant')
                    .order('created_at', { ascending: false });
                if (data) setMerchants(data);
                if (error) useToastStore.getState().show(error.message, 'error');
            }
            setDataLoading(false);
        };
        const tabsRequiringData = ['orders', 'customers', 'carts', 'banners', 'articles', 'vouchers', 'merchants'];
        if (tabsRequiringData.includes(activeTab)) fetchData();
    }, [activeTab]);

    const handleUpdateStock = async (id: number) => {
        setUpdatingId(id);
        try {
            const { error } = await supabase
                .from('products')
                .update({ stock: localStock[id] })
                .eq('id', id);

            if (error) throw error;
            useToastStore.getState().show('Stock updated successfully', 'success');
            await refetch();
        } catch (err: any) {
            console.error('Error updating stock:', err);
            useToastStore.getState().show('Update failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            useToastStore.getState().show('Product deleted successfully', 'success');
            await refetch();
            await refetchStats();
        } catch (err: any) {
            useToastStore.getState().show('Failed to delete product: ' + err.message, 'error');
        }
    };

    const handleUpdateMerchantStatus = async (merchantId: string, status: 'approved' | 'rejected' | 'paused' | 'active', storeSlug?: string) => {
        const finalStatus = status === 'active' ? 'approved' : status;
        setMerchantLoading(true);
        try {
            // 1. Update status in Supabase
            const { error } = await supabase
                .from('profiles')
                .update({ merchant_status: finalStatus })
                .eq('id', merchantId);

            if (error) throw error;
            useToastStore.getState().show(`Merchant ${finalStatus} successfully`, 'success');
            
            // 2. If approved, trigger QR generation (Phase 4)
            if (finalStatus === 'approved' && storeSlug) {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/merchants/generate-qr`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ merchantId, storeSlug })
                    });
                    if (res.ok) {
                        useToastStore.getState().show('Store QR Code generated!', 'success');
                    }
                } catch (qrErr) {
                    console.error('QR Generation failed:', qrErr);
                    // Don't fail the whole status update if just QR fails, but notify
                    useToastStore.getState().show('Merchant approved, but QR generation failed.', 'error');
                }
            }

            // 3. Re-fetch merchants
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'merchant')
                .order('created_at', { ascending: false });
            if (data) setMerchants(data);
        } catch (err: any) {
            useToastStore.getState().show('Failed to update status: ' + err.message, 'error');
        } finally {
            setMerchantLoading(false);
        }
    };

    const handleSeed = async () => {
        const VITE_API_URL = import.meta.env.VITE_API_URL || '';

        setDataLoading(true);
        useToastStore.getState().show('Seeding demo products...', 'success');
        try {
            const res = await fetch(`${VITE_API_URL}/setup/seed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server responded with ${res.status}: ${text.slice(0, 100)}`);
            }

            const data = await res.json();
            if (data.success) {
                useToastStore.getState().show('Seed complete: ' + data.message, 'success');
                await refetch();
                await refetchStats();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err: any) {
            console.error('Seed Error:', err);
            useToastStore.getState().show('Seed failed: ' + err.message, 'error');
        } finally {
            setDataLoading(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        await addCategory(newCategoryName.trim(), newCategoryImage);
        setNewCategoryName('');
        setNewCategoryImage('');
    };

    const handleUpdateCategoryImage = async (id: number, url: string) => {
        await updateCategory(id, { image_url: url });
    };

    const handleRenameCategory = async (id: number) => {
        if (!tempName.trim()) return;
        await updateCategory(id, { name: tempName.trim() });
        setRenamingId(null);
    };

    const handleDeleteCategory = async (id: number, _name: string) => {
        await deleteCategory(id);
    };

    const handleAddBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBanner.image_url) return;

        setDataLoading(true);
        try {
            const { error: insertError } = await supabase
                .from('banners')
                .insert({
                    ...newBanner,
                    end_at: newBanner.end_at || null,
                    link_url: newBanner.link_url || null,
                    status: 'approved' // Admin added banners are active immediately
                });
            if (insertError) throw insertError;
            useToastStore.getState().show('Banner added!', 'success');
            setNewBanner({
                image_url: '',
                link_url: '',
                start_at: new Date().toISOString().slice(0, 16),
                end_at: '',
                slide_duration: 5000,
                display_order: 0
            });
            // Refetch
            const { data } = await supabase.from('banners').select('*, merchant:profiles!merchant_id(email, full_name)').order('display_order', { ascending: true });
            if (data) setBanners(data);
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setDataLoading(false);
        }
    };

    const handleDeleteBanner = async (id: number) => {
        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;
            setBanners(prev => prev.filter(b => b.id !== id));
            useToastStore.getState().show('Banner removed', 'success');
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        }
    };

    const handleSaveArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🚀 Saving article...', newArticle);

        if (!newArticle.title) {
            useToastStore.getState().show('Title is required', 'error');
            return;
        }

        setIsPublishing(true);
        try {
            if (editingArticleId) {
                // Update
                const { data, error } = await supabase
                    .from('articles')
                    .update({
                        title: newArticle.title,
                        excerpt: newArticle.excerpt,
                        content: newArticle.content,
                        image_url: newArticle.image_url,
                        status: newArticle.status
                    })
                    .eq('id', editingArticleId)
                    .select()
                    .single();

                if (error) throw error;
                setArticles(prev => prev.map(a => a.id === editingArticleId ? data : a));
                useToastStore.getState().show('Article updated!', 'success');
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('articles')
                    .insert([{
                        title: newArticle.title,
                        excerpt: newArticle.excerpt,
                        content: newArticle.content,
                        image_url: newArticle.image_url,
                        status: newArticle.status
                    }])
                    .select()
                    .single();

                if (error) throw error;
                if (data) setArticles(prev => [data, ...prev]);
                useToastStore.getState().show('Article published!', 'success');
            }

            setNewArticle({
                title: '',
                excerpt: '',
                content: '',
                image_url: '',
                status: 'published'
            });
            setEditingArticleId(null);
        } catch (err: any) {
            console.error('❌ Article save failed:', err);
            useToastStore.getState().show(err.message || 'Failed to save article', 'error');
        } finally {
            setIsPublishing(false);
        }
    };

    const startEditingArticle = (article: any) => {
        setEditingArticleId(article.id);
        setNewArticle({
            title: article.title,
            excerpt: article.excerpt || '',
            content: article.content || '',
            image_url: article.image_url || '',
            status: article.status
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditingArticle = () => {
        setEditingArticleId(null);
        setNewArticle({
            title: '',
            excerpt: '',
            content: '',
            image_url: '',
            status: 'published'
        });
    };

    const handleDeleteArticle = async (id: number) => {
        try {
            const { error } = await supabase.from('articles').delete().eq('id', id);
            if (error) throw error;
            setArticles(prev => prev.filter(a => a.id !== id));
            useToastStore.getState().show('Article deleted', 'success');
            setArticleToDelete(null);
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        }
    };

    const handleUpdateBannerOrder = async (id: number, order: number) => {
        setUpdatingId(id);
        try {
            const { error } = await supabase
                .from('banners')
                .update({ display_order: order })
                .eq('id', id);

            if (error) throw error;
            useToastStore.getState().show('Order updated', 'success');
            setBanners(prev => prev.map(b => b.id === id ? { ...b, display_order: order } : b).sort((a, b) => a.display_order - b.display_order));
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const fetchVoucherStats = async (voucherId: string) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/stats/${voucherId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedVoucherStats(data.usage);
            }
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const handleCreateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        setDataLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newVoucher,
                    merchant_id: null, // Admin created global voucher
                    usage_limit: newVoucher.usage_limit ? parseInt(newVoucher.usage_limit) : null,
                    max_discount: newVoucher.max_discount ? parseFloat(newVoucher.max_discount) : null
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Server returned HTML instead of JSON' }));
                throw new Error(errorData.error || `Error ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                useToastStore.getState().show('Global Voucher Created!', 'success');
                setShowVoucherForm(false);
                setNewVoucher({
                    code: '',
                    type: 'percentage',
                    value: 0,
                    min_spend: 0,
                    expiry_date: '',
                    usage_limit: '',
                    target_customer_id: null,
                    max_discount: '',
                    per_user_limit: 1
                });
                // Refetch
                const { data: vData } = await supabase.from('vouchers').select('*, merchant:profiles!merchant_id(email, full_name)').order('created_at', { ascending: false });
                if (vData) setAllVouchers(vData);
            }
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setDataLoading(false);
        }
    };

    const handleUpdateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVoucherId) return;
        setDataLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/${editingVoucherId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newVoucher,
                    usage_limit: newVoucher.usage_limit ? parseInt(newVoucher.usage_limit) : null,
                    max_discount: newVoucher.max_discount ? parseFloat(newVoucher.max_discount) : null
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Server returned HTML instead of JSON' }));
                throw new Error(errorData.error || `Update failed with status ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                useToastStore.getState().show('Voucher Updated!', 'success');
                setShowVoucherForm(false);
                setEditingVoucherId(null);
                setNewVoucher({
                    code: '', type: 'percentage', value: 0, min_spend: 0, expiry_date: '',
                    usage_limit: '', target_customer_id: null, max_discount: '', per_user_limit: 1
                });
                const { data: vData } = await supabase.from('vouchers').select('*, merchant:profiles!merchant_id(email, full_name)').order('created_at', { ascending: false });
                if (vData) setAllVouchers(vData);
            }
        } catch (err: any) {
            console.error('Update Error:', err);
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setDataLoading(false);
        }
    };

    const handleDeleteVoucher = async (id: string | number) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                useToastStore.getState().show('Voucher deleted', 'success');
                setAllVouchers(prev => prev.filter(v => v.id !== id));
                setDeletingVoucherId(null); // Reset deleting state
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Delete failed' }));
                throw new Error(errorData.error || 'Failed to delete');
            }
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        }
    };

    const handleToggleVoucher = async (v: any) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/${v.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !v.is_active })
            });
            if (res.ok) {
                setAllVouchers(prev => prev.map(item => item.id === v.id ? { ...item, is_active: !v.is_active } : item));
                useToastStore.getState().show(`Voucher ${v.is_active ? 'deactivated' : 'activated'}`, 'success');
            }
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex pt-4 text-foreground">
            {/* Sidebar Backdrop */}
            <AnimatePresence>
                {showMobileMenu && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMobileMenu(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className={`fixed lg:sticky lg:top-20 inset-y-0 left-0 z-[110] w-64 border-r border-foreground/5 p-6 flex flex-col gap-2 bg-background/80 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 h-screen lg:h-[calc(100vh-80px)] ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-8 lg:mb-4 px-4">
                    <h3 className="text-xs font-black uppercase tracking-widest opacity-30">Menu</h3>
                    <button onClick={() => setShowMobileMenu(false)} className="lg:hidden p-2 hover:bg-foreground/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'inventory', label: 'Inventory', icon: Package },
                    { id: 'categories', label: 'Categories', icon: Menu },
                    { id: 'orders', label: 'Orders', icon: ShoppingBag },
                    { id: 'customers', label: 'Customers', icon: Users },
                    { id: 'merchants', label: 'Merchants', icon: Store },
                    { id: 'carts', label: 'Customer Carts', icon: ShoppingBag },
                    { id: 'banners', label: 'Banners', icon: ImageIcon },
                    { id: 'vouchers', label: 'Vouchers', icon: Bell },
                    { id: 'articles', label: 'Articles', icon: Edit2 },
                    { id: 'settings', label: 'Account', icon: Settings }
                ].map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }} className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-primary text-white shadow-lg' : 'hover:bg-foreground/5 opacity-60'}`}>
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-grow p-4 md:p-10 overflow-y-auto w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button onClick={() => setShowMobileMenu(true)} className="lg:hidden p-3 glass rounded-xl">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-1 md:mb-2 italic uppercase">Admin Dashboard</h1>
                            <p className="text-[10px] sm:text-sm opacity-50 font-medium">Store operations and metrics.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 ml-auto sm:ml-0 relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-3 glass rounded-full hover:scale-110 transition-transform relative"
                        >
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-[10px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] text-white ring-2 ring-background">
                                    {notifications.length}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-4 w-80 glass border border-white/10 rounded-[2rem] shadow-2xl z-[200] overflow-hidden"
                                >
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                                        <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-primary" /> Notifications
                                        </h3>
                                        <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase">{notifications.length} New</span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto p-2">
                                        {notifications.length === 0 ? (
                                            <div className="py-12 text-center opacity-30">
                                                <Bell className="w-8 h-8 mx-auto mb-2" />
                                                <p className="text-xs font-black uppercase tracking-tighter italic">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <button 
                                                    key={`${n.type}-${n.id}`}
                                                    onClick={() => { setActiveTab(n.targetTab); setShowNotifications(false); }}
                                                    className="w-full p-4 hover:bg-white/5 rounded-2xl transition-all text-left flex gap-3 group border border-transparent hover:border-white/5"
                                                >
                                                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${n.type === 'merchant' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                                                        {n.type === 'merchant' ? <Store className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-xs font-black uppercase tracking-tight italic group-hover:text-primary transition-colors">{n.title}</p>
                                                        <p className="text-xs opacity-60 font-medium truncate mt-0.5">{n.message}</p>
                                                        <p className="text-[10px] opacity-30 mt-1 font-bold">{new Date(n.date).toLocaleDateString()}</p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button className="p-3 glass rounded-full hover:scale-110 transition-transform">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Sales', value: `Rs. ${stats.totalRevenue.toLocaleString()}`, trend: 'Live', color: 'text-primary' },
                                { label: 'Total Orders', value: stats.totalOrders.toString(), trend: 'Live', color: 'text-accent' },
                                { label: 'Active Customers', value: stats.totalCustomers.toString(), trend: 'Live', color: 'text-foreground' },
                                { label: 'Active Products', value: stats.activeProducts.toString(), trend: 'Live', color: 'text-primary' },
                            ].map((metric, i) => (
                                <div key={i} className="glass p-6 rounded-[2rem] border-white/5 shadow-xl">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-30 mb-4">{metric.label}</p>
                                    <div className="flex items-end justify-between">
                                        <h4 className="text-2xl font-black">{statsLoading ? '...' : metric.value}</h4>
                                        <span className={`text-xs font-bold flex items-center gap-1 text-green-500`}>
                                            <ArrowUpRight className="w-3 h-3" />
                                            {metric.trend}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'inventory' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                                <input type="text" placeholder="Search products..." className="w-full bg-foreground/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-primary/30" />
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button onClick={handleSeed} disabled={productsLoading || dataLoading} className="w-full sm:w-auto bg-foreground/10 text-foreground font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-foreground/20 transition-all border border-foreground/5">
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span className="uppercase tracking-tighter italic">Seed Data</span>
                                </button>
                                <button onClick={() => setEditingProductId(-1)} className="w-full sm:w-auto bg-primary text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20">
                                    <Plus className="w-5 h-5" />
                                    <span className="uppercase tracking-tighter italic">Add Product</span>
                                </button>
                            </div>
                        </div>

                        <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-foreground/[0.02]">
                                        <tr className="text-xs font-black uppercase tracking-widest opacity-30 border-b border-foreground/5">
                                            <th className="px-6 py-4">Product / SKU</th>
                                            <th className="px-6 py-4">Merchant</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Stock</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Returnable</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/5 font-bold">
                                        {productsLoading ? (
                                            [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="px-6 py-4 bg-foreground/5 h-12" /></tr>)
                                        ) : (
                                            products.map((product) => (
                                                <tr key={product.id} className="hover:bg-foreground/[0.01]">
                                                    <td className="px-6 py-4 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground/5 flex-shrink-0">
                                                            {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold truncate max-w-[200px]">{product.name}</div>
                                                            <div className="text-xs opacity-50 font-mono">{product.sku}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-lg">
                                                            {product.merchant_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm opacity-70">{product.category}</td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="number"
                                                            value={localStock[product.id] ?? product.stock}
                                                            onChange={(e) => setLocalStock({ ...localStock, [product.id]: parseInt(e.target.value) })}
                                                            className="w-20 bg-foreground/5 border-none rounded-lg px-2 py-1 outline-none focus:ring-1 ring-primary/30"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">Rs. {product.price.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.is_returnable ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {product.is_returnable ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => handleUpdateStock(product.id)} disabled={updatingId === product.id} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center gap-2" title="Save Stock">
                                                                {updatingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            </button>
                                                            <button onClick={() => setEditingProductId(product.id)} className="p-2 text-foreground hover:bg-foreground/10 rounded-lg transition-colors inline-flex items-center gap-2" title="Edit details">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center gap-2" title="Delete product">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-foreground/5">
                                {productsLoading ? (
                                    [1, 2, 3].map(i => <div key={i} className="p-6 bg-foreground/5 h-40 animate-pulse" />)
                                ) : (
                                    products.map((product) => (
                                        <div key={product.id} className="p-6 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-foreground/5 flex-shrink-0">
                                                    {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-black uppercase italic tracking-tighter leading-tight">{product.name}</h4>
                                                    <p className="text-[10px] font-mono opacity-50">{product.sku}</p>
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block">{product.category}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black uppercase opacity-30">Stock Level</p>
                                                    <input
                                                        type="number"
                                                        value={localStock[product.id] ?? product.stock}
                                                        onChange={(e) => setLocalStock({ ...localStock, [product.id]: parseInt(e.target.value) })}
                                                        className="w-full bg-foreground/5 border-none rounded-lg px-3 py-2 font-bold text-sm outline-none focus:ring-1 ring-primary/30"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black uppercase opacity-30">Price</p>
                                                    <p className="text-sm font-black pt-2">Rs. {product.price.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${product.is_returnable ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {product.is_returnable ? 'Returnable' : 'Ref No Return'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleUpdateStock(product.id)} disabled={updatingId === product.id} className="p-3 bg-primary text-white rounded-xl shadow-lg relative">
                                                        {updatingId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => setEditingProductId(product.id)} className="p-3 bg-foreground/10 text-foreground rounded-xl">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'categories' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Manage Categories</h3>
                                <p className="text-sm opacity-50">Add or remove product categories.</p>
                            </div>
                            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-end sm:items-center">
                                <div className="flex gap-4 w-full sm:w-auto">
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleUploadClick()}
                                            className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 flex items-center justify-center overflow-hidden transition-all bg-foreground/5 sticky"
                                        >
                                            {newCategoryImage ? (
                                                <img src={newCategoryImage} alt="New" className="w-full h-full object-cover" />
                                            ) : (
                                                <Upload className="w-6 h-6 opacity-30 group-hover:opacity-100" />
                                            )}
                                        </button>
                                        {newCategoryImage && (
                                            <button
                                                type="button"
                                                onClick={() => setNewCategoryImage('')}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="bg-foreground/5 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-primary/30 w-full sm:w-64 font-bold h-16"
                                    />
                                </div>
                                <button type="submit" disabled={categoriesLoading || uploadingCategory || !newCategoryName.trim()} className="h-16 bg-primary text-white px-8 rounded-2xl hover:scale-105 transition-transform disabled:opacity-30 flex items-center justify-center gap-2 group shadow-xl shadow-primary/20">
                                    {categoriesLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                                    <span className="uppercase font-black text-sm italic tracking-tighter">Add Category</span>
                                </button>
                            </form>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {categoriesLoading ? (
                                [1, 2, 3, 4].map(i => <div key={i} className="glass p-8 rounded-[2rem] animate-pulse h-24" />)
                            ) : categories.length === 0 ? (
                                <div className="col-span-full p-20 glass rounded-[3rem] text-center opacity-30 italic font-bold">No categories found. Start by adding one above.</div>
                            ) : categories.map(category => (
                                <div key={category.id} className="glass p-4 rounded-[2rem] border-white/5 group hover:border-primary/30 transition-all flex items-center gap-4 relative overflow-hidden">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-foreground/5 relative flex-shrink-0 group">
                                        {category.image_url ? (
                                            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center italic opacity-20 text-[8px] gap-1">
                                                <Upload className="w-4 h-4" />
                                                <span>Add Photo</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleUploadClick(category)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-grow">
                                        {renamingId === category.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={tempName}
                                                    onChange={e => setTempName(e.target.value)}
                                                    className="bg-foreground/5 border-none rounded-lg px-2 py-1 outline-none focus:ring-1 ring-primary/30 font-bold text-sm w-full"
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && handleRenameCategory(category.id)}
                                                />
                                                <button onClick={() => handleRenameCategory(category.id)} className="p-1 px-2 bg-primary text-white text-[10px] rounded-lg">Save</button>
                                                <button onClick={() => setRenamingId(null)} className="p-1 px-2 bg-foreground/10 text-foreground text-[10px] rounded-lg">X</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-black text-sm uppercase italic tracking-tighter truncate flex items-center gap-2">
                                                    {category.name}
                                                </div>
                                                <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest">Active Category</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setRenamingId(category.id); setTempName(category.name); }}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all scale-90 hover:scale-100"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteCategory(category.id, category.name)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all scale-90 hover:scale-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'orders' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-foreground/[0.02] text-xs font-black uppercase opacity-30">
                                        <tr>
                                            <th className="px-6 py-4">Order ID</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Total</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/5 font-bold">
                                        {dataLoading ? (
                                            [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-6 py-4 bg-foreground/5 h-12" /></tr>)
                                        ) : orders.map(order => (
                                            <tr key={order.id} className="hover:bg-foreground/[0.01]">
                                                <td className="px-6 py-4 font-mono">#{order.order_number}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>{order.status}</span>
                                                </td>
                                                <td className="px-6 py-4">Rs. {Number(order.total_amount).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs opacity-50">{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => setSelectedOrderToView(order)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-foreground/5">
                                {dataLoading ? (
                                    [1, 2, 3].map(i => <div key={i} className="p-6 bg-foreground/5 h-32 animate-pulse" />)
                                ) : orders.map(order => (
                                    <div key={order.id} className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30">Order ID</p>
                                                <h4 className="font-mono font-bold">#{order.order_number}</h4>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase opacity-30 italic">Order Total</p>
                                                <p className="text-xl font-black text-primary italic tracking-tighter">Rs. {Number(order.total_amount).toLocaleString()}</p>
                                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedOrderToView(order)} 
                                                className="bg-foreground/5 p-4 rounded-2xl hover:bg-foreground/10 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase italic"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'customers' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-foreground/[0.02] text-xs font-black uppercase opacity-30">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Email Address</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/5 font-bold">
                                        {dataLoading ? (
                                            [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="px-6 py-4 bg-foreground/5 h-12" /></tr>)
                                        ) : customers.map(customer => (
                                            <tr key={customer.id} className="hover:bg-foreground/[0.01]">
                                                <td className="px-6 py-4">{customer.full_name}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-primary">{customer.email || 'N/A'}</td>
                                                <td className="px-6 py-4 capitalize">{customer.role}</td>
                                                <td className="px-6 py-4 text-xs opacity-50">{new Date(customer.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-foreground/5">
                                {dataLoading ? (
                                    [1, 2, 3].map(i => <div key={i} className="p-6 bg-foreground/5 h-32 animate-pulse" />)
                                ) : customers.map(customer => (
                                    <div key={customer.id} className="p-6 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black uppercase">
                                                {customer.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h4 className="font-black italic uppercase tracking-tighter">{customer.full_name}</h4>
                                                <p className="text-[10px] font-bold text-primary">{customer.email || 'No Email'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="px-3 py-1 bg-foreground/5 rounded-full text-[9px] font-black uppercase tracking-widest opacity-60">
                                                Role: {customer.role}
                                            </span>
                                            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                                                Joined {new Date(customer.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
                {activeTab === 'merchants' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic">Merchant Management</h2>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">
                                    {merchants.filter(m => m.merchant_status === 'pending').length} Pending
                                </span>
                            </div>
                        </div>

                        <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
                            {/* Desktop Table */}
                            <div className="hidden xl:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-foreground/[0.02] text-xs font-black uppercase opacity-30">
                                        <tr>
                                            <th className="px-6 py-4">Store / Owner</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Business Info</th>
                                            <th className="px-6 py-4">Banking</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/5 font-bold relative">
                                        {(dataLoading || merchantLoading) && (
                                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            </div>
                                        )}
                                        {dataLoading && merchants.length === 0 ? (
                                            [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-4 bg-foreground/5 h-12" /></tr>)
                                        ) : merchants.length === 0 ? (
                                            <tr><td colSpan={5} className="px-10 py-20 text-center opacity-30 italic font-bold uppercase tracking-widest">No merchants found</td></tr>
                                        ) : merchants.map(m => (
                                            <tr key={m.id} className="hover:bg-foreground/[0.01]">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex-shrink-0">
                                                            {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <Store className="w-5 h-5 m-2.5 text-primary" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black uppercase italic tracking-tighter">{m.store_name || 'Unnamed Store'}</div>
                                                            <div className="text-[10px] opacity-40 font-medium">{m.full_name} ({m.email})</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${
                                                        m.merchant_status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                        m.merchant_status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                        'bg-red-500/10 text-red-500'
                                                    }`}>
                                                        {m.merchant_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] space-y-0.5">
                                                        <p><span className="opacity-30">NTN:</span> {m.ntn || 'N/A'}</p>
                                                        <p className="truncate max-w-[150px]"><span className="opacity-30">Addr:</span> {m.business_address || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] space-y-0.5">
                                                        <p className="truncate max-w-[150px]"><span className="opacity-30">Acc:</span> {m.bank_account || 'N/A'}</p>
                                                        <p><span className="opacity-30">Title:</span> {m.bank_title || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {m.merchant_status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleUpdateMerchantStatus(m.id, 'approved', m.store_slug)}
                                                                    className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all"
                                                                    title="Approve Merchant"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleUpdateMerchantStatus(m.id, 'rejected', m.store_slug)}
                                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                                    title="Reject Application"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {m.merchant_status === 'approved' && (
                                                            <button 
                                                                onClick={() => handleUpdateMerchantStatus(m.id, 'paused')}
                                                                className="px-3 py-1.5 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase rounded-xl hover:bg-amber-500/10 transition-all"
                                                            >
                                                                Pause Store
                                                            </button>
                                                        )}
                                                        {m.merchant_status === 'paused' && (
                                                            <button 
                                                                onClick={() => handleUpdateMerchantStatus(m.id, 'approved', m.store_slug)}
                                                                className="px-3 py-1.5 border border-green-500/30 text-green-500 text-[10px] font-black uppercase rounded-xl hover:bg-green-500/10 transition-all"
                                                            >
                                                                Unpause Store
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile/Tablet Card View */}
                            <div className="xl:hidden divide-y divide-foreground/5">
                                {merchants.map(m => (
                                    <div key={m.id} className="p-6 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 overflow-hidden flex-shrink-0">
                                                    {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 m-3 text-primary" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-black italic uppercase tracking-tighter">{m.store_name || 'Unnamed Store'}</h4>
                                                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{m.full_name}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-black tracking-widest ${
                                                m.merchant_status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                m.merchant_status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                                {m.merchant_status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-foreground/5">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase opacity-30 italic">Registration Date</p>
                                                <p className="text-xs font-bold">{new Date(m.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase opacity-30 italic">NTN Number</p>
                                                <p className="text-xs font-bold">{m.ntn || 'Not provided'}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {m.merchant_status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleUpdateMerchantStatus(m.id, 'approved', m.store_slug)} className="flex-1 py-3 bg-green-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-green-500/20">Approve</button>
                                                    <button onClick={() => handleUpdateMerchantStatus(m.id, 'rejected')} className="flex-1 py-3 bg-red-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-red-500/20">Reject</button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleUpdateMerchantStatus(m.id, m.merchant_status === 'paused' ? 'approved' : 'paused', m.store_slug)}
                                                    className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl border ${m.merchant_status === 'paused' ? 'border-green-500 text-green-500 bg-green-500/5' : 'border-amber-500 text-amber-500 bg-amber-500/5'}`}
                                                >
                                                    {m.merchant_status === 'paused' ? 'Resume Store' : 'Pause Store'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}


                {activeTab === 'carts' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {dataLoading ? (
                                [1, 2].map(i => <div key={i} className="glass h-40 animate-pulse rounded-3xl" />)
                            ) : carts.length === 0 ? (
                                <div className="col-span-full glass p-12 text-center rounded-[2rem]">
                                    <ShoppingBag className="w-12 h-12 opacity-20 mx-auto mb-4" />
                                    <h3 className="text-xl font-black opacity-30 uppercase tracking-widest">No active carts found</h3>
                                </div>
                            ) : carts.map((cart, idx) => (
                                <div key={idx} className="glass rounded-[2rem] p-6 border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black uppercase">
                                                {cart.user?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h3 className="font-black">{cart.user?.full_name || 'Anonymous User'}</h3>
                                                <p className="text-[10px] text-primary font-black uppercase tracking-widest">{cart.user?.email || 'No Email'}</p>
                                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Last updated: {new Date(cart.last_updated).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black opacity-30 uppercase tracking-widest">Cart Total</p>
                                            <p className="text-lg font-black text-primary">Rs. {Number(cart.total).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-t border-white/5 pt-4">
                                        {cart.items.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 bg-white/[0.02] p-3 rounded-2xl">
                                                <img src={item.products.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                                <div className="flex-grow">
                                                    <p className="text-xs font-bold leading-tight">{item.products.name}</p>
                                                    <p className="text-[10px] opacity-40 font-black tracking-widest uppercase">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black">Rs. {(item.products.price * item.quantity).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'banners' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                        <div className="flex flex-col xl:flex-row gap-10">
                            {/* Add Banner Form */}
                            <div className="w-full xl:w-1/3 glass p-8 rounded-[3rem] border-white/5 space-y-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter">Add New Banner</h3>
                                <form onSubmit={handleAddBanner} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Banner Image</label>
                                        <button
                                            type="button"
                                            onClick={() => openUploadWidget((url) => setNewBanner(p => ({ ...p, image_url: url })))}
                                            className="w-full aspect-[21/9] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all bg-foreground/5 overflow-hidden group"
                                        >
                                            {newBanner.image_url ? (
                                                <img src={newBanner.image_url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <>
                                                    <Upload className="w-6 h-6 opacity-30" />
                                                    <span className="text-[10px] font-bold opacity-30 text-center px-4">Click to upload (21:9 recommended)</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase opacity-30">Display Order</label>
                                            <input type="number" value={newBanner.display_order} onChange={e => setNewBanner(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} className="w-full glass border-none rounded-xl p-3 font-bold text-sm bg-background/5" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase opacity-30">Slide Duration (ms)</label>
                                            <input type="number" step="500" value={newBanner.slide_duration} onChange={e => setNewBanner(p => ({ ...p, slide_duration: parseInt(e.target.value) || 5000 }))} className="w-full glass border-none rounded-xl p-3 font-bold text-sm bg-background/5" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Link URL (Optional)</label>
                                        <input type="url" value={newBanner.link_url} onChange={e => setNewBanner(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." className="w-full glass border-none rounded-xl p-3 font-bold text-sm bg-background/5" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase opacity-30">Start Time</label>
                                            <input type="datetime-local" value={newBanner.start_at} onChange={e => setNewBanner(p => ({ ...p, start_at: e.target.value }))} className="w-full glass border-none rounded-xl p-3 font-bold text-xs bg-background/5" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase opacity-30">End Time</label>
                                            <input type="datetime-local" value={newBanner.end_at} onChange={e => setNewBanner(p => ({ ...p, end_at: e.target.value }))} className="w-full glass border-none rounded-xl p-3 font-bold text-xs bg-background/5" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={dataLoading || !newBanner.image_url} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        {dataLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                        Save Banner
                                    </button>
                                </form>
                            </div>

                            {/* High-End Banner Management */}
                            <div className="w-full xl:w-2/3 space-y-6">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Active & Merchant Banners</h3>
                                <div className="grid gap-8">
                                    {banners.length === 0 ? (
                                        <div className="glass p-24 text-center rounded-[3rem] opacity-30 font-black uppercase italic tracking-widest text-xl border-white/5">No banners currently live</div>
                                    ) : banners.map(banner => {
                                        const now = new Date();
                                        const start = new Date(banner.start_at);
                                        const end = banner.end_at ? new Date(banner.end_at) : null;
                                        const isActive = banner.status === 'approved' && start <= now && (!end || end >= now);

                                        return (
                                            <div key={banner.id} className="glass p-6 rounded-[2rem] border-white/5 flex flex-col md:flex-row gap-6 relative group overflow-hidden">
                                                <div className="w-full md:w-56 aspect-[21/7] md:aspect-[16/7] rounded-xl overflow-hidden bg-foreground/5 flex-shrink-0">
                                                    <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-grow space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isActive ? 'bg-green-500/10 text-green-500' : banner.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                {banner.status === 'pending' ? 'Pending Approval' : isActive ? 'Live' : 'Inactive'}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase opacity-30">Order:</span>
                                                                <input
                                                                    type="number"
                                                                    value={banner.display_order}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, display_order: val } : b));
                                                                    }}
                                                                    onBlur={() => handleUpdateBannerOrder(banner.id, banner.display_order)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateBannerOrder(banner.id, banner.display_order)}
                                                                    className="w-12 bg-foreground/5 border-none rounded-lg px-2 py-0.5 text-[10px] font-bold outline-none focus:ring-1 ring-primary/30"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteBanner(banner.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {banner.merchant && (
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">Merchant:</p>
                                                                <p className="text-[10px] font-bold text-primary">{banner.merchant.full_name}</p>
                                                            </div>
                                                            <p className="text-[9px] font-medium opacity-50 ml-[60px]">{banner.merchant.email}</p>
                                                        </div>
                                                    )}

                                                    {banner.link_url && <p className="text-[10px] font-medium text-primary/60 truncate max-w-xs">{banner.link_url}</p>}

                                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                                        <div className="space-y-1">
                                                            <p className="text-[8px] font-black uppercase opacity-30">Starts</p>
                                                            <p className="text-xs font-bold">{new Date(banner.start_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[8px] font-black uppercase opacity-30">Ends</p>
                                                            <p className="text-xs font-bold">{banner.end_at ? new Date(banner.end_at).toLocaleDateString() : '∞'}</p>
                                                        </div>
                                                    </div>

                                                    {banner.status === 'pending' && (
                                                        <div className="flex gap-2 pt-4">
                                                            <button
                                                                onClick={async () => {
                                                                    const { error } = await supabase.from('banners').update({ status: 'approved' }).eq('id', banner.id);
                                                                    if (!error) {
                                                                        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: 'approved' } : b));
                                                                        useToastStore.getState().show('Banner approved!', 'success');

                                                                        // Notify Merchant via Email
                                                                        if (banner.merchant?.email) {
                                                                            fetch(`${import.meta.env.VITE_API_URL}/banners/notify-merchant`, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    merchantEmail: banner.merchant.email,
                                                                                    status: 'approved',
                                                                                    bannerUrl: banner.image_url
                                                                                })
                                                                            }).then(async (res) => {
                                                                                if (!res.ok) {
                                                                                    const err = await res.json();
                                                                                    console.error('Merchant notification failed:', err);
                                                                                    useToastStore.getState().show('Approved, but failed to notify merchant via email', 'info');
                                                                                }
                                                                            }).catch(err => {
                                                                                console.error('Merchant notification fetch error:', err);
                                                                                useToastStore.getState().show('Email notification failed', 'info');
                                                                            });
                                                                        }
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const comment = prompt('Reason for rejection?');
                                                                    const { error } = await supabase.from('banners').update({ status: 'rejected', admin_comment: comment }).eq('id', banner.id);
                                                                    if (!error) {
                                                                        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: 'rejected', admin_comment: comment } : b));
                                                                        useToastStore.getState().show('Banner rejected', 'error');

                                                                        // Notify Merchant via Email
                                                                        if (banner.merchant?.email) {
                                                                            fetch(`${import.meta.env.VITE_API_URL}/banners/notify-merchant`, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    merchantEmail: banner.merchant.email,
                                                                                    status: 'rejected',
                                                                                    adminComment: comment,
                                                                                    bannerUrl: banner.image_url
                                                                                })
                                                                            }).then(async (res) => {
                                                                                if (!res.ok) {
                                                                                    const err = await res.json();
                                                                                    console.error('Merchant notification failed:', err);
                                                                                    useToastStore.getState().show('Rejected, but failed to notify merchant via email', 'info');
                                                                                }
                                                                            }).catch(err => {
                                                                                console.error('Merchant notification fetch error:', err);
                                                                                useToastStore.getState().show('Email notification failed', 'info');
                                                                            });
                                                                        }
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'articles' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className="flex flex-col xl:flex-row gap-10">
                            {/* Create Article Form */}
                            <div className="w-full xl:w-1/3 bg-foreground/5 rounded-[3rem] p-8 h-fit sticky top-10">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">
                                    {editingArticleId ? 'Edit Article' : 'Create New Article'}
                                </h3>
                                <form onSubmit={handleSaveArticle} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Title</label>
                                        <input type="text" value={newArticle.title} onChange={e => setNewArticle(p => ({ ...p, title: e.target.value }))} className="w-full glass border-none rounded-xl p-4 font-bold text-sm bg-background/5" placeholder="Article Title" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Excerpt</label>
                                        <textarea value={newArticle.excerpt} onChange={e => setNewArticle(p => ({ ...p, excerpt: e.target.value }))} className="w-full glass border-none rounded-xl p-4 font-bold text-sm bg-background/5 h-20" placeholder="Brief summary..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Content</label>
                                        <textarea value={newArticle.content} onChange={e => setNewArticle(p => ({ ...p, content: e.target.value }))} className="w-full glass border-none rounded-xl p-4 font-bold text-sm bg-background/5 h-40" placeholder="Full article content..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Feature Image</label>
                                        <div
                                            onClick={() => openUploadWidget((url) => setNewArticle(p => ({ ...p, image_url: url })))}
                                            className="w-full aspect-video rounded-xl border-2 border-dashed border-foreground/10 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden bg-background/5"
                                        >
                                            {newArticle.image_url ? <img src={newArticle.image_url} className="w-full h-full object-cover" /> : <Plus className="w-8 h-8 opacity-20" />}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button type="submit" disabled={isPublishing || !newArticle.title} className="flex-grow py-4 bg-primary text-white rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : editingArticleId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                            {editingArticleId ? 'Save Changes' : 'Publish Article'}
                                        </button>
                                        {editingArticleId && (
                                            <button
                                                type="button"
                                                onClick={cancelEditingArticle}
                                                className="px-6 py-4 bg-foreground/10 text-foreground rounded-2xl font-black uppercase italic tracking-tighter hover:bg-foreground/20 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Articles List */}
                            <div className="w-full xl:w-2/3 space-y-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter">Published Articles</h3>
                                <div className="grid gap-6">
                                    {articles.length === 0 ? (
                                        <div className="glass p-12 text-center rounded-[3rem] opacity-30 font-black uppercase italic tracking-widest text-xl">No articles found</div>
                                    ) : articles.map(article => (
                                        <div key={article.id} className="glass p-6 rounded-[2rem] border-white/5 flex flex-col md:flex-row gap-6 relative group overflow-hidden">
                                            <div className="w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-foreground/5 flex-shrink-0 flex items-center justify-center">
                                                {article.image_url ? (
                                                    <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 opacity-10" />
                                                )}
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-black uppercase italic text-lg leading-tight">{article.title}</h4>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => startEditingArticle(article)}
                                                            className="p-2 text-foreground hover:bg-foreground/10 rounded-lg"
                                                            title="Edit Article"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setArticleToDelete(article.id)}
                                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                            title="Delete Article"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs opacity-50 font-medium line-clamp-2">{article.excerpt}</p>
                                                <div className="flex items-center gap-3 pt-2">
                                                    <span className="text-[10px] font-black uppercase opacity-30">{new Date(article.created_at).toLocaleDateString()}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${article.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {article.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'vouchers' && (
                    <div className="space-y-12">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-foreground/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-foreground/5 gap-6">
                            <div className="max-w-md">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Global Vouchers</h3>
                                <p className="text-sm opacity-50">Create vouchers that work for all merchants or specific users.</p>
                            </div>
                            <button onClick={() => { setEditingVoucherId(null); setShowVoucherForm(true); }} className="w-full sm:w-auto bg-primary text-white p-4 px-8 rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:scale-105 active:scale-95 transition-transform text-center">
                                Create Global Voucher
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {allVouchers.map(v => {
                                const isExpired = v.expiry_date && new Date(v.expiry_date) < new Date();
                                const isLimitReached = v.usage_limit && v.used_count >= v.usage_limit;
                                return (
                                    <div key={v.id} className="glass p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border-white/5 space-y-6 relative overflow-hidden group shadow-xl">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30 mb-1">Coupon Code</p>
                                                <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-primary">{v.code}</h3>
                                                <p className="text-[8px] font-bold uppercase opacity-30 mt-1">Creator: {v.merchant?.full_name || 'System Admin'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setEditingVoucherId(v.id);
                                                        setNewVoucher({
                                                            code: v.code,
                                                            type: v.type,
                                                            value: v.value,
                                                            min_spend: v.min_spend || 0,
                                                            expiry_date: v.expiry_date ? v.expiry_date.split('T')[0] : '',
                                                            usage_limit: v.usage_limit || '',
                                                            target_customer_id: v.target_customer_id,
                                                            max_discount: v.max_discount || '',
                                                            per_user_limit: v.per_user_limit || 1
                                                        });
                                                        setShowVoucherForm(true);
                                                    }} 
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-xl border border-white/5 transition-colors"
                                                    title="Edit Voucher"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {deletingVoucherId === v.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteVoucher(v.id); }} 
                                                            className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition-all uppercase italic"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setDeletingVoucherId(null); }} 
                                                            className="px-3 py-1 glass text-[10px] font-black rounded-lg hover:bg-white/10 transition-all uppercase italic"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleToggleVoucher(v)} className={`p-2 rounded-xl border border-white/5 transition-colors ${v.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-500 hover:bg-zinc-500/10'}`} title="Toggle Active">
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setDeletingVoucherId(v.id); }} 
                                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl border border-white/5 transition-colors" 
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`px-4 py-1.5 rounded-full inline-block font-black text-[9px] uppercase tracking-widest ${v.is_active && !isExpired && !isLimitReached ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : v.is_active ? 'Active' : 'Deactivated'}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30">Benefit</p>
                                                <p className="text-xl font-black">{v.type === 'percentage' ? `${v.value}%` : `Rs. ${v.value}`}</p>
                                                {v.max_discount && <p className="text-[9px] font-bold text-primary italic uppercase tracking-tighter mt-0.5">Max Rs. {v.max_discount}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30">Volume</p>
                                                <p className="text-xl font-black">{v.used_count} / {v.usage_limit || '∞'}</p>
                                                <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mt-0.5">Limit/User: {v.per_user_limit || 1}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => fetchVoucherStats(v.id)}
                                            className="w-full py-4 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                                        >
                                            Insights & Performance
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {selectedVoucherStats.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border-white/5 space-y-8 shadow-2xl">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter italic">Usage Breakdown</h3>
                                    <button onClick={() => setSelectedVoucherStats([])} className="text-xs font-black uppercase tracking-widest text-primary">Close Details</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedVoucherStats.map((u, i) => (
                                        <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center font-black">
                                                    {u.profiles?.full_name?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm">{u.profiles?.full_name || 'Customer'}</p>
                                                    <p className="text-[8px] opacity-50 font-medium">{u.profiles?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end pt-4 border-t border-white/5">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black uppercase opacity-30">Order Info</p>
                                                    <p className="text-xs font-black text-primary">#{u.orders?.order_number || u.order_id}</p>
                                                </div>
                                                <p className="text-[10px] opacity-30 font-bold uppercase">{new Date(u.used_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}

            </div>

            <AnimatePresence>
                {/* Form Overlay (Admin Version) */}
                {editingProductId !== null && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed inset-0 z-[150] bg-background border-l border-white/5 overflow-y-auto"
                        data-lenis-prevent
                    >
                        {/* 
                          We pass `productId` to let the form know we are editing. 
                          If `editingProductId === -1`, we pass undefined so it acts as "Create".
                        */}
                        <div className="max-w-4xl mx-auto py-12 px-6">
                            <ProductForm
                                productId={editingProductId === -1 ? undefined : editingProductId}
                                onClose={() => setEditingProductId(null)}
                                onSuccess={() => {
                                    refetch();
                                    refetchStats();
                                    setEditingProductId(null);
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {selectedOrderToView && (
                <ReceiptModal order={selectedOrderToView} onClose={() => setSelectedOrderToView(null)} />
            )}

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {articleToDelete !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                        data-lenis-prevent
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-zinc-950 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/5 text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Delete Article?</h3>
                            <p className="opacity-50 text-sm font-medium mb-8">This action cannot be undone. Are you sure you want to remove this story?</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setArticleToDelete(null)}
                                    className="flex-1 py-4 bg-foreground/5 text-foreground rounded-2xl font-black uppercase italic tracking-tighter hover:bg-foreground/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteArticle(articleToDelete)}
                                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-red-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {showVoucherForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" data-lenis-prevent>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background w-full max-w-lg rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-border shadow-2xl space-y-8 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingVoucherId ? 'Edit Global Voucher' : 'Create Global Voucher'}</h2>
                            <button onClick={() => { setShowVoucherForm(false); setEditingVoucherId(null); }} className="p-2 hover:bg-foreground/5 rounded-full"><X /></button>
                        </div>
                        <form onSubmit={editingVoucherId ? handleUpdateVoucher : handleCreateVoucher} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-30">Voucher Code</label>
                                <input required type="text" value={newVoucher.code} onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })} className="w-full glass border-none rounded-2xl p-4 font-black tracking-widest" placeholder="GLOBAL10..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Type</label>
                                    <select value={newVoucher.type} onChange={e => setNewVoucher({ ...newVoucher, type: e.target.value as any })} className="w-full glass border-none rounded-2xl p-4 bg-background">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Value</label>
                                    <input required type="number" value={newVoucher.value} onChange={e => setNewVoucher({ ...newVoucher, value: parseFloat(e.target.value) })} className="w-full glass border-none rounded-2xl p-4 font-black" />
                                </div>
                            </div>

                            {newVoucher.type === 'percentage' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Max Discount (Cap)</label>
                                    <input type="number" value={newVoucher.max_discount} onChange={e => setNewVoucher({ ...newVoucher, max_discount: e.target.value })} className="w-full glass border-none rounded-2xl p-4 font-black text-primary" placeholder="e.g. 500" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Min Spend</label>
                                    <input type="number" value={newVoucher.min_spend} onChange={e => setNewVoucher({ ...newVoucher, min_spend: parseFloat(e.target.value) })} className="w-full glass border-none rounded-2xl p-4" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Usage Limit (Global)</label>
                                    <input type="number" value={newVoucher.usage_limit} onChange={e => setNewVoucher({ ...newVoucher, usage_limit: e.target.value })} className="w-full glass border-none rounded-2xl p-4" placeholder="Unlimited" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Expiry Date</label>
                                    <input type="date" value={newVoucher.expiry_date} onChange={e => setNewVoucher({ ...newVoucher, expiry_date: e.target.value })} className="w-full glass border-none rounded-2xl p-4 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Limit Per User</label>
                                    <input type="number" 
                                           value={newVoucher.per_user_limit} 
                                           onChange={e => setNewVoucher({ ...newVoucher, per_user_limit: parseInt(e.target.value) || 1 })} 
                                           className="w-full glass border-none rounded-2xl p-4" />
                                </div>
                            </div>
                            <button type="submit" disabled={dataLoading} className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                {dataLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingVoucherId ? 'Save Changes' : 'Activate Globally')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
