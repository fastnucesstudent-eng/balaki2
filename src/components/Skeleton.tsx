import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

export const Skeleton = ({ className = '', width, height, circle }: SkeletonProps) => {
    return (
        <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            style={{
                width,
                height,
                borderRadius: circle ? '50%' : '1rem'
            }}
            className={`bg-foreground/5 dark:bg-white/5 backdrop-blur-sm relative overflow-hidden ${className}`}
        >
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />
        </motion.div>
    );
};

export const ProductSkeleton = () => {
    return (
        <div className="glass rounded-[2rem] p-3 md:p-4 space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl md:rounded-3xl" />
            <div className="space-y-2 px-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 opacity-50" />
            </div>
            <div className="flex items-center justify-between pt-2 px-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    );
};

export const ProductDetailSkeleton = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                {/* Image Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-[2.5rem]" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-2xl" />
                        ))}
                    </div>
                </div>
                
                {/* Info Skeleton */}
                <div className="space-y-8 pt-4">
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    
                    <div className="space-y-4 py-8 border-y border-foreground/5">
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-12 w-48 rounded-full" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16 rounded-3xl" />
                        <Skeleton className="h-16 rounded-3xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StorePageSkeleton = () => {
    return (
        <div className="min-h-screen bg-background">
            {/* Banner Skeleton */}
            <Skeleton className="w-full aspect-[21/9] md:aspect-[25/7] rounded-none opacity-20" />
            
            <div className="max-w-7xl mx-auto px-6 -mt-8 md:-mt-20 relative z-40">
                <div className="flex flex-col md:flex-row gap-6 md:items-end">
                    <Skeleton className="w-24 h-24 md:w-48 md:h-48 rounded-[1.5rem] md:rounded-[3rem] border-4 border-background" />
                    <div className="flex-grow space-y-3 pb-4">
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="h-6 w-48 rounded-full" />
                    </div>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <ProductSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
};
