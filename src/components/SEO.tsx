import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product';
}

export const SEO = ({
    title = 'Balaki Organic | 100% Pure & Certified Organic Store',
    description = 'Discover 100% pure raw honey, cold-pressed oils, organic spices, herbal teas, and natural superfoods delivered fresh across Pakistan.',
    image = '/logo.svg',
    url = 'https://balakiorganic.com',
    type = 'website'
}: SEOProps) => {
    const siteTitle = title === 'Balaki Organic | 100% Pure & Certified Organic Store' ? title : `${title} | Balaki Organic`;
    const baseUrl = 'https://balakiorganic.com';

    const absoluteImageUrl = image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
    const absolutePageUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

    // Schema.org Structured Data
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Balaki Organic",
        "url": baseUrl,
        "logo": `${baseUrl}/logo.svg`,
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+92-301-4444980",
            "contactType": "customer service",
            "areaServed": "PK",
            "availableLanguage": "English"
        },
        "sameAs": [
            "https://www.facebook.com/balakiorganic",
            "https://www.instagram.com/balaki_organic"
        ]
    };

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content="Balaki Organic, organic food Pakistan, pure honey, cold pressed oil, organic spices, herbal tea, natural superfoods, chemical free food" />
            <link rel="canonical" href={absolutePageUrl} />
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="author" content="Balaki Organic Pakistan" />
            <meta name="publisher" content="Balaki Organic" />

            {/* Geographic Metadata */}
            <meta name="geo.region" content="PK-PB" />
            <meta name="geo.placename" content="Lahore" />
            <meta name="geo.position" content="31.5204;74.3587" />
            <meta name="ICBM" content="31.5204, 74.3587" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={absolutePageUrl} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={absoluteImageUrl} />
            <meta property="og:image:secure_url" content={absoluteImageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={siteTitle} />
            <meta property="og:site_name" content="Balaki Organic" />
            <meta property="og:locale" content="en_PK" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={absolutePageUrl} />
            <meta property="twitter:title" content={siteTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={absoluteImageUrl} />
            <meta property="twitter:image:alt" content={siteTitle} />
            <meta name="twitter:site" content="@balakiorganic" />
            <meta name="twitter:creator" content="@balakiorganic" />

            {/* Advanced Technical Meta */}
            <meta name="theme-color" content="#22c55e" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="format-detection" content="telephone=no" />

            {/* Favicon */}
            <link rel="icon" type="image/svg+xml" href="/logo.svg" />
            <link rel="apple-touch-icon" href="/logo.svg" />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
            </script>
        </Helmet>
    );
};
