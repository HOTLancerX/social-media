'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface VideoPostProps {
    src: string;
    title?: string;
    poster?: string;
    className?: string;
    onOpenReel?: () => void;
}

function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

export default function VideoPost({
    src,
    title,
    poster,
    className = '',
    onOpenReel,
}: VideoPostProps) {
    if (!src) return null;

    const ytId = getYouTubeId(src);
    const thumbnail =
        poster ||
        (ytId
            ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
            : '');

    const handleClick = () => {
        if (onOpenReel) {
            onOpenReel();
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`relative w-full rounded overflow-hidden shadow-md bg-black border border-gray-200/80 aspect-video cursor-pointer group select-none ${className}`}
        >
            {/* Background Thumbnail Image / Video Preview */}
            {thumbnail ? (
                <img
                    src={thumbnail}
                    alt={title || 'Video preview'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
            ) : (
                <video
                    src={src}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    preload="metadata"
                    muted
                    playsInline
                />
            )}

            {/* Dark Linear Overlays */}
            <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/20 to-black/80 group-hover:via-black/30 transition-all" />

            {/* Top Gradient Header with Title & Badge */}
            <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between text-white z-10">
                <div className="flex items-center gap-2 min-w-0">
                    {ytId ? (
                        <Icon icon="logos:youtube-icon" width={22} className="shrink-0" />
                    ) : (
                        <div className="w-6 h-6 rounded-md bg-red-600/90 text-white flex items-center justify-center shadow-xs">
                            <Icon icon="solar:videocamera-record-bold" width={14} />
                        </div>
                    )}
                    <span className="font-bold text-xs md:text-sm truncate drop-shadow-md">
                        {title || 'Watch Video'}
                    </span>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-black/50 hover:bg-black/80 text-white text-[11px] font-bold backdrop-blur-md transition flex items-center gap-1 border border-white/20">
                    <Icon icon="solar:maximize-square-bold" width={13} />
                    <span>Watch</span>
                </span>
            </div>

            {/* Central Play Button */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-12 md:w-20 md:h-14 bg-red-600/95 group-hover:bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 transform group-hover:scale-110 border border-white/20">
                    <Icon icon="solar:play-bold" width={28} className="text-white ml-0.5 drop-shadow-md" />
                </div>
            </div>

            {/* Bottom Actions & Quality Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between text-white z-10">
                <span className="text-[11px] font-semibold bg-black/60 px-2.5 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
                    HD Video
                </span>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-white/20 group-hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1 border border-white/10">
                        <span>Click to play</span>
                        <Icon icon="solar:play-linear" width={14} />
                    </div>
                </div>
            </div>
        </div>
    );
}
