import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProducts } from '../hooks/useProducts';
import { useCartStore } from '../stores/useCartStore';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { ShoppingBag, ArrowLeft, Star, Heart, Share2, ShieldCheck, Truck, RefreshCcw, MessageCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useToastStore } from '../stores/useToastStore';
import { generateProductURL } from '../lib/slugify';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailSkeleton } from '../components/Skeleton';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

interface Review {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user_id: string;
    order_id: number;
    product_id: number;
    image_urls?: string[];
    profiles?: { full_name: string } | null;
}

export const ProductDetails = ({ productId, storeSlug, onBack, onFly }: { productId: number; storeSlug?: string | null; onBack: () => void; onFly: (e: any) => void }) => {
    const { products, loading: productsLoading } = useProducts();
    const { user } = useAuthStore();
    const addItem = useCartStore((state) => state.addItem);
    const product = products.find(p => String(p.id) === String(productId));

    // Scroll to top when product detail page opens
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [productId]);

    // Track viewport for suggestion card width (matches home screen grid)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    // 3 per row mobile, 4 per row desktop — same gap (8px) as home screen
    const cardWidth = isMobile ? 'calc(33.333% - 6px)' : 'calc(25% - 9px)';

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedReviewImage, setSelectedReviewImage] = useState<string | null>(null);

    // Advanced Daraz-style Hover Zoom state
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

    // Variants State
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [activeVariantData, setActiveVariantData] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Initialize default variants to the first option of each attribute
    useEffect(() => {
        if (product?.dynamic_attributes) {
            const defaults: Record<string, string> = {};
            Object.entries(product.dynamic_attributes).forEach(([attr, options]) => {
                if (Array.isArray(options) && options.length > 0) {
                    defaults[attr] = options[0];
                }
            });
            setSelectedVariants(defaults);
        }
    }, [product]);

    // Sync active variant data (price, stock, image) whenever selectedVariants change
    useEffect(() => {
        if (!product || !product.pricing_matrix || Object.keys(selectedVariants).length === 0) {
            if (product?.dynamic_attributes && Object.keys(product.dynamic_attributes).length > 0) {
                console.log("Variants Debug: Missing core data", { product: !!product, matrix: !!product?.pricing_matrix, selectionCount: Object.keys(selectedVariants).length });
            }
            setActiveVariantData(null);
            return;
        }

        console.log("Variants Debug: Matching combo...", selectedVariants);
        const match = product.pricing_matrix.find((row: any) => {
            const combo = row.variant_combo || row.combination;
            if (!combo) return false;
            // Case-insensitive check for every key in dynamic_attributes
            return Object.keys(product.dynamic_attributes || {}).every(key => {
                const comboVal = Object.entries(combo).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
                return String(comboVal).toLowerCase() === String(selectedVariants[key] || '').toLowerCase();
            });
        });

        if (match) {
            console.log("Variants Debug: Match found ->", match);
            setActiveVariantData(match);
            if (match.image_url) {
                setActiveImage(match.image_url);
            }
        } else {
            console.log("Variants Debug: No match for combination", selectedVariants);
            setActiveVariantData(null);
        }
    }, [selectedVariants, product?.pricing_matrix, product?.dynamic_attributes]);


    const fetchReviews = useCallback(async () => {
        if (!productId) return;
        setLoadingReviews(true);
        try {
            // Step 1: Fetch reviews only
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (reviewsError) throw reviewsError;

            // Show reviews immediately (even without names) to break the "loading" hang
            setReviews(reviewsData || []);
            setLoadingReviews(false);

            if (!reviewsData || reviewsData.length === 0) return;

            // Step 2: Fetch profiles for these users in background
            const userIds = Array.from(new Set(reviewsData.map(r => r.user_id)));
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);

            if (profilesError) {
                console.warn('Error fetching profiles:', profilesError);
                return;
            }

            // Step 3: Mix in the names
            const profileMap = (profilesData || []).reduce((acc: any, p) => {
                acc[p.id] = p.full_name;
                return acc;
            }, {});

            setReviews(prev => prev.map(r => ({
                ...r,
                profiles: profileMap[r.user_id] ? { full_name: profileMap[r.user_id] } : null
            })));
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setReviews([]); // Clear on error to stop spinner
        } finally {
            setLoadingReviews(false);
        }
    }, [productId]);

    useEffect(() => {
        if (productId) {
            fetchReviews();
        }
    }, [productId, fetchReviews]);

    if (productsLoading || !product) {
        return <ProductDetailSkeleton />;
    }

    // --- JSON-LD Structured Data for Google Search ---
    useEffect(() => {
        if (!product) return;

        const avgRatingNum = reviews.length > 0
            ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            : null;

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description || `Shop ${product.name} at Tarzify.`,
            image: product.image_urls?.length ? product.image_urls : [product.image_url],
            sku: product.sku,
            brand: { '@type': 'Brand', name: 'Tarzify' },
            ...(avgRatingNum !== null && {
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: avgRatingNum.toFixed(1),
                    reviewCount: reviews.length,
                    bestRating: 5,
                    worstRating: 1
                }
            }),
            ...(reviews.length > 0 && {
                review: reviews.slice(0, 5).map(r => ({
                    '@type': 'Review',
                    reviewRating: {
                        '@type': 'Rating',
                        ratingValue: r.rating,
                        bestRating: 5,
                        worstRating: 1
                    },
                    author: {
                        '@type': 'Person',
                        name: r.profiles?.full_name || 'Verified Buyer'
                    },
                    reviewBody: r.comment || '',
                    datePublished: r.created_at.split('T')[0]
                }))
            }),
            offers: {
                '@type': 'Offer',
                url: `https://tarzify.com/#${generateProductURL(product.name, product.sku)}`,
                priceCurrency: 'PKR',
                price: product.price,
                availability: product.stock > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
                seller: { '@type': 'Organization', name: 'Tarzify' },
                shippingDetails: {
                    '@type': 'OfferShippingDetails',
                    shippingRate: {
                        '@type': 'MonetaryAmount',
                        value: product.is_free_delivery ? '0' : '200',
                        currency: 'PKR'
                    },
                    shippingDestination: {
                        '@type': 'DefinedRegion',
                        addressCountry: 'PK'
                    },
                    deliveryTime: {
                        '@type': 'ShippingDeliveryTime',
                        handlingTime: {
                            '@type': 'QuantitativeValue',
                            minValue: 1,
                            maxValue: 2,
                            unitCode: 'DAY'
                        },
                        transitTime: {
                            '@type': 'QuantitativeValue',
                            minValue: 2,
                            maxValue: 5,
                            unitCode: 'DAY'
                        }
                    }
                },
                hasMerchantReturnPolicy: {
                    '@type': 'MerchantReturnPolicy',
                    applicableCountry: 'PK',
                    returnPolicyCategory: product.is_returnable
                        ? 'https://schema.org/MerchantReturnFiniteReturnWindow'
                        : 'https://schema.org/MerchantReturnNotPermitted',
                    merchantReturnDays: product.is_returnable ? 7 : undefined,
                    returnMethod: product.is_returnable
                        ? 'https://schema.org/ReturnByMail'
                        : undefined,
                    returnFees: product.is_returnable
                        ? 'https://schema.org/FreeReturn'
                        : undefined
                }
            }
        };

        // Inject or replace the JSON-LD script tag
        const existing = document.getElementById('product-jsonld');
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = 'product-jsonld';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(jsonLd);
        document.head.appendChild(script);

        return () => {
            document.getElementById('product-jsonld')?.remove();
        };
    }, [product, reviews]);


    const toast = useToastStore();


    const [activeImage, setActiveImage] = useState(product?.image_url || '');

    useEffect(() => {
        if (product) setActiveImage(product.image_url);
    }, [product]);

    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

    const handleImageError = (src: string) => {
        setBrokenImages(prev => new Set(prev).add(src));
    };

    const getImageUrl = (src: string) => {
        return src && brokenImages.has(src) ? PLACEHOLDER_IMAGE : src;
    };

    if (productsLoading && !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="font-black uppercase tracking-tighter opacity-30 italic">Loading Product Details...</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
                <div className="w-24 h-24 bg-foreground/5 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-12 h-12 opacity-20" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">Product Not Found</h2>
                <p className="opacity-50 max-w-md">Sorry, we couldn't find the product you're looking for. It might have been removed or the link is incorrect.</p>
                <button onClick={onBack} className="flex items-center gap-2 glass px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Store
                </button>
            </div>
        );
    }

    const images = product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : [product.image_url];

    const handleNextImage = () => {
        const currentIndex = images.indexOf(activeImage);
        const nextIndex = (currentIndex + 1) % images.length;
        setActiveImage(images[nextIndex]);
    };

    const handlePrevImage = () => {
        const currentIndex = images.indexOf(activeImage);
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        setActiveImage(images[prevIndex]);
    };

    const avgRating = product?.avg_rating
        ? product.avg_rating.toFixed(1)
        : '0.0';

    const totalReviewsCount = product?.total_reviews || 0;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setZoomPos({ x, y });
    };

    const displayPrice = activeVariantData?.price || product.price;
    const displayStock = activeVariantData?.stock ?? product.stock;

    const handleQuantityChange = (change: number) => {
        const newQty = quantity + change;
        if (newQty >= 1 && newQty <= Math.max(displayStock, 1)) {
            setQuantity(newQty);
        } else if (newQty > Math.max(displayStock, 1)) {
            toast.show(`Only ${displayStock} items available.`, 'info');
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/#${generateProductURL(product.name, product.sku)}`;
        const shareData = {
            title: product?.name,
            text: `Check out ${product?.name} on Tarzify!`,
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.show('Link copied to clipboard!', 'success');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-24 px-4 sm:px-6">
            <SEO
                title={product.name}
                description={product.description?.substring(0, 160) || `Buy ${product.name} at Tarzify.`}
                image={product.image_url}
                url={`https://tarzify.com/#${generateProductURL(product.name, product.sku)}`}
                type="product"
            />
            <div className="max-w-7xl mx-auto">
                <button onClick={onBack} className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity mb-6 sm:mb-8 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Store
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-16 sm:mb-24">
                    {/* Image Section */}
                    <div className="space-y-4 relative">
                        {/* Side window Zoom container - hidden by default, shown on hover lg+ */}
                        {isHoveringImage && !isMobile && (
                            <div className="hidden lg:block absolute left-full top-0 ml-8 w-full h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl z-[100] border border-gray-100 pointer-events-none">
                                {activeImage && (
                                    <div
                                        className="w-full h-full object-cover"
                                        style={{
                                            backgroundImage: `url(${getImageUrl(activeImage)})`,
                                            backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                                            backgroundSize: '250%',
                                            backgroundRepeat: 'no-repeat'
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        <div
                            onMouseMove={handleMouseMove}
                            onMouseEnter={() => setIsHoveringImage(true)}
                            onMouseLeave={() => setIsHoveringImage(false)}
                            className="aspect-square glass rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden relative group shadow-2xl bg-white dark:bg-[#0a0a0b] flex items-center justify-center p-2 sm:p-6 border border-foreground/5 cursor-crosshair"
                        >
                            {activeImage && (
                                <img
                                    src={getImageUrl(activeImage)}
                                    alt={product.name}
                                    onError={() => handleImageError(activeImage)}
                                    className="w-full h-full object-contain transition-opacity duration-300 rounded-[1.5rem] sm:rounded-[2.5rem]"
                                    style={{
                                        // Slight opacity drop on hover so the right slider pops more
                                        opacity: isHoveringImage && !isMobile ? 0.9 : 1
                                    }}
                                />
                            )}


                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 glass rounded-full hover:scale-110 transition-transform z-20 opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 glass rounded-full hover:scale-110 transition-transform z-20 opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                </>
                            )}

                            <button className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 sm:p-4 glass rounded-full hover:scale-110 transition-transform z-20">
                                <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-primary scale-95' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    >
                                        {img && (
                                            <img
                                                src={getImageUrl(img)}
                                                alt={`${product.name} ${idx + 1}`}
                                                onError={() => handleImageError(img)}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">{product.category}</span>
                                    {product.is_used && (
                                        <span className="px-3 py-1 bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse whitespace-nowrap">Second Hand / Used</span>
                                    )}
                                    <div className="flex items-center gap-1 text-yellow-500 scale-90 sm:scale-100 origin-left ml-auto sm:ml-0">
                                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                                        <span className="text-[10px] sm:text-xs font-black text-foreground">{avgRating} ({totalReviewsCount} Reviews)</span>
                                    </div>
                                </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold tracking-tight leading-tight">{product.name}</h1>
                                <div className="flex flex-col gap-1 sm:gap-2">
                                    <div className="flex items-baseline gap-4">
                                        <span className="text-5xl font-black italic tracking-tighter text-primary">Rs. {displayPrice.toLocaleString()}</span>
                                        {product.compare_at_price && product.compare_at_price > displayPrice && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg sm:text-xl text-foreground/30 line-through font-bold">
                                                    Rs. {product.compare_at_price.toLocaleString()}
                                                </span>
                                                <span className="px-2 py-0.5 bg-[#f85606] text-white text-[10px] font-bold rounded-sm">
                                                    -{Math.round(((product.compare_at_price - displayPrice) / product.compare_at_price) * 100)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {product.is_free_delivery && (
                                        <div className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 w-fit">
                                            <Truck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Free Express Delivery</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-yellow-500">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${i < Math.round(Number(avgRating)) ? 'fill-current' : 'opacity-20'}`} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-black text-foreground/40 mt-0.5">({avgRating} Average / {totalReviewsCount} reviews)</span>
                                    </div>
                                </div>
                        </div>

                        <p className="text-lg opacity-60 leading-relaxed font-medium">
                            {product.description || `Experience the pinnacle of premium design and performance. This ${product.category.toLowerCase()} is meticulously crafted to meet the highest standards of quality and durability.`}
                        </p>

                        {product.is_used && product.condition_note && (
                            <div className="p-6 bg-accent/5 border border-accent/20 rounded-[2rem] space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Condition Note</p>
                                <p className="text-sm font-bold opacity-80 leading-relaxed italic">"{product.condition_note}"</p>
                            </div>
                        )}

                        {/* Variants UI */}
                        {product.dynamic_attributes && Object.keys(product.dynamic_attributes).length > 0 && (
                            <div className="space-y-6 pt-6 border-t border-foreground/5">
                                {Object.entries(product.dynamic_attributes).map(([attrName, options]) => {
                                    if (!Array.isArray(options) || options.length === 0) return null;
                                    const isColorAttr = attrName.toLowerCase().includes('color') || attrName.toLowerCase().includes('colour');

                                    // Helper: find variant image for a specific option
                                    const getVariantImage = (optionValue: string) => {
                                        if (!product.pricing_matrix) return null;
                                        const row = product.pricing_matrix.find((r: any) => {
                                            const combo = r.variant_combo || r.combination;
                                            // Case-insensitive match for both key and value
                                            return Object.entries(combo).some(([k, v]) =>
                                                k.toLowerCase() === attrName.toLowerCase() &&
                                                String(v).toLowerCase() === optionValue.toLowerCase()
                                            );
                                        });
                                        return row?.image_url || null;
                                    };

                                    // Helper: get stock for a specific option
                                    const getVariantStock = (optionValue: string) => {
                                        if (!product.pricing_matrix) return null;
                                        const matchingRows = product.pricing_matrix.filter((r: any) => {
                                            const combo = r.variant_combo || r.combination;
                                            if (!combo) return false;
                                            return Object.entries(combo).some(([k, v]) =>
                                                k.toLowerCase() === attrName.toLowerCase() &&
                                                String(v).toLowerCase() === optionValue.toLowerCase()
                                            );
                                        });
                                        if (matchingRows.length === 0) return null;
                                        return matchingRows.reduce((sum: number, r: any) => sum + (Number(r.stock) || 0), 0);
                                    };

                                    return (
                                        <div key={attrName} className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center justify-between">
                                                {attrName}
                                                <span className="text-primary font-bold lowercase">{selectedVariants[attrName]}</span>
                                            </label>
                                            <div className="flex flex-wrap gap-3">
                                                {options.map((opt: string) => {
                                                    const isSelected = selectedVariants[attrName] === opt;
                                                    const variantImg = isColorAttr ? getVariantImage(opt) : null;
                                                    const variantStock = getVariantStock(opt);
                                                    const isOutOfStock = variantStock !== null && variantStock <= 0;

                                                    if (isColorAttr && variantImg) {
                                                        // Daraz-style image variant selector
                                                        return (
                                                            <button
                                                                key={opt}
                                                                onClick={() => setSelectedVariants(prev => ({ ...prev, [attrName]: opt }))}
                                                                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${isSelected
                                                                    ? 'border-primary shadow-lg shadow-primary/20 scale-105'
                                                                    : 'border-foreground/10 hover:border-primary/50 opacity-80 hover:opacity-100'
                                                                    } ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
                                                                title={opt}
                                                            >
                                                                <img src={variantImg} alt={opt} className="w-full h-full object-cover" />
                                                                {isOutOfStock && (
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                                        <span className="text-[8px] font-black text-white uppercase">Sold Out</span>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    }

                                                    // Default text-based variant button
                                                    return (
                                                        <button
                                                            key={opt}
                                                            onClick={() => !isOutOfStock && setSelectedVariants(prev => ({ ...prev, [attrName]: opt }))}
                                                            disabled={isOutOfStock}
                                                            className={`px-6 py-3 rounded-2xl font-bold transition-all border-2 text-sm ${isSelected
                                                                ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                                : isOutOfStock
                                                                    ? 'border-foreground/5 text-foreground/30 bg-foreground/5 cursor-not-allowed line-through'
                                                                    : 'border-foreground/10 hover:border-primary/50 text-foreground/70 bg-foreground/5'
                                                                }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Stock Status Indicator */}
                            {displayStock > 0 && displayStock <= 10 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-2 font-black italic uppercase tracking-tighter text-sm ${displayStock <= 3 ? 'text-red-500' : 'text-amber-500'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${displayStock <= 3 ? 'bg-red-500' : 'bg-amber-500'}`} />
                                    Only {displayStock} items left in stock!
                                </motion.div>
                            )}

                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="w-full sm:flex-grow flex items-center bg-foreground/5 rounded-2xl p-1.5 border border-foreground/5">
                                    <button
                                        onClick={() => handleQuantityChange(-1)}
                                        className="w-8 h-8 flex items-center justify-center glass rounded-xl hover:scale-105 active:scale-95 transition-all font-black text-lg"
                                    >
                                        -
                                    </button>
                                    <div className="flex-grow flex flex-col items-center justify-center">
                                        <span className="text-[8px] font-black uppercase opacity-20 tracking-widest leading-none mb-0.5">Quantity</span>
                                        <div className="font-black text-base md:text-lg leading-none">{quantity}</div>
                                    </div>
                                    <button
                                        onClick={() => handleQuantityChange(1)}
                                        className="w-8 h-8 flex items-center justify-center glass rounded-xl hover:scale-105 active:scale-95 transition-all font-black text-lg"
                                    >
                                        +
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {product.merchant_contact && (
                                        <a
                                            href={`https://wa.me/${product.merchant_contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'm interested in "${product.name}" (${window.location.origin}/#product/${product.slug || `${product.name.replace(/\s+/g, '-').toLowerCase()}-${product.sku}`}). Can you provide more details?`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20 group animate-pulse-subtle"
                                        >
                                            <MessageCircle className="w-5 h-5 fill-white" />
                                            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">For More Information</span>
                                        </a>
                                    )}

                                    <button
                                        onClick={handleShare}
                                        className="p-4 glass rounded-2xl hover:scale-105 active:scale-95 transition-all hover:bg-primary/5 group"
                                        title="Share Product"
                                    >
                                        <Share2 className="w-5 h-5 group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    if (displayStock === 0 || isAdding) return;
                                    setIsAdding(true);
                                    // Make sure we pass the correct price to the cart based on variants
                                    addItem({ ...product, price: displayPrice }, quantity, selectedVariants);
                                    onFly(e);
                                    setTimeout(() => setIsAdding(false), 1000);
                                }}
                                disabled={displayStock === 0 || isAdding}
                                className={`w-full py-6 transition-all rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 ${displayStock === 0 || isAdding
                                    ? 'bg-foreground/20 text-foreground/40 cursor-not-allowed'
                                    : 'bg-primary text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {isAdding ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag className="w-6 h-6" />
                                        {displayStock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Perks */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 sm:pt-8 border-t border-white/10">
                            {[
                                { icon: Truck, label: 'Fast Shipping', hash: 'shipping-policy' },
                                { icon: ShieldCheck, label: 'Secure Payment', hash: 'privacy' },
                                { icon: RefreshCcw, label: 'Easy Returns', hash: 'returns' }
                            ].map(({ icon: Icon, label, hash }) => (
                                <button
                                    key={label}
                                    onClick={() => window.location.hash = hash}
                                    className="flex flex-col items-center text-center gap-1 sm:gap-2 p-2 sm:p-4 glass rounded-[1.5rem] sm:rounded-3xl hover:bg-white/10 hover:scale-105 transition-all group"
                                >
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-50">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="glass p-8 rounded-[2.5rem] space-y-6">
                            <h3 className="text-2xl font-black tracking-tighter uppercase italic">Customer Rating</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-6xl font-black text-primary">{avgRating}</span>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(avgRating)) ? 'fill-current' : ''}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold opacity-40">Based on {reviews.length} reviews</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center gap-3 mb-8">
                            <MessageCircle className="w-6 h-6 text-primary" />
                            <h3 className="text-2xl font-black tracking-tighter uppercase italic">Recent Reviews</h3>
                        </div>

                        {loadingReviews ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="glass p-12 text-center rounded-[2.5rem] opacity-30 italic font-medium">
                                No reviews yet. Be the first to share your experience!
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                {reviews.map((review) => {
                                    const nameFirstChar = review.profiles?.full_name ? review.profiles.full_name[0] : 'U';
                                    const fullName = review.profiles?.full_name || 'Anonymous';

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            key={review.id}
                                            className="glass p-8 rounded-[2.5rem] border-white/5 space-y-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-xs">
                                                        {nameFirstChar}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm">{fullName}</p>
                                                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-foreground/10'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm leading-relaxed opacity-80 font-medium">{review.comment}</p>
                                            
                                            {/* Review Images */}
                                            {review.image_urls && review.image_urls.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {review.image_urls.map((url: string, i: number) => (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => setSelectedReviewImage(url)}
                                                            className="w-14 h-14 rounded-xl overflow-hidden border border-white/5 cursor-zoom-in hover:scale-105 transition-transform shadow-sm"
                                                        >
                                                            <img src={url} alt={`Review ${i}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Edit Button for own reviews */}
                                            {user && review.user_id === user.id && (
                                                <div className="pt-2 flex justify-end">
                                                    <button 
                                                        onClick={() => window.location.hash = `#rate-product?order_id=${review.order_id}&product_id=${review.product_id}&user_id=${user.id}&rating=${review.rating}`}
                                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                                                    >
                                                        Edit Review
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Suggested Products ── */}
            {(() => {
                const suggestions = products
                    .filter(p => {
                        if (storeSlug && product?.merchant_id) {
                            // If viewed from a store, show only products from THAT merchant AND same category
                            return p.merchant_id === product.merchant_id && p.category === product.category && p.id !== product.id && p.stock > 0;
                        }
                        // Default global search behavior: filter by category
                        return p.category === product.category && p.id !== product.id && p.stock > 0;
                    })
                    .slice(0, 8);

                // Hide section only if products loaded AND there's nothing to show
                if (!productsLoading && suggestions.length === 0) return null;

                const sliderId = 'suggested-products-slider';
                return (
                    <section className="mt-20 pt-10 border-t border-foreground/5">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <span className="block w-1 h-7 bg-primary rounded-full" />
                                <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">
                                    {storeSlug ? 'More from this Store' : 'You May Also Like'}
                                </h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { const el = document.getElementById(sliderId); el?.scrollBy({ left: -320, behavior: 'smooth' }); }}
                                    className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow hover:bg-primary hover:text-white hover:border-primary transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { const el = document.getElementById(sliderId); el?.scrollBy({ left: 320, behavior: 'smooth' }); }}
                                    className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow hover:bg-primary hover:text-white hover:border-primary transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div
                            id={sliderId}
                            className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1 px-1"
                        >
                            {productsLoading ? (
                                [1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex-shrink-0 aspect-square animate-pulse bg-foreground/5 rounded-2xl" style={{ width: cardWidth }} />
                                ))
                            ) : (
                                suggestions.map(p => (
                                    <div key={p.id} className="flex-shrink-0" style={{ width: cardWidth }}>
                                        <ProductCard
                                            product={p}
                                            onAddToCart={() => onFly({} as any)}
                                            storeSlug={storeSlug || undefined}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                );
            })()}
            {/* Image Lightbox Modal */}
            {selectedReviewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedReviewImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedReviewImage(null); }}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={selectedReviewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

const Loader2 = ({ className }: { className?: string }) => (
    <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={className}
    >
        <RefreshCcw className="w-full h-full" />
    </motion.div>
);
