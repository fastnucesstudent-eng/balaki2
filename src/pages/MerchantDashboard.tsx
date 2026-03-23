import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Truck, BarChart3, Plus, X, Edit2,
    ShoppingBag, Menu,
    Loader2,
    Clock, CheckCircle2, QrCode, Image as ImageIcon, Upload, Trash2, ExternalLink, Settings, Store,
    Percent, Tag, Share2, Copy, Download
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { ReceiptModal } from '../components/ReceiptModal';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { ProductForm as UnifiedProductForm } from '../components/ProductForm';
import { useCategories } from '../hooks/useCategories';

declare global {
    interface Window {
        cloudinary: any;
    }
}

// Mock QR Scanner
const QRScannerPopup = ({ onScan, onClose }: { onScan: (data: string) => void, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" data-lenis-prevent>
        <div className="bg-background w-full max-w-md rounded-[3rem] p-10 border border-border shadow-2xl space-y-8 text-center text-foreground">
            <div className="relative w-48 h-48 mx-auto">
                <QrCode className="w-full h-full text-primary animate-pulse" />
                <div className="absolute inset-0 border-4 border-primary border-dashed rounded-3xl animate-spin-slow opacity-20" />
            </div>
            <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Ready to Scan</h3>
                <p className="opacity-50 text-sm font-medium mt-2">Align the product QR code within the frame.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onScan('SCAN-SKU-8273')} className="py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform">Simulate Scan</button>
                <button onClick={onClose} className="py-4 bg-foreground/5 rounded-2xl font-black text-sm hover:bg-foreground/10">Cancel</button>
            </div>
        </div>
    </div>
);


