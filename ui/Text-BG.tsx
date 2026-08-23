'use client';

import React from 'react';
import type { IBgStyle } from '../models/SocialMedia';

export const BG_PRESETS: IBgStyle[] = [
    {
        id: 'sunset-glow',
        name: 'Sunset Glow',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'ocean-breeze',
        name: 'Ocean Breeze',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'royal-purple',
        name: 'Royal Purple',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'flaming-lava',
        name: 'Flaming Lava',
        gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'cyber-neon',
        name: 'Cyber Neon',
        gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'midnight-dark',
        name: 'Midnight Dark',
        gradient: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'rose-gold',
        name: 'Rose Gold',
        gradient: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'electric-violet',
        name: 'Electric Violet',
        gradient: 'linear-gradient(135deg, #8a2be2 0%, #4a00e0 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'warm-amber',
        name: 'Warm Amber',
        gradient: 'linear-gradient(135deg, #fbab7e 0%, #f7ce68 100%)',
        textColor: '#1f2937',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'emerald-forest',
        name: 'Emerald Forest',
        gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'deep-space',
        name: 'Deep Space',
        gradient: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'cotton-candy',
        name: 'Cotton Candy',
        gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        textColor: '#1f2937',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'cosmic-fusion',
        name: 'Cosmic Fusion',
        gradient: 'linear-gradient(135deg, #b224ef 0%, #7579ff 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'fresh-citrus',
        name: 'Fresh Citrus',
        gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
    {
        id: 'velvet-luxury',
        name: 'Velvet Luxury',
        gradient: 'linear-gradient(135deg, #1e130c 0%, #9a8478 100%)',
        textColor: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
    },
];

interface TextBgPostProps {
    content: string;
    bgStyle?: IBgStyle | null;
    className?: string;
}

export default function TextBgPost({ content, bgStyle, className = '' }: TextBgPostProps) {
    if (!content) return null;

    const currentStyle = bgStyle || BG_PRESETS[0];

    // Dynamic Font Scaling based on character count
    const charCount = content.trim().length;
    let fontSizeClass = 'text-2xl md:text-3xl font-black';
    if (charCount > 140) {
        fontSizeClass = 'text-base md:text-lg font-bold';
    } else if (charCount > 70) {
        fontSizeClass = 'text-lg md:text-xl font-bold';
    }

    return (
        <div
            className={`relative w-full min-h-70 md:min-h-85 flex items-center justify-center p-8 md:p-12 text-center shadow-inner select-text overflow-hidden transition-all duration-300 ${className}`}
            style={{
                background: currentStyle.gradient,
                color: currentStyle.textColor || '#ffffff',
                fontFamily: currentStyle.fontFamily || 'system-ui, sans-serif',
            }}
        >
            {/* Subtle background gloss reflection effect */}
            <div className="absolute inset-0 bg-linear-to-t from-black/15 via-transparent to-white/15 pointer-events-none" />

            {/* Centered High Impact Text */}
            <div className="relative z-10 max-w-lg mx-auto">
                <p
                    className={`${fontSizeClass} leading-snug tracking-tight drop-shadow-md wrap-break-word whitespace-pre-line`}
                >
                    {content}
                </p>
            </div>
        </div>
    );
}
