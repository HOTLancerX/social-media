'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { Icon } from '@iconify/react';
import FacebookEmoji from './FacebookEmoji';
import ReactionPicker from './ReactionPicker';
import CommentSection from './CommentSection';
import ShareModal from './ShareModal';
import type { ISocialPostData } from '../models/SocialMedia';

interface VideoViewerModalProps {
    videos: ISocialPostData[];
    initialIndex?: number;
    currentUser?: any;
    onClose: () => void;
    onPostUpdated?: (updatedPost: ISocialPostData) => void;
}

function getYouTubeId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

function formatTime(secs: number) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function VideoViewerModal({
    videos,
    initialIndex = 0,
    currentUser,
    onClose,
    onPostUpdated,
}: VideoViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
    const [showReactionPicker, setShowReactionPicker] = useState(false);

    const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
    const containerRef = useRef<HTMLDivElement>(null);

    // Embla Carousel Integration — vertical scroll for reels/shorts/watch experience
    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        loop: false,
        duration: 25,
        skipSnaps: false,
    });

    // Scroll to initial index on mount
    useEffect(() => {
        if (emblaApi && initialIndex > 0) {
            emblaApi.scrollTo(initialIndex, true);
        }
    }, [emblaApi, initialIndex]);

    // Handle slide change
    const onSelectSlide = useCallback(() => {
        if (!emblaApi) return;
        const selected = emblaApi.selectedScrollSnap();
        setCurrentIndex(selected);
        setCurrentTime(0);
        setIsPlaying(true);
        setCaptionExpanded(false);

        // Pause other videos and play current video
        Object.entries(videoRefs.current).forEach(([key, videoEl]) => {
            if (!videoEl) return;
            if (Number(key) === selected) {
                videoEl.currentTime = 0;
                videoEl.play().catch(() => {});
            } else {
                videoEl.pause();
            }
        });
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelectSlide);
        return () => {
            emblaApi.off('select', onSelectSlide);
        };
    }, [emblaApi, onSelectSlide]);

    const currentPost = videos[currentIndex] || videos[0];
    if (!currentPost) return null;

    const currentVideoSrc = currentPost.videos?.[0] || '';
    const ytId = getYouTubeId(currentVideoSrc);

    // Auto-Next Video Handler when current video ends
    const handleVideoEnded = (idx: number) => {
        if (idx === currentIndex) {
            if (emblaApi && emblaApi.canScrollNext()) {
                emblaApi.scrollNext();
            } else {
                setIsPlaying(false);
            }
        }
    };

    // Toggle Play / Pause for Active Video
    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const activeVideo = videoRefs.current[currentIndex];
        if (!activeVideo) return;

        if (activeVideo.paused) {
            activeVideo.play().catch(() => {});
            setIsPlaying(true);
        } else {
            activeVideo.pause();
            setIsPlaying(false);
        }
    };

    // Toggle Mute
    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        Object.values(videoRefs.current).forEach((v) => {
            if (v) v.muted = newMuted;
        });
    };

    // Seek in video
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        const activeVideo = videoRefs.current[currentIndex];
        if (activeVideo) {
            activeVideo.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown' || e.key === 'j') {
                e.preventDefault();
                emblaApi?.scrollNext();
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                e.preventDefault();
                emblaApi?.scrollPrev();
            } else if (e.key === ' ' || e.key === 'k') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMute();
            } else if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                setShowComments((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [emblaApi, onClose, isMuted, currentIndex]);

    // Handle Reacting to Current Post
    const handleReaction = async (reactionType: string) => {
        if (!currentUser) return;
        setFloatingReaction(reactionType);
        setTimeout(() => setFloatingReaction(null), 2000);

        try {
            const res = await fetch(`/api/social-media/${currentPost._id}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reaction: reactionType }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.post && onPostUpdated) {
                    onPostUpdated(data.post);
                }
            }
        } catch (err) {
            console.error('Failed to react:', err);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-99999 bg-black flex select-none overflow-hidden animate-in fade-in">
            {/* Top Bar Header */}
            <div className="absolute top-0 inset-x-0 h-16 z-50 bg-linear-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-4 md:px-6">
                {/* Brand / Title */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer"
                        title="Close (Esc)"
                    >
                        <Icon icon="solar:close-circle-bold" width={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-md">
                            <Icon icon="solar:videocamera-record-bold" width={18} />
                        </div>
                        <span className="text-white font-black text-sm tracking-wide hidden sm:inline-block drop-shadow-md">
                            Video Watch ({currentIndex + 1}/{videos.length})
                        </span>
                    </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer"
                        title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    >
                        <Icon icon={isMuted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'} width={20} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowComments((prev) => !prev)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer ${
                            showComments ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                    >
                        <Icon icon="solar:chat-round-dots-bold" width={16} />
                        <span className="hidden sm:inline">Comments</span>
                        <span>({currentPost.commentsCount || 0})</span>
                    </button>
                </div>
            </div>

            {/* Main Stage: Carousel Container */}
            <div className="relative flex-1 h-full flex items-center justify-center overflow-hidden">
                {/* Desktop Floating Navigation Arrows */}
                {currentIndex > 0 && (
                    <button
                        type="button"
                        onClick={() => emblaApi?.scrollPrev()}
                        className="hidden md:flex absolute top-20 left-1/2 -translate-x-1/2 z-40 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition cursor-pointer shadow-lg border border-white/10 hover:scale-105"
                        title="Previous Video (Up Arrow)"
                    >
                        <Icon icon="solar:alt-arrow-up-bold" width={24} />
                    </button>
                )}

                {currentIndex < videos.length - 1 && (
                    <button
                        type="button"
                        onClick={() => emblaApi?.scrollNext()}
                        className="hidden md:flex absolute bottom-20 left-1/2 -translate-x-1/2 z-40 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition cursor-pointer shadow-lg border border-white/10 hover:scale-105"
                        title="Next Video (Down Arrow)"
                    >
                        <Icon icon="solar:alt-arrow-down-bold" width={24} />
                    </button>
                )}

                {/* Embla Carousel Viewport */}
                <div ref={emblaRef} className="w-full h-full overflow-hidden">
                    <div className="flex flex-col h-full">
                        {videos.map((post, idx) => {
                            const postVideoSrc = post.videos?.[0] || '';
                            const postYtId = getYouTubeId(postVideoSrc);
                            const isActive = idx === currentIndex;

                            return (
                                <div
                                    key={post._id || idx}
                                    className="relative flex-none w-full h-full flex items-center justify-center bg-black"
                                >
                                    {/* Video Content */}
                                    {postYtId ? (
                                        <div className="relative w-full max-w-4xl aspect-video max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
                                            {isActive ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${postYtId}?autoplay=1&enablejsapi=1`}
                                                    title={post.content || 'YouTube video'}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="w-full h-full border-0"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full bg-cover bg-center"
                                                    style={{
                                                        backgroundImage: `url(https://img.youtube.com/vi/${postYtId}/maxresdefault.jpg)`,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className="relative w-full h-full flex items-center justify-center cursor-pointer"
                                            onClick={togglePlay}
                                        >
                                            <video
                                                ref={(el) => {
                                                    videoRefs.current[idx] = el;
                                                }}
                                                src={postVideoSrc}
                                                className="max-w-full max-h-full object-contain"
                                                playsInline
                                                muted={isMuted}
                                                autoPlay={isActive}
                                                loop={false}
                                                onTimeUpdate={(e) => {
                                                    if (isActive) {
                                                        setCurrentTime(e.currentTarget.currentTime);
                                                    }
                                                }}
                                                onLoadedMetadata={(e) => {
                                                    if (isActive) {
                                                        setDuration(e.currentTarget.duration);
                                                    }
                                                }}
                                                onEnded={() => handleVideoEnded(idx)}
                                            />

                                            {/* Pause Overlay Watermark */}
                                            {!isPlaying && isActive && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs transition">
                                                    <div className="w-20 h-20 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl transition transform hover:scale-110">
                                                        <Icon icon="solar:play-bold" width={38} className="ml-1" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Floating Reaction Animation */}
                                    {floatingReaction && isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-bounce">
                                            <div className="p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl">
                                                <FacebookEmoji type={floatingReaction as any} size="lg" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Left-Bottom Overlay: Author & Content Caption */}
                                    <div className="absolute bottom-6 left-4 md:left-8 max-w-lg z-30 space-y-3 pointer-events-auto">
                                        {/* Author Header */}
                                        <div className="flex items-center gap-3">
                                            <Link
                                                href={`/${post.userSlug || post.userName}`}
                                                className="shrink-0 group flex items-center gap-2.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {post.userImage ? (
                                                    <img
                                                        src={post.userImage}
                                                        alt={post.userName}
                                                        className="w-11 h-11 rounded-full object-cover border-2 border-white/80 shadow-md group-hover:scale-105 transition"
                                                    />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold text-base flex items-center justify-center shadow-md border-2 border-white/80">
                                                        {post.userName?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-white text-sm drop-shadow-md hover:underline">
                                                            {post.userName}
                                                        </span>
                                                        <Icon icon="solar:verified-check-bold" className="text-sky-400" width={16} />
                                                    </div>
                                                    <span className="text-[11px] text-gray-300 drop-shadow-xs">
                                                        Video Creator
                                                    </span>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Caption */}
                                        {post.content && (
                                            <div className="text-white text-xs md:text-sm drop-shadow-md leading-relaxed">
                                                <p className={captionExpanded ? '' : 'line-clamp-2'}>
                                                    {post.content}
                                                </p>
                                                {post.content.length > 90 && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCaptionExpanded(!captionExpanded);
                                                        }}
                                                        className="text-indigo-400 font-bold hover:underline ml-1 cursor-pointer"
                                                    >
                                                        {captionExpanded ? 'Show less' : '...more'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right-Side Action Column: Reactions, Comments, Share */}
                                    <div className="absolute right-4 md:right-8 bottom-12 z-30 flex flex-col items-center gap-4 pointer-events-auto">
                                        {/* Reaction Picker Button */}
                                        <div
                                            className="relative group/react"
                                            onMouseEnter={() => setShowReactionPicker(true)}
                                            onMouseLeave={() => setShowReactionPicker(false)}
                                        >
                                            {showReactionPicker && (
                                                <ReactionPicker
                                                    onSelect={(r) => {
                                                        handleReaction(r);
                                                        setShowReactionPicker(false);
                                                    }}
                                                    position="top"
                                                    className="right-0 left-auto bottom-full mb-2"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleReaction('like')}
                                                className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10 transition transform group-hover/react:scale-110 cursor-pointer"
                                            >
                                                <Icon icon="solar:heart-bold" width={24} className="text-rose-500" />
                                            </button>
                                            <span className="text-[11px] font-bold text-white text-center mt-1 block drop-shadow-md">
                                                {post.likesCount || 0}
                                            </span>
                                        </div>

                                        {/* Comments Drawer Button */}
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowComments((prev) => !prev)}
                                                className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10 transition transform hover:scale-110 cursor-pointer"
                                            >
                                                <Icon icon="solar:chat-round-dots-bold" width={24} className="text-indigo-400" />
                                            </button>
                                            <span className="text-[11px] font-bold text-white text-center mt-1 block drop-shadow-md">
                                                {post.commentsCount || 0}
                                            </span>
                                        </div>

                                        {/* Share Button */}
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowShareModal(true)}
                                                className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10 transition transform hover:scale-110 cursor-pointer"
                                            >
                                                <Icon icon="solar:share-bold" width={22} className="text-amber-400" />
                                            </button>
                                            <span className="text-[11px] font-bold text-white text-center mt-1 block drop-shadow-md">
                                                Share
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Video Progress Scrub Bar */}
                {!ytId && (
                    <div className="absolute inset-x-0 bottom-0 z-40 bg-linear-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col gap-1.5">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                        <div className="flex items-center justify-between text-white text-[11px] font-mono px-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments Drawer / Sidebar */}
            {showComments && (
                <div className="w-full md:w-96 lg:w-105 h-full bg-white z-50 flex flex-col border-l border-gray-200 shadow-2xl animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                        <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                            <Icon icon="solar:chat-round-dots-bold" className="text-indigo-600" width={20} />
                            Comments ({currentPost.commentsCount || 0})
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowComments(false)}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition cursor-pointer"
                        >
                            <Icon icon="solar:close-circle-bold" width={22} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <CommentSection
                            postId={String(currentPost._id)}
                            currentUser={currentUser}
                            onCommentCountChanged={(newCount) => {
                                if (onPostUpdated) {
                                    onPostUpdated({
                                        ...currentPost,
                                        commentsCount: newCount,
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    isOpen={showShareModal}
                    post={currentPost}
                    currentUser={currentUser}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>,
        document.body
    );
}