// Unified Product Form is robustly typed in its own file.
export const MerchantDashboard = () => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [storeProfile, setStoreProfile] = useState({
        store_name: '',
        business_address: '',
        contact_number: '',
        logo_url: '',
        banner_url: ''
    });
    const { products, loading: productsLoading, refetch: refetchProducts } = useProducts();
    const [orders, setOrders] = useState<any[]>([]);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const { user, role, merchantStatus, storeSlug, qrCodeUrl } = useAuthStore();
    const [uploading, setUploading] = useState(false);
    const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
    const [confirmingCancelId, setConfirmingCancelId] = useState<number | null>(null);
    const toast = useToastStore();
    const [trackingData, setTrackingData] = useState({
        orderId: null as number | null,
        tracking_number: '',
        courier_name: 'TCS',
        shipping_proof_url: ''
    });
    const [isAssigningTracking, setIsAssigningTracking] = useState(false);

    // Bulk Discount State
    const [showBulkDiscount, setShowBulkDiscount] = useState(false);
    const [bulkDiscountData, setBulkDiscountData] = useState({
        category: '',
        percentage: 0
    });
    const { categories } = useCategories();

    const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<any | null>(null);

    // Banner Logic
    const [banners, setBanners] = useState<any[]>([]);
    const [bannersLoading, setBannersLoading] = useState(false);
    const [newBanner, setNewBanner] = useState({
        image_url: '',
        link_url: '',
        start_at: new Date().toISOString().slice(0, 16),
        end_at: '',
        slide_duration: 5000
    });

    // New Voucher State
    const [showVoucherForm, setShowVoucherForm] = useState(false);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash;
            if (hash === '#inventory') setActiveTab('inventory');
            else if (hash === '#used-items') setActiveTab('used');
            else if (hash === '#orders') setActiveTab('orders');
            else if (hash === '#performance') setActiveTab('performance');
            else if (hash === '#carts') setActiveTab('carts');
            else if (hash === '#banners') setActiveTab('banners');
            else if (hash === '#vouchers') setActiveTab('vouchers');
            else if (hash === '#share' || hash === '#qr') setActiveTab('qr');
            else if (hash === '#profile') setActiveTab('profile');
        };
        window.addEventListener('hashchange', handleHash);
        handleHash(); // Initial check
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    useEffect(() => {
        if (showVoucherForm) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showVoucherForm]);
    const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
    const [deletingVoucherId, setDeletingVoucherId] = useState<string | number | null>(null);
    const [selectedVoucherStats, setSelectedVoucherStats] = useState<any[]>([]); 
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

    const handleCreateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        setVouchersLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newVoucher,
                    merchant_id: user?.id,
                    usage_limit: newVoucher.usage_limit ? parseInt(newVoucher.usage_limit) : null,
                    max_discount: newVoucher.max_discount ? parseFloat(newVoucher.max_discount) : null
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Creation failed' }));
                throw new Error(errorData.error || `Error ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                toast.show('Voucher created successfully!', 'success');
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
                fetchMerchantVouchers();
            } else {
                toast.show(data.error, 'error');
            }
        } catch (err: any) {
            useToastStore.getState().show(err.message, 'error');
        } finally {
            setVouchersLoading(false);
        }
    };

    const handleUpdateVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVoucherId) return;
        setVouchersLoading(true);
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
                const errorData = await res.json().catch(() => ({ error: 'Update failed' }));
                throw new Error(errorData.error || `Error ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                toast.show('Voucher Updated!', 'success');
                setShowVoucherForm(false);
                setEditingVoucherId(null);
                setNewVoucher({
                    code: '', type: 'percentage', value: 0, min_spend: 0, expiry_date: '',
                    usage_limit: '', target_customer_id: null, max_discount: '', per_user_limit: 1
                });
                fetchMerchantVouchers();
            }
        } catch (err: any) {
            toast.show(err.message, 'error');
        } finally {
            setVouchersLoading(false);
        }
    };

    const handleDeleteVoucher = async (id: string | number) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/vouchers/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.show('Voucher deleted', 'success');
                setMerchantVouchers(prev => prev.filter(v => v.id !== id));
                setDeletingVoucherId(null); // Reset deleting state
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Delete failed' }));
                throw new Error(errorData.error || 'Failed to delete');
            }
        } catch (err: any) {
            toast.show(err.message, 'error');
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
                setMerchantVouchers(prev => prev.map(item => item.id === v.id ? { ...item, is_active: !v.is_active } : item));
                toast.show(`Voucher ${v.is_active ? 'deactivated' : 'activated'}`, 'success');
            }
        } catch (err: any) {
            toast.show(err.message, 'error');
        }
    };

    const fetchBanners = async () => {
        if (!user) return;
        setBannersLoading(true);
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .eq('merchant_id', user.id)
                .order('created_at', { ascending: false });
            if (error) {
                if (error.code === '42P01') {
                    console.warn('Banners table missing in MerchantDashboard');
                } else {
                    toast.show(error.message, 'error');
                }
                return;
            }
            setBanners(data || []);
        } catch (error: any) {
            toast.show(error.message, 'error');
        } finally {
            setBannersLoading(false);
        }
    };

    const handleRequestBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setBannersLoading(true);
        try {
            const { error } = await supabase.from('banners').insert([{
                ...newBanner,
                end_at: newBanner.end_at || null,
                link_url: newBanner.link_url || null,
                merchant_id: user.id,
                status: 'pending',
                display_order: 0 // Admin will set this during approval
            }]);
            if (error) throw error;
            toast.show('Banner request sent to admin!', 'success');

            // Notify Admin via Email
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/banners/notify-admin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        merchantName: user.user_metadata?.full_name || user.email,
                        merchantEmail: user.email,
                        bannerUrl: newBanner.image_url
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || errorData.error || 'Failed to send email');
                }
            } catch (e: any) {
                console.error('Failed to send admin notification email', e);
                toast.show(`Banner requested, but admin notification failed: ${e.message}`, 'info');
            }

            setNewBanner({
                image_url: '',
                link_url: '',
                start_at: new Date().toISOString().slice(0, 16),
                end_at: '',
                slide_duration: 5000
            });
            fetchBanners();
        } catch (error: any) {
            toast.show(error.message, 'error');
        } finally {
            setBannersLoading(false);
        }
    };

    const handleDeleteBanner = async (id: number) => {
        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;
            toast.show('Banner request deleted', 'success');
            fetchBanners();
        } catch (error: any) {
            toast.show(error.message, 'error');
        }
    };

    const openUploadWidget = (callback: (url: string) => void) => {
        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
                multiple: false,
                maxFiles: 1,
            },
            (error: any, result: any) => {
                if (!error && result && result.event === "success") {
                    callback(result.info.secure_url);
                }
            }
        );
        widget.open();
    };

    useEffect(() => {
        if (activeTab === 'banners') fetchBanners();
        if (activeTab === 'vouchers') fetchMerchantVouchers();
    }, [activeTab]);

    // Voucher Logic
    const [merchantVouchers, setMerchantVouchers] = useState<any[]>([]);
    const [vouchersLoading, setVouchersLoading] = useState(false);

    const fetchMerchantVouchers = async () => {
        if (!user) return;
        setVouchersLoading(true);
        try {
            const { data, error } = await supabase
                .from('vouchers')
                .select('*')
                .eq('merchant_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setMerchantVouchers(data || []);
        } catch (error: any) {
            toast.show(error.message, 'error');
        } finally {
            setVouchersLoading(false);
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

    // Carts State
    const [carts, setCarts] = useState<any[]>([]);
    const [cartsLoading, setCartsLoading] = useState(false);

    const fetchCarts = async () => {
        if (!user) return;
        setCartsLoading(true);
        try {
            // Fetch cart items for products belonging to this merchant
            const { data, error } = await supabase
                .from('cart_items')
                .select('*, products!inner(*), user:profiles!user_id(id, full_name, email)')
                .eq('products.merchant_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Group items by user
                const grouped = data.reduce((acc: any, item: any) => {
                    const userId = item.user_id;
                    if (!acc[userId]) {
                        acc[userId] = {
                            user: item.user,
                            items: [],
                            total: 0,
                            lastUpdated: new Date(item.updated_at)
                        };
                    }
                    acc[userId].items.push(item);
                    acc[userId].total += item.products.price * item.quantity;

                    // Keep track of the latest update in this user's cart
                    const itemDate = new Date(item.updated_at);
                    if (itemDate > acc[userId].lastUpdated) {
                        acc[userId].lastUpdated = itemDate;
                    }
                    return acc;
                }, {});

                setCarts(Object.values(grouped));
            }
        } catch (err: any) {
            console.error('Error fetching carts:', err);
            toast.show('Failed to fetch carts: ' + err.message, 'error');
        } finally {
            setCartsLoading(false);
        }
    };

    const fetchStoreProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('store_name, business_address, contact_number, logo_url, banner_url')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            if (data) setStoreProfile(data);
        } catch (err: any) {
            console.error('Error fetching store profile:', err);
        }
    };

    const handleUpdateStoreProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setUploading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(storeProfile)
                .eq('id', user.id);
            if (error) throw error;
            toast.show('Store profile updated successfully!', 'success');
        } catch (err: any) {
            toast.show('Update failed: ' + err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'carts') fetchCarts();
        if (activeTab === 'profile') fetchStoreProfile();
    }, [activeTab]);

    const fetchOrders = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles!user_id(*),
                order_items(*, products(*))
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.show('Failed to fetch orders: ' + error.message, 'error');
            return;
        }
        // Map the user data to profiles for backward compatibility
        const ordersWithProfiles = data?.map(order => ({
            ...order,
            profiles: order.profiles
        })) || [];
        setOrders(ordersWithProfiles);
    };

    useEffect(() => {
        fetchOrders();
    }, [user]);

    const handleUpdateStatus = async (orderId: number, status: string) => {
        try {
            const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/orders/status/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                toast.show(`Order status updated: ${status.toUpperCase()}`, 'success');
                fetchOrders();
            } else {
                toast.show('Error updating status: ' + data.error, 'error');
            }
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.show('Error updating status: ' + error.message, 'error');
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        setCancellingOrderId(orderId);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/cancel-merchant/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });

            const data = await res.json();
            if (data.success) {
                toast.show('Order cancelled successfully', 'success');
                fetchOrders();
                setConfirmingCancelId(null);
            } else {
                toast.show(data.error || 'Failed to cancel order', 'error');
            }
        } catch (error: any) {
            console.error('Cancellation error:', error);
            toast.show('An error occurred while cancelling the order', 'error');
        } finally {
            setCancellingOrderId(null);
        }
    };

    const getMerchantStats = () => {
        const stats = {
            deliveredRevenue: 0,
            pendingRevenue: 0,
            totalOrders: 0,
            shippedCount: 0
        };

        // TODO: Project Checklist
        // - [x] Planning Admin and Mobile Enhancements
        // - [/] Implement Dynamic Category System (DB + Hooks)
        // - [ ] Align Admin Dashboard Inventory UI with Merchant Dashboard
        // - [ ] Mobile Responsiveness Audit & Polish (Site-wide)

        const isAdmin = role === 'admin';

        orders.forEach(order => {
            // If admin, we count everything. If merchant, we only count their items.
            const mItems = isAdmin
                ? (order.order_items || [])
                : (order.order_items?.filter((oi: any) => oi.products?.merchant_id === user?.id) || []);

            const mTotal = mItems.reduce((sum: number, oi: any) => sum + (Number(oi.price || 0) * (oi.quantity || 1)), 0);

            if (mItems.length > 0) {
                if (isAdmin) {
                    stats.totalOrders++;
                    stats.deliveredRevenue += order.status === 'delivered' ? Number(order.total_amount || 0) : 0;
                    stats.pendingRevenue += order.status !== 'delivered' ? Number(order.total_amount || 0) : 0;
                    if (order.status === 'shipped') stats.shippedCount++;
                } else {
                    stats.totalOrders++;
                    stats.deliveredRevenue += order.status === 'delivered' ? mTotal : 0;
                    stats.pendingRevenue += order.status !== 'delivered' ? mTotal : 0;
                    if (order.status === 'shipped') stats.shippedCount++;
                }
            }
        });
        return stats;
    };

    const filteredProducts = role === 'admin'
        ? products
        : products.filter(p => p.merchant_id === user?.id);

    const filteredOrders = role === 'admin'
        ? orders
        : orders.filter(order =>
            order.order_items?.some((oi: any) => oi.products?.merchant_id === user?.id)
        );

    const handleShippingProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Backend expects base64 strings in JSON, not FormData
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            setUploading(true);

            try {
                const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/products/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        images: [base64] // Wrap in array as expected by API
                    })
                }, 30000); // 30s for file uploads

                const data = await res.json();

                if (data.success) {
                    setTrackingData(prev => ({ ...prev, shipping_proof_url: data.imageUrls[0] }));
                    toast.show('Shipping proof uploaded successfully!', 'success');
                } else {
                    toast.show('Upload failed: ' + data.error, 'error');
                }
            } catch (error: any) {
                toast.show('Upload error: ' + error.message, 'error');
            } finally {
                setUploading(false);
            }
        };
        reader.onerror = () => {
            toast.show('Error reading file', 'error');
        };
    };

    const handleAssignTracking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAssigningTracking(true);
        try {
            const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/orders/assign-tracking/${trackingData.orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tracking_number: trackingData.tracking_number,
                    courier_name: trackingData.courier_name,
                    shipping_proof_url: trackingData.shipping_proof_url
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.show('Tracking assigned! Status updated to Shipped.', 'success');
                setTrackingData({ orderId: null, tracking_number: '', courier_name: 'TCS', shipping_proof_url: '' });
                fetchOrders();
            } else {
                toast.show('Error assigning tracking: ' + data.error, 'error');
            }
        } catch (error: any) {
            toast.show('Error assigning tracking: ' + error.message, 'error');
        } finally {
            setIsAssigningTracking(false);
        }
    };
    const handleDeleteProduct = async (id: number) => {
        try {
            // Soft Delete: Mark as deleted to preserve order history
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast.show('Product deleted.', 'success');
            refetchProducts();
        } catch (error: any) {
            toast.show('Error deleting product: ' + error.message, 'error');
        }
    };

    const handleApplyBulkDiscount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkDiscountData.category) {
            toast.show('Please select a category', 'error');
            return;
        }

        setUploading(true);
        try {
            // Bulk update via Supabase
            // 1. Fetch current prices/compare_at for matching products to ensure we don't lose data
            let query = supabase
                .from('products')
                .select('*')
                .eq('merchant_id', user?.id)
                .is('deleted_at', null);

            if (bulkDiscountData.category !== 'all') {
                query = query.eq('category', bulkDiscountData.category);
            }

            const { data: pds, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            if (!pds || pds.length === 0) {
                toast.show('No products found in this category', 'error');
                return;
            }

            const pct = bulkDiscountData.percentage;
            const updates = pds.map(p => {
                const basePrice = (p.compare_at_price && p.compare_at_price > 0) ? p.compare_at_price : p.price;
                const newPrice = Math.round(basePrice * (1 - pct / 100));
                return {
                    ...p,
                    sale_percentage: pct,
                    compare_at_price: basePrice,
                    price: newPrice
                };
            });

            // Upsert with id to trigger updates
            const { error: updateError } = await supabase
                .from('products')
                .upsert(updates);

            if (updateError) throw updateError;

            toast.show(`Applied ${pct}% discount to ${pds.length} products!`, 'success');
            setShowBulkDiscount(false);
            setBulkDiscountData({ category: '', percentage: 0 });
            refetchProducts();
        } catch (error: any) {
            toast.show('Error applying discount: ' + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handlePrintReceipt = (order: any) => {
        setSelectedOrderForReceipt(order);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col pt-4">
            {merchantStatus && merchantStatus !== 'approved' && (
                <div className={`w-full p-4 text-center font-black uppercase italic tracking-tighter text-xs ${
                    merchantStatus === 'pending' ? 'bg-amber-500 text-black' :
                    merchantStatus === 'rejected' ? 'bg-red-500 text-white' :
                    'bg-zinc-800 text-white'
                }`}>
                    {merchantStatus === 'pending' && "🕒 Your account is pending approval. You can manage products but they won't be visible to customers yet."}
                    {merchantStatus === 'rejected' && "❌ Your merchant application was rejected. Please contact support."}
                    {merchantStatus === 'paused' && "⏸️ Your store is temporarily paused. Your products are hidden from the marketplace."}
                </div>
            )}
            <div className="flex flex-1">
            {showQR && <QRScannerPopup onScan={(sku) => { useToastStore.getState().show('Scanned SKU: ' + sku, 'success'); setShowQR(false); }} onClose={() => setShowQR(false)} />}

            <AnimatePresence>
                {/* Tracking Modal */}
                {trackingData.orderId && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" data-lenis-prevent>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background w-full max-w-lg rounded-[3rem] p-10 border border-border shadow-2xl space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Assign Tracking</h2>
                                <button onClick={() => setTrackingData({ ...trackingData, orderId: null })} className="p-2 hover:bg-foreground/5 rounded-full"><X /></button>
                            </div>
                            <form onSubmit={handleAssignTracking} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Courier Service</label>
                                    <select value={trackingData.courier_name} onChange={e => setTrackingData({ ...trackingData, courier_name: e.target.value })} className="w-full glass border-none rounded-2xl p-4 bg-background">
                                        {['TCS', 'Leopard', 'BlueEx', 'M&P', 'PostEx', 'Trax'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Tracking Number / CN</label>
                                    <input required type="text" value={trackingData.tracking_number} onChange={e => setTrackingData({ ...trackingData, tracking_number: e.target.value })} className="w-full glass border-none rounded-2xl p-4" placeholder="Enter tracking number..." />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black italic uppercase">Shipping Proof (Photo)</h3>
                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-foreground/10 rounded-3xl cursor-pointer hover:bg-foreground/5 ${uploading ? 'opacity-50' : ''}`}>
                                        {uploading ? <Loader2 className="w-8 h-8 animate-spin opacity-30" /> : trackingData.shipping_proof_url ? <img src={trackingData.shipping_proof_url} alt="Proof" className="w-full h-full object-cover rounded-3xl" /> : <Plus className="w-8 h-8 opacity-30" />}
                                        <input type="file" accept="image/*" onChange={handleShippingProofUpload} className="hidden" disabled={uploading} />
                                    </label>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!trackingData.tracking_number || uploading || isAssigningTracking} 
                                    className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    {(uploading || isAssigningTracking) && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {isAssigningTracking ? 'Confirming...' : 'Confirm Shipment'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Bulk Discount Modal */}
                {showBulkDiscount && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" data-lenis-prevent>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background w-full max-w-lg rounded-[3rem] p-10 border border-border shadow-2xl space-y-8">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 text-primary rounded-2xl flex items-center justify-center">
                                        <Percent className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Bulk Sale</h2>
                                </div>
                                <button onClick={() => setShowBulkDiscount(false)} className="p-2 hover:bg-foreground/5 rounded-full"><X /></button>
                            </div>
                            
                            <p className="text-sm opacity-50 font-medium">Apply a percentage discount to all products in a specific category. This will update prices based on their original MSRP.</p>

                            <form onSubmit={handleApplyBulkDiscount} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Select Category</label>
                                    <select 
                                        required
                                        value={bulkDiscountData.category} 
                                        onChange={e => setBulkDiscountData({ ...bulkDiscountData, category: e.target.value })} 
                                        className="w-full glass border-none rounded-2xl p-4 bg-background appearance-none"
                                    >
                                        <option value="">Choose a category...</option>
                                        <option value="all">Applied to All Products</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Discount Percentage (%)</label>
                                    <div className="relative">
                                        <input 
                                            required 
                                            type="number" 
                                            min="0" 
                                            max="100"
                                            value={bulkDiscountData.percentage} 
                                            onChange={e => setBulkDiscountData({ ...bulkDiscountData, percentage: parseInt(e.target.value) || 0 })} 
                                            className="w-full glass border-none rounded-2xl p-4 pr-12 font-black italic text-xl" 
                                            placeholder="0" 
                                        />
                                        <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={uploading || !bulkDiscountData.category || bulkDiscountData.percentage < 0} 
                                    className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                                >
                                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        <>
                                            <Tag className="w-5 h-5" />
                                            Apply Discount
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showVoucherForm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" data-lenis-prevent>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background w-full max-w-lg rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-border shadow-2xl space-y-8 overflow-y-auto max-h-[90vh]">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingVoucherId ? 'Edit Voucher' : 'Create Voucher'}</h2>
                                <button onClick={() => { setShowVoucherForm(false); setEditingVoucherId(null); }} className="p-2 hover:bg-foreground/5 rounded-full"><X /></button>
                            </div>
                            <form onSubmit={editingVoucherId ? handleUpdateVoucher : handleCreateVoucher} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-30">Voucher Code</label>
                                    <input required type="text" value={newVoucher.code} onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })} className="w-full glass border-none rounded-2xl p-4 font-black tracking-widest" placeholder="SAVE20..." />
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
                                        <label className="text-[10px] font-black uppercase opacity-30">Usage Limit (Total)</label>
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
                                        <input type="number" value={newVoucher.per_user_limit} onChange={e => setNewVoucher({ ...newVoucher, per_user_limit: parseInt(e.target.value) || 1 })} className="w-full glass border-none rounded-2xl p-4" />
                                    </div>
                                </div>
                                <button type="submit" disabled={vouchersLoading} className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    {vouchersLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingVoucherId ? 'Save Changes' : 'Create & Activate')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile Sidebar Backdrop - tap to close */}
            {showMobileMenu && (
                <div
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setShowMobileMenu(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-[110] w-72 border-r border-foreground/10 p-8 flex flex-col gap-3 bg-background transition-transform duration-500 lg:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-10 px-4">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">
                            {role === 'admin' ? 'ADMIN' : 'MERCHANT'}
                        </h2>
                    </div>
                    <button
                        onClick={() => setShowMobileMenu(false)}
                        className="lg:hidden p-2 rounded-full hover:bg-foreground/10 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {[
                    { id: 'inventory', label: 'Inventory', icon: Package },
                    { id: 'used-inventory', label: 'Used Items', icon: Package },
                    { id: 'orders', label: 'Orders', icon: Truck },
                    { id: 'analytics', icon: BarChart3, label: 'Performance' },
                    { id: 'carts', icon: ShoppingBag, label: 'Customer Carts' },
                    { id: 'banners', icon: ImageIcon, label: 'Banners' },
                    { id: 'vouchers', icon: Tag, label: 'Vouchers' },
                    { id: 'qr', icon: Share2, label: 'Share Store' },
                ].map((tab) => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-2xl hover:scale-105' : 'hover:bg-foreground/5 opacity-40 hover:opacity-100'}`}>
                        <tab.icon className="w-5 h-5" />
                        <span className="font-black text-sm uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
                <button onClick={() => { setActiveTab('profile'); setShowMobileMenu(false); }} className={`flex items-center gap-4 w-full p-4 rounded-3xl transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-foreground/5 opacity-50'}`}>
                    <Settings className="w-5 h-5" />
                    <span className="font-black text-sm uppercase tracking-tighter">Store Profile</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto w-full lg:ml-72">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 sm:mb-12">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowMobileMenu(true)} className="lg:hidden p-3 sm:p-4 glass rounded-xl sm:rounded-2xl">
                            <Menu className="w-5 h-5 sm:w-6 sm:w-6" />
                        </button>
                        <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter">
                            {activeTab === 'add-product' ? 'Add Item' : activeTab === 'edit-product' ? 'Edit Item' : 'Dashboard'}
                        </h1>
                    </div>
                    {activeTab === 'inventory' && (
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowBulkDiscount(true)} 
                                className="bg-foreground/5 hover:bg-foreground/10 p-4 px-8 rounded-2xl font-black italic uppercase tracking-tighter transition-all flex items-center gap-2"
                            >
                                <Percent className="w-4 h-4" />
                                <span className="hidden sm:inline">Bulk Sale</span>
                            </button>
                            <button onClick={() => setActiveTab('add-product')} className="bg-primary text-white p-4 px-8 rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:scale-105 active:scale-95 transition-transform">Add Item</button>
                        </div>
                    )}
                    {activeTab === 'vouchers' && (
                        <button onClick={() => { setEditingVoucherId(null); setShowVoucherForm(true); }} className="bg-primary text-white p-4 px-8 rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:scale-105 active:scale-95 transition-transform">Create Voucher</button>
                    )}
                </div>

                {(activeTab === 'inventory' || activeTab === 'used-inventory') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {productsLoading ? [1, 2, 3].map(i => <div key={i} className="h-64 bg-foreground/5 animate-pulse rounded-[3rem]" />) : 
                        filteredProducts
                            .filter(p => activeTab === 'used-inventory' ? (p as any).is_used : !(p as any).is_used)
                            .map(product => (
                            <div key={product.id} className="bg-card p-8 rounded-[3rem] border border-border space-y-6 group relative hover:shadow-2xl transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-foreground/5">
                                        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full opacity-20">No Image</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            setActiveTab(`edit-product-${product.id}`);
                                        }} className="p-3 bg-foreground/5 rounded-xl hover:bg-foreground/10"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteProduct(product.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-black uppercase opacity-30">{product.category}</p>
                                        {(product as any).is_used && (
                                            <span className="text-[9px] font-black bg-accent text-white px-2 py-0.5 rounded-full animate-pulse">USED</span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter">{product.name}</h3>
                                </div>
                                <div className="flex justify-between pt-4 border-t border-foreground/5">
                                    <div>
                                        <p className="text-xs font-black uppercase opacity-30">Stock</p>
                                        <p className={`text-xl font-black ${product.stock < 0 ? 'text-red-500' : ''}`}>
                                            {product.stock}
                                            {product.stock < 0 && <span className="text-[10px] ml-2 uppercase font-black tracking-tighter">(Error)</span>}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black uppercase opacity-30">Price</p>
                                        <p className="text-2xl font-black text-primary">Rs. {product.price.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'add-product' && (
                    <div className="max-w-4xl mx-auto">
                        <UnifiedProductForm
                            onClose={() => setActiveTab('inventory')}
                            onSuccess={() => {
                                setActiveTab('inventory');
                                refetchProducts();
                            }}
                        />
                    </div>
                )}

                {activeTab.startsWith('edit-product-') && (
                    <div className="max-w-4xl mx-auto">
                        {(() => {
                            const productId = parseInt(activeTab.split('-')[2]);
                            return (
                                <UnifiedProductForm
                                    productId={productId}
                                    onClose={() => setActiveTab('inventory')}
                                    onSuccess={() => {
                                        setActiveTab('inventory');
                                        refetchProducts();
                                    }}
                                />
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest italic">No orders found</div>
                        ) : (
                            filteredOrders.map(order => (
                                <div key={order.id} className="bg-card p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] border border-border flex flex-col lg:flex-row items-start lg:items-center gap-6 sm:gap-10 shadow-lg group">
                                    <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-primary/20 text-primary rounded-2xl sm:rounded-3xl flex items-center justify-center">
                                        <Package className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-xl font-black italic uppercase tracking-tighter">{order.customer_name || order.profiles?.full_name || 'Valued Customer'}</h4>
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{order.status}</span>
                                        </div>
                                        <p className="text-sm opacity-50 font-medium">#{order.order_number || order.id} • {new Date(order.created_at).toLocaleDateString()}</p>
                                        <div className="mt-2 space-y-1.5">
                                            {order.order_items?.map((item: any, i: number) => {
                                                const combo = item.variant_combo || item.combination || {};
                                                const variants = Object.entries(combo).length > 0
                                                    ? Object.entries(combo).map(([k, v]) => `${k}: ${v}`).join(', ')
                                                    : null;
                                                return (
                                                    <div key={i} className="flex flex-col">
                                                        <div className="text-sm font-black opacity-80 flex items-center gap-2">
                                                            <span className="w-5 h-5 flex items-center justify-center bg-foreground/5 rounded-md text-[10px]">{item.quantity}x</span>
                                                            {item.name || item.products?.name}
                                                        </div>
                                                        {variants && (
                                                            <div className="ml-7 text-[10px] font-black uppercase text-primary tracking-wider mt-0.5">
                                                                {variants}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-lg font-black text-primary mt-2">Rs. {Number(order.total_amount).toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 w-full lg:w-auto mt-4 lg:mt-0">
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button onClick={() => handlePrintReceipt(order)} className="flex-1 sm:flex-none p-3 sm:p-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase italic tracking-widest hover:scale-105 active:scale-95 transition-transform">Print</button>
                                            <button onClick={() => setTrackingData({ ...trackingData, orderId: order.id })} className="flex-1 sm:flex-none p-3 sm:p-4 bg-foreground/5 text-foreground rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase italic tracking-widest border border-foreground/10 hover:bg-foreground/10 transition-colors text-center">Tracking</button>
                                            {order.status === 'pending' && (
                                                <div className="relative min-w-[100px] sm:min-w-[120px]">
                                                    {confirmingCancelId === order.id ? (
                                                        <div className="flex gap-1 h-full bg-background p-1 rounded-xl sm:rounded-2xl border border-red-500/20 shadow-xl">
                                                            <button 
                                                                onClick={() => handleCancelOrder(order.id)}
                                                                disabled={cancellingOrderId === order.id}
                                                                className="flex-1 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase italic tracking-wider flex items-center justify-center gap-1 hover:bg-red-600 transition-colors px-2"
                                                            >
                                                                {cancellingOrderId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                                                            </button>
                                                            <button 
                                                                onClick={() => setConfirmingCancelId(null)}
                                                                disabled={cancellingOrderId === order.id}
                                                                className="flex-1 bg-foreground/5 text-foreground rounded-lg text-[9px] font-black uppercase italic tracking-wider hover:bg-foreground/10 transition-colors px-2"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setConfirmingCancelId(order.id)} 
                                                            className="w-full p-3 sm:p-4 bg-red-500/10 text-red-500 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase italic tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 sm:gap-2 bg-foreground/5 p-1 sm:p-2 rounded-[1.5rem] sm:rounded-[2rem] w-full sm:w-auto overflow-x-auto no-scrollbar">
                                            {[
                                                { id: 'pending', icon: Clock, color: 'bg-amber-500' },
                                                { id: 'shipped', icon: Truck, color: 'bg-blue-500' },
                                                { id: 'delivered', icon: CheckCircle2, color: 'bg-green-500' }
                                            ].map(s => {
                                                const Icon = s.icon;
                                                const isActive = order.status === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleUpdateStatus(order.id, s.id)}
                                                        className={`group relative flex items-center justify-center gap-2 p-3 sm:px-6 rounded-xl sm:rounded-2xl transition-all flex-1 sm:flex-none ${isActive ? `${s.color} text-white shadow-lg` : 'hover:bg-foreground/10 opacity-40 hover:opacity-100'}`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tighter ${isActive ? 'block' : 'hidden group-hover:block sm:group-hover:block'}`}>{s.id}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'carts' && (
                    <div className="space-y-6">
                        {cartsLoading ? (
                            [1, 2].map(i => <div key={i} className="h-48 bg-foreground/5 animate-pulse rounded-[3rem]" />)
                        ) : carts.length === 0 ? (
                            <div className="text-center py-20 bg-card rounded-[3rem] border border-border">
                                <ShoppingBag className="w-16 h-16 opacity-10 mx-auto mb-4" />
                                <h3 className="text-xl font-black opacity-30 uppercase tracking-widest italic">No customer carts found</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {carts.map((cart, idx) => {
                                    const timeDiff = new Date().getTime() - cart.lastUpdated.getTime();
                                    const isAbandoned = timeDiff > 10 * 60 * 1000; // 10 minutes

                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`bg-card p-10 rounded-[3rem] border-2 transition-all ${isAbandoned ? 'border-amber-500/20 shadow-amber-500/5' : 'border-border'}`}
                                        >
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-xl text-primary">
                                                        {cart.user?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black italic uppercase tracking-tighter">{cart.user?.full_name || 'Anonymous Customer'}</h4>
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">{cart.user?.email || 'No Email'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock className="w-3 h-3 opacity-30" />
                                                            <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">
                                                                Active {new Date(cart.lastUpdated).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isAbandoned && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="px-4 py-1.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                                            Abandoned
                                                        </span>
                                                        <p className="text-[8px] font-bold opacity-40 uppercase mt-1">{" > "} 10 mins inactive</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 bg-foreground/[0.02] p-6 rounded-[2rem] border border-foreground/5 mb-6">
                                                {cart.items.map((item: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-foreground/5 flex-shrink-0">
                                                                {item.products.image_url
                                                                    ? <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                                                                    : <span className="flex items-center justify-center h-full text-[10px] opacity-20">No Img</span>}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold opacity-60">{item.products.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black bg-foreground/5 px-2 py-0.5 rounded-full">{item.quantity}x</span>
                                                                    {item.variant_combo && Object.entries(item.variant_combo).length > 0 && (
                                                                        <span className="text-[10px] text-primary font-bold uppercase">
                                                                            {Object.entries(item.variant_combo).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-black">Rs. {(item.products.price * item.quantity).toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center px-4">
                                                <div className="flex flex-col">
                                                    <label className="text-[8px] font-black uppercase tracking-widest opacity-30">Your Share</label>
                                                    <p className="text-2xl font-black italic text-primary">Rs. {cart.total.toLocaleString()}</p>
                                                </div>
                                                <div className="h-10 w-px bg-foreground/5" />
                                                <div className="flex flex-col items-end">
                                                    <label className="text-[8px] font-black uppercase tracking-widest opacity-30">Status</label>
                                                    <p className={`text-xs font-black uppercase italic ${isAbandoned ? 'text-amber-500' : 'text-green-500'}`}>
                                                        {isAbandoned ? 'Incomplete' : 'Active'}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'vouchers' && (
                    <div className="space-y-8 sm:space-y-12">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-foreground/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-foreground/5 gap-6">
                            <div className="max-w-md">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary">Merchant Vouchers</h3>
                                <p className="text-sm opacity-50">Create and manage vouchers specific to your store's products.</p>
                            </div>
                            <button 
                                onClick={() => { setEditingVoucherId(null); setShowVoucherForm(true); }} 
                                className="w-full sm:w-auto bg-primary text-white p-4 px-8 rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:scale-105 active:scale-95 transition-transform text-center"
                            >
                                Create New Voucher
                            </button>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {merchantVouchers.map(v => {
                                const isExpired = v.expiry_date && new Date(v.expiry_date) < new Date();
                                const isLimitReached = v.usage_limit && v.used_count >= v.usage_limit;
                                return (
                                    <div key={v.id} className="bg-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-border space-y-6 sm:space-y-8 relative overflow-hidden group shadow-xl">                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30 mb-1">Coupon Code</p>
                                                <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-primary">{v.code}</h3>
                                                <p className="text-[8px] font-bold uppercase opacity-30 mt-1 italic">Merchant Store Voucher</p>
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
                                                    className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all"
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

                                        <div className={`px-4 py-1.5 rounded-full inline-block font-black text-[10px] uppercase tracking-widest ${v.is_active && !isExpired && !isLimitReached ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : v.is_active ? 'Active' : 'Inactive'}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-foreground/5">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30">Benefit</p>
                                                <p className="text-2xl font-black">{v.type === 'percentage' ? `${v.value}%` : `Rs. ${v.value}`}</p>
                                                {v.max_discount && <p className="text-[10px] font-black text-primary italic mt-1 uppercase">Max Rs. {v.max_discount}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-30">Volume</p>
                                                <p className="text-2xl font-black">{v.used_count} / {v.usage_limit || '∞'}</p>
                                                <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-tighter">Per User Limit: {v.per_user_limit || 1}</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-foreground/5 space-y-3">
                                            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest opacity-40">
                                                <span>Minimum Order</span>
                                                <span>Rs. {v.min_spend}</span>
                                            </div>
                                            {v.expiry_date && (
                                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest opacity-40">
                                                    <span>Valid Until</span>
                                                    <span>{new Date(v.expiry_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => fetchVoucherStats(v.id)}
                                            className="w-full py-5 bg-foreground/5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-foreground/10 transition-all border border-foreground/5"
                                        >
                                            View Usage Analytics
                                        </button>
                                    </div>
                                );
                            })}
                         </div>

                         {selectedVoucherStats.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-border space-y-8">
                                 <div className="flex justify-between items-center">
                                     <h3 className="text-2xl font-black italic uppercase tracking-tighter italic">Persons who availed</h3>
                                     <button onClick={() => setSelectedVoucherStats([])} className="text-xs font-black uppercase tracking-widest text-primary">Close List</button>
                                 </div>
                                 <div className="space-y-4">
                                     {selectedVoucherStats.map((u, i) => (
                                         <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-foreground/5 rounded-[2rem] border border-foreground/5 gap-4">
                                             <div className="flex items-center gap-4">
                                                 <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center font-black">
                                                     {u.profiles?.full_name?.[0] || 'U'}
                                                 </div>
                                                 <div>
                                                     <p className="font-black">{u.profiles?.full_name || 'Customer'}</p>
                                                     <p className="text-[10px] opacity-50 font-medium">{u.profiles?.email}</p>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 <p className="text-sm font-black text-primary">Order #{u.orders?.order_number || u.order_id}</p>
                                                 <p className="text-[10px] opacity-30 font-bold uppercase">{new Date(u.used_at).toLocaleDateString()}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                              </motion.div>
                         )}
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom duration-500">
                        <div className="flex flex-col xl:flex-row gap-10">
                            <div className="w-full xl:w-1/3 bg-card p-10 rounded-[3rem] border border-border space-y-8">
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Request Banner</h3>
                                    <p className="text-sm opacity-50 font-medium mt-2">Submit a banner for approval. It will be shown on the homepage once an admin approves it.</p>
                                </div>
                                <form onSubmit={handleRequestBanner} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Banner Image</label>
                                        <button
                                            type="button"
                                            onClick={() => openUploadWidget((url) => setNewBanner(p => ({ ...p, image_url: url })))}
                                            className="w-full aspect-[21/7] rounded-[2rem] border-2 border-dashed border-foreground/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all bg-foreground/[0.02] overflow-hidden group"
                                        >
                                            {newBanner.image_url ? (
                                                <img src={newBanner.image_url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                                        <Upload className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-xs font-black opacity-30 uppercase">Click to upload image</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Target Link (Optional)</label>
                                        <div className="relative">
                                            <input type="url" value={newBanner.link_url} onChange={e => setNewBanner(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." className="w-full glass border-none rounded-2xl p-4 pl-12 font-bold text-sm bg-background" />
                                            <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Starts At</label>
                                            <input type="datetime-local" required value={newBanner.start_at} onChange={e => setNewBanner(p => ({ ...p, start_at: e.target.value }))} className="w-full glass border-none rounded-2xl p-4 font-black uppercase text-[10px] bg-background" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Ends At</label>
                                            <input type="datetime-local" value={newBanner.end_at} onChange={e => setNewBanner(p => ({ ...p, end_at: e.target.value }))} className="w-full glass border-none rounded-2xl p-4 font-black uppercase text-[10px] bg-background" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={bannersLoading || !newBanner.image_url} className="w-full py-5 bg-primary text-white rounded-[2rem] font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                                        {bannersLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                        Submit Request
                                    </button>
                                </form>
                            </div>
                            <div className="w-full xl:w-2/3 space-y-8">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Your Banner Requests</h3>
                                <div className="grid gap-6">
                                    {banners.length === 0 ? (
                                        <div className="bg-card p-20 text-center rounded-[3rem] border border-dashed border-border"><ImageIcon className="w-12 h-12 opacity-20 mx-auto" /><p className="text-xl font-black italic uppercase opacity-20 tracking-widest mt-4">No requests yet</p></div>
                                    ) : banners.map(banner => (
                                        <div key={banner.id} className="bg-card p-8 rounded-[3rem] border border-border flex flex-col md:flex-row gap-8 relative group overflow-hidden">
                                            <div className="w-full md:w-56 aspect-[21/7] md:aspect-[16/7] rounded-2xl overflow-hidden bg-foreground/5 shadow-inner flex-shrink-0"><img src={banner.image_url} alt="" className="w-full h-full object-cover" /></div>
                                            <div className="flex-grow space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${banner.status === 'approved' ? 'bg-green-500/10 text-green-500' : banner.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{banner.status}</span>
                                                    <span className="text-[10px] font-black uppercase opacity-30">Sent {new Date(banner.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-1"><p className="text-[10px] font-black uppercase opacity-30 tracking-widest">Display Period</p><p className="text-sm font-bold truncate">{new Date(banner.start_at).toLocaleDateString()} {banner.end_at ? ` → ${new Date(banner.end_at).toLocaleDateString()}` : ' ∞'}</p></div>
                                                </div>
                                                {banner.admin_comment && <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10"><p className="text-[10px] font-black uppercase text-red-500 mb-1">Admin Feedback</p><p className="text-xs font-medium opacity-70 italic text-foreground">"{banner.admin_comment}"</p></div>}
                                            </div>
                                            <button onClick={() => handleDeleteBanner(banner.id)} className="absolute top-6 right-6 p-3 bg-red-500/10 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Sales', value: `Rs. ${getMerchantStats().deliveredRevenue.toLocaleString()}`, sub: 'Completed Revenue', icon: CheckCircle2, color: 'text-green-500' },
                                { label: 'Pending Payment', value: `Rs. ${getMerchantStats().pendingRevenue.toLocaleString()}`, sub: 'Orders in Pipeline', icon: Clock, color: 'text-amber-500' },
                                { label: 'Active Orders', value: getMerchantStats().totalOrders - (orders.filter(o => o.status === 'delivered').length), sub: 'Currently Processing', icon: Package, color: 'text-primary' },
                                { label: 'Success Rate', value: '100%', sub: 'Customer Satisfaction', icon: BarChart3, color: 'text-blue-500' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-card p-8 rounded-[3rem] border border-border shadow-lg space-y-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">{stat.label}</p>
                                        <p className="text-3xl font-black italic tracking-tighter">{stat.value}</p>
                                        <p className="text-xs opacity-50 mt-1">{stat.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-card p-10 rounded-[3rem] border border-border shadow-lg">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Business Insights</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="p-8 rounded-[2rem] bg-foreground/5 border border-foreground/5">
                                    <h4 className="font-black uppercase tracking-widest text-xs opacity-50 mb-4">Store Performance</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold opacity-60">Delivered Orders</span>
                                            <span className="font-black text-green-500">{orders.filter(o => o.status === 'delivered').length}</span>
                                        </div>
                                        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(orders.filter(o => o.status === 'delivered').length / (orders.length || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-foreground/5 border border-foreground/5">
                                    <h4 className="font-black uppercase tracking-widest text-xs opacity-50 mb-4">Logistics Summary</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold opacity-60">Handed to Courier</span>
                                            <span className="font-black text-blue-500">{orders.filter(o => o.status === 'shipped').length}</span>
                                        </div>
                                        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(orders.filter(o => o.status === 'shipped').length / (orders.length || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                )}
                {/* QR & SHARE STORE TAB */}
                {activeTab === 'qr' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter italic uppercase">Share Store</h1>
                                </div>
                                <p className="text-lg font-bold text-primary flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                    Your store is live!
                                    <span className="opacity-40 text-foreground font-medium text-sm ml-2">Customers can now visit your store at:</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setActiveTab('qr')} 
                                    className="p-4 bg-foreground/5 hover:bg-foreground/10 rounded-2xl transition-all border border-foreground/5 group"
                                    title="View QR Code"
                                >
                                    <QrCode className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                </button>
                            </div>
                        </div>

                        {merchantStatus !== 'approved' ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-10 text-center space-y-4">
                                <QrCode className="w-12 h-12 text-amber-500 mx-auto opacity-60" />
                                <p className="font-black uppercase tracking-widest text-amber-500">Store Not Yet Approved</p>
                                <p className="text-sm opacity-50">Your QR code and store link will be available once your store is approved by admin.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                                {/* QR Code Card */}
                                <div className="bg-white p-10 sm:p-14 rounded-[3rem] border border-black/5 shadow-2xl flex flex-col items-center justify-center text-center space-y-8 h-full">
                                    <div className="relative group">
                                        <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white p-4 rounded-[3rem] shadow-[0_20px_50_rgba(0,0,0,0.1)] border border-black/5 relative overflow-hidden flex items-center justify-center">
                                            {qrCodeUrl ? (
                                                <img src={qrCodeUrl} alt="Store QR Code" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                                                    <QrCode className="w-16 h-16 mb-3" />
                                                    <p className="text-[10px] font-black uppercase">Generating...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">Store QR Code</h3>
                                        <p className="text-sm opacity-50 font-medium leading-relaxed max-w-[220px] mx-auto">Customers scan this to visit your store directly.</p>
                                    </div>
                                    {qrCodeUrl && (
                                        <a
                                            href={qrCodeUrl}
                                            download="store-qr.png"
                                            className="w-full flex items-center justify-center gap-3 py-4 bg-foreground/5 hover:bg-foreground/10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-foreground/5 mt-4"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download QR
                                        </a>
                                    )}
                                </div>

                                {/* Link Sharing Card */}
                                <div className="bg-primary/5 p-8 sm:p-12 rounded-[3rem] border border-primary/10 shadow-lg flex flex-col justify-center space-y-8 relative overflow-hidden">
                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />

                                    <div className="space-y-4 relative">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-primary text-white rounded-2xl">
                                                <Share2 className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Your Store Link</h3>
                                        </div>
                                        <p className="text-sm opacity-60 font-medium">Share this link on WhatsApp, Instagram, or anywhere to drive customers directly to your store.</p>
                                    </div>

                                    <div className="space-y-4 relative">
                                        <div className="w-full bg-background/60 border border-foreground/10 rounded-2xl p-4 px-6 pr-12 font-mono text-sm opacity-70 break-all relative group/link">
                                            {import.meta.env.VITE_SITE_URL || window.location.origin}/#store/{storeSlug}
                                            <QrCode className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-hover/link:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${import.meta.env.VITE_SITE_URL || window.location.origin}/#store/${storeSlug}`);
                                                    toast.show('Store link copied!', 'success');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-black px-6 py-4 rounded-2xl uppercase italic tracking-tighter shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy Link
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
                                                    const shareUrl = `${siteUrl}/#store/${storeSlug}`;
                                                    if (navigator.share) {
                                                        try { await navigator.share({ title: 'Visit my store!', url: shareUrl }); } catch {}
                                                    } else {
                                                        navigator.clipboard.writeText(shareUrl);
                                                        toast.show('Link copied!', 'success');
                                                    }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 bg-foreground/10 hover:bg-foreground/20 font-black px-6 py-4 rounded-2xl uppercase italic tracking-tighter text-sm transition-all"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                Share
                                            </button>
                                        </div>
                                    </div>

                                    {/* WhatsApp Quick Share */}
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(`Check out my store on Tarzify! ${import.meta.env.VITE_SITE_URL || window.location.origin}/#store/${storeSlug}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20 relative"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        Share on WhatsApp
                                    </a>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STORE PROFILE TAB */}
                {activeTab === 'profile' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter italic uppercase">Store Profile</h1>
                            <p className="opacity-50 mt-2 font-medium">Customize your store's appearance and contact details.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <form onSubmit={handleUpdateStoreProfile} className="glass p-10 rounded-[3rem] border-white/5 space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Store Banner (Poster)</label>
                                        <div 
                                            onClick={() => openUploadWidget((url) => setStoreProfile(prev => ({ ...prev, banner_url: url })))}
                                            className="relative h-64 bg-foreground/5 rounded-3xl border-2 border-dashed border-foreground/10 flex items-center justify-center cursor-pointer hover:bg-foreground/10 transition-all overflow-hidden"
                                        >
                                            {storeProfile.banner_url ? (
                                                <img src={storeProfile.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center space-y-2">
                                                    <Upload className="w-8 h-8 mx-auto opacity-30" />
                                                    <p className="text-[10px] font-black uppercase opacity-30">Click to upload poster</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase opacity-30">Store Logo</label>
                                            <div 
                                                onClick={() => openUploadWidget((url) => setStoreProfile(prev => ({ ...prev, logo_url: url })))}
                                                className="relative aspect-square bg-foreground/5 rounded-3xl border-2 border-dashed border-foreground/10 flex items-center justify-center cursor-pointer hover:bg-foreground/10 transition-all overflow-hidden"
                                            >
                                                {storeProfile.logo_url ? (
                                                    <img src={storeProfile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Upload className="w-6 h-6 opacity-30" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase opacity-30">Store Name</label>
                                                <input 
                                                    type="text" 
                                                    value={storeProfile.store_name} 
                                                    onChange={e => setStoreProfile(prev => ({ ...prev, store_name: e.target.value }))}
                                                    className="w-full glass border-none rounded-2xl p-4 font-black text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase opacity-30">Contact Number</label>
                                                <input 
                                                    type="text" 
                                                    value={storeProfile.contact_number} 
                                                    onChange={e => setStoreProfile(prev => ({ ...prev, contact_number: e.target.value }))}
                                                    className="w-full glass border-none rounded-2xl p-4 font-black text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase opacity-30">Business Address</label>
                                        <textarea 
                                            value={storeProfile.business_address} 
                                            onChange={e => setStoreProfile(prev => ({ ...prev, business_address: e.target.value }))}
                                            className="w-full glass border-none rounded-2xl p-4 font-black text-sm h-32 resize-none"
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={uploading}
                                        className="w-full py-5 bg-primary text-white rounded-[2rem] font-black uppercase italic tracking-tighter shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {uploading ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-8">
                                <h3 className="text-xl font-black italic uppercase italic">Live Preview</h3>
                                {/* Mock preview of the store header */}
                                <div className="space-y-0">
                                    <div className="relative h-48 bg-foreground/5 rounded-t-[3rem] overflow-hidden border border-foreground/5 shadow-xl">
                                        {storeProfile.banner_url ? (
                                            <img src={storeProfile.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                <ImageIcon className="w-10 h-10 opacity-10" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    </div>
                                    <div className="bg-card p-6 rounded-b-[3rem] border border-t-0 border-foreground/5 relative">
                                        <div className="flex items-end gap-4 -mt-16 relative z-10 ms-4">
                                            <div className="w-20 h-20 rounded-[2rem] bg-background border-4 border-background shadow-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
                                                {storeProfile.logo_url ? (
                                                    <img src={storeProfile.logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                                                        <Store className="w-8 h-8 opacity-40" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pb-2">
                                                <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none">{storeProfile.store_name || 'Your Store Name'}</h4>
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">@{storeSlug || 'your-handle'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] opacity-50 font-medium px-4">This is a preview of your store header. A high-quality banner (1920x600) and clear logo (500x500) will give your store a premium feel.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
            {selectedOrderForReceipt && (
                <ReceiptModal order={selectedOrderForReceipt} onClose={() => setSelectedOrderForReceipt(null)} />
            )}
            </div>
        </div>
    );
};
