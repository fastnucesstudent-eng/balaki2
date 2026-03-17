/**
 * Converts a product name to a URL-safe slug.
 * e.g. "Nike Air Max 2024 (Blue)" → "nike-air-max-2024-blue"
 */
export const slugify = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 70);

/**
 * Generates a full product URL path.
 * e.g. "/product/premium-leather-bag-TRZ-001"
 */
export const generateProductURL = (name: string, sku: string): string => {
    const slug = slugify(name);
    return `product/${slug}-${sku.toLowerCase()}`;
};

