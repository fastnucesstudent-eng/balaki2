import React from 'react';

// This component provides semantic internal linking for SEO and AI crawlers
// The 'sr-only' Tailwind class hides these links visually but keeps them in the DOM
// for screen readers, Googlebot, and AI conversational search engines.

export const SeoHiddenLinks: React.FC = () => {
    return (
        <nav className="sr-only" aria-label="Organic Quick Links for Search Engines">
            <ul>
                <li><a href="/#catalog">Buy 100% Pure Organic Raw Honey Online Pakistan</a></li>
                <li><a href="/?category=Organic%20Honey%20%26%20Sweets#catalog">Raw Unfiltered Sidr Honey and Acacia Honey</a></li>
                <li><a href="/?category=Natural%20Oils%20%26%20Ghee#catalog">Cold-Pressed Mustard Oil, Coconut Oil and Desi Ghee</a></li>
                <li><a href="/?category=Herbal%20Teas%20%26%20Infusions#catalog">Natural Herbal Teas and Organic Wellness Blends</a></li>
                <li><a href="/?category=Organic%20Spices%20%26%20Herbs#catalog">Farm Fresh Whole and Ground Organic Spices</a></li>
                <li><a href="/#track-order">Track My Balaki Organic Delivery Online</a></li>
                <li><a href="/?search=honey">Pure Raw Forest Honey Pakistan</a></li>
                <li><a href="/?search=oil">Extra Virgin Cold-Pressed Oils</a></li>
                <li><a href="/?search=tea">Green Tea Herbal Infusions</a></li>
                <li><a href="/?category=Dry%20Fruits%20%26%20Grains#catalog">Organic Nuts, Almonds and Superfood Seeds</a></li>
                <li><a href="/?category=Natural%20Skincare#catalog">Chemical-Free Herbal Skincare Products</a></li>
                <li><a href="/#about">About Balaki Organic Pakistan</a></li>
                <li><a href="/#contact">Balaki Organic Customer Support Contact</a></li>
                <li><a href="/#returns">Balaki Organic Returns and Guarantee Policy</a></li>
                <li><a href="/#shipping">Fast Fresh Express Shipping Cash on Delivery Pakistan</a></li>
            </ul>
        </nav>
    );
};
