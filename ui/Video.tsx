'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface VideoPostProps {
    src: string;
    title?: string;
    poster?: string;
    className?: string;
}

function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

export default function VideoPost({ src, title, poster, className = '' }: VideoPostProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);

    const ytId = getYouTubeId(src);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const time = parseFloat(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const formatTime = (secs: number) => {
        if (isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!src) return null;

    // ─── YouTube Embed / Preview Mode ───
    if (ytId) {
        return (
            <div className={`relative w-full rounded-2xl overflow-hidden shadow-md bg-black border border-gray-200/80 aspect-video ${className}`}>
                {isIframeLoaded ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                        title={title || 'YouTube video player'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full border-0"
                    />
                ) : (
                    <div
                        className="relative w-full h-full bg-cover bg-center cursor-pointer group flex items-center justify-center"
                        style={{
                            backgroundImage: `url(${poster || `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`})`,
                        }}
                        onClick={() => setIsIframeLoaded(true)}
                    >
                        {/* Top Gradient Header with Title */}
                        <div className="absolute inset-x-0 top-0 p-4 bg-linear-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white z-10">
                            <div className="flex items-center gap-2 min-w-0">
                                <Icon icon="logos:youtube-icon" width={22} className="shrink-0" />
                                <span className="font-bold text-xs md:text-sm truncate drop-shadow-md">
                                    {title || 'Watch Video'}
                                </span>
                            </div>
                        </div>

                        {/* Central Play Button matching Screenshot */}
                        <div className="relative z-10 w-16 h-12 md:w-20 md:h-14 bg-red-600/90 group-hover:bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                            <Icon icon="solar:play-bold" width={28} className="text-white ml-0.5" />
                        </div>

                        {/* Bottom Actions Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/80 to-transparent flex items-center justify-between text-white z-10">
                            <span className="text-[11px] font-semibold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                4K HD Video
                            </span>
                            <a
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1"
                            >
                                <span>Watch on YouTube</span>
                                <Icon icon="solar:arrow-right-up-linear" width={14} />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Native HTML5 Video Player ───
    return (
        <div
            ref={containerRef}
            className={`relative group w-full bg-black rounded-2xl overflow-hidden shadow-md select-none max-h-130 flex items-center justify-center ${className}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-auto max-h-130 object-contain"
                playsInline
                preload="metadata"
            />

            {/* Central Play/Pause Watermark Overlay */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs transition">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl transition transform group-hover:scale-110"
                    >
                        <Icon icon="solar:play-bold" width={32} className="ml-1" />
                    </button>
                </div>
            )}

            {/* Custom Modern Video Control Bar */}
            <div
                className={`absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/50 to-transparent p-3 transition-opacity duration-200 ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Seek Bar */}
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500 mb-2"
                />

                <div className="flex items-center justify-between text-white text-xs font-semibold">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={togglePlay} className="hover:text-red-400 transition">
                            <Icon icon={isPlaying ? 'solar:pause-bold' : 'solar:play-bold'} width={20} />
                        </button>

                        <button type="button" onClick={toggleMute} className="hover:text-red-400 transition">
                            <Icon
                                icon={isMuted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'}
                                width={20}
                            />
                        </button>

                        <span className="text-[11px] text-gray-300 font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
