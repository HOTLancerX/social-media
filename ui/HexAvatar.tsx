'use client';

import React, { useId } from 'react';

interface HexAvatarProps {
    image?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    level?: number | string;
    progress?: number; // 0 to 100
    isOnline?: boolean;
    showStatusOrLevel?: boolean;
    showLiveDot?: boolean; // Top-left live status dot
    className?: string;
}

export default function HexAvatar({
    image,
    name,
    size = 'md',
    level = 24,
    progress = 78,
    isOnline = false,
    showStatusOrLevel = true,
    showLiveDot = false,
    className = '',
}: HexAvatarProps) {
    const rawId = useId();
    const clipId = `hex-avatar-clip-${rawId.replace(/:/g, '')}`;

    const sizeClass = {
        sm: 'w-10 h-11',
        md: 'w-12 h-13',
        lg: 'w-16 h-18',
        xl: 'w-32 h-35 sm:w-36 sm:h-40',
    }[size];

    // Responsive stroke widths: Fully customizable outer, track, and inner widths
    const strokeConfig = {
        sm: { outerWidth: 14, trackWidth: 5, innerWidth: 2.5 },
        md: { outerWidth: 13, trackWidth: 4.8, innerWidth: 2.2 },
        lg: { outerWidth: 10, trackWidth: 4, innerWidth: 1.8 },
        xl: { outerWidth: 10, trackWidth: 4, innerWidth: 0.8 },
    }[size];

    const perimeter = 270;
    const activeProgress = typeof progress === 'number' ? progress : 78;
    const strokeOffset = ((100 - activeProgress) / 100) * perimeter;

    // Clockwise Hexagon Paths starting exactly at Top-Center Apex (12 o'clock: 50, 8.5)
    const HEX_OUTLINE =
        'M 50 8.5 L 86 29 Q 90.5 32 90.5 37 L 90.5 73 Q 90.5 78 86 81 L 54 99 Q 50 102 46 99 L 14 81 Q 9.5 78 9.5 73 L 9.5 37 Q 9.5 32 14 29 L 50 8.5 Z';

    const HEX_IMAGE_CLIP =
        'M 50 15 L 80 32 Q 83.5 34.5 83.5 39 L 83.5 71 Q 83.5 75.5 80 78 L 53.5 93 Q 50 95.5 46.5 93 L 20 78 Q 16.5 75.5 16.5 71 L 16.5 39 Q 16.5 34.5 20 32 L 50 15 Z';

    return (
        <div className={`relative ${sizeClass} shrink-0 ${className} flex items-center justify-center select-none`}>
            <svg
                viewBox="0 0 100 110"
                className="w-full h-full overflow-visible drop-shadow-xs"
            >
                <defs>
                    <clipPath id={clipId}>
                        <path
                            d={HEX_IMAGE_CLIP}
                            strokeLinejoin="round"
                        />
                    </clipPath>
                </defs>

                {/* 1. Layer 1: Outer White Frame */}
                <path
                    d={HEX_OUTLINE}
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth={strokeConfig.outerWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* 2. Layer 2: Middle Slate-Gray Base Track */}
                <path
                    d={HEX_OUTLINE}
                    fill="#ffffff"
                    stroke="#dbe2ea"
                    strokeWidth={strokeConfig.trackWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* 3. Layer 3: Dynamic Cyan / Blue Progress Arc */}
                <path
                    d={HEX_OUTLINE}
                    fill="none"
                    stroke={isOnline ? '#23d2e2' : '#3b82f6'}
                    strokeWidth={strokeConfig.trackWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={perimeter}
                    strokeDashoffset={strokeOffset}
                    className="transition-all duration-700 ease-out"
                />

                {/* 4. Layer 4: Inner Hexagon Image / Initials */}
                {image ? (
                    <image
                        href={image}
                        x="10"
                        y="10"
                        width="80"
                        height="90"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${clipId})`}
                    />
                ) : (
                    <g clipPath={`url(#${clipId})`}>
                        <rect x="0" y="0" width="100" height="110" fill="#1e2337" />
                        <text
                            x="50"
                            y="56"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="26"
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                        >
                            {name?.charAt(0)?.toUpperCase() || 'U'}
                        </text>
                    </g>
                )}

                {/* 5. Layer 5: Fully Customizable Inner White Stroke Border */}
                {strokeConfig.innerWidth > 0 && (
                    <path
                        d={HEX_IMAGE_CLIP}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={strokeConfig.innerWidth}
                        strokeLinejoin="round"
                    />
                )}

                {/* Top-Left Live Status Indicator Dot */}
                {showLiveDot && isOnline && (
                    <circle
                        cx="10"
                        cy="40"
                        r={size === 'xl' ? 3.5 : 5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={size === 'xl' ? 1.5 : 2}
                        className="animate-pulse"
                    />
                )}

                {/* 6. Status Badge: Pure Vector Green Circle when Online, or Hexagon Level Badge when Offline */}
                {showStatusOrLevel && (
                    isOnline ? (
                        <g className="animate-in fade-in duration-300">
                            {/* Green Online Button with Thick White Ring */}
                            <circle
                                cx="83"
                                cy="83"
                                r="10"
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth="3.5"
                            />
                        </g>
                    ) : (
                        <g>
                            {/* Hexagonal Indigo Level Badge */}
                            <polygon
                                points="83 72, 94 78.5, 94 91.5, 83 98, 72 91.5, 72 78.5"
                                fill="#312e81"
                                stroke="#ffffff"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                            />
                            <text
                                x="83"
                                y="85.5"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize="10"
                                fontWeight="900"
                                fontFamily="system-ui, -apple-system, sans-serif"
                            >
                                {level}
                            </text>
                        </g>
                    )
                )}
            </svg>
        </div>
    );
}
