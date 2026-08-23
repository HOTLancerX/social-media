'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { Icon } from '@iconify/react';
import FacebookEmoji from './FacebookEmoji';

interface StoryViewerModalProps {
    userGroup: {
        userId: string;
        userName: string;
        userImage?: string;
        userSlug?: string;
        isMine?: boolean;
        stories: any[];
    };
    onClose: () => void;
    onNextUser?: () => void;
    onPrevUser?: () => void;
}

interface FloatingReaction {
    id: number;
    reaction: string;
    left: number;
    userName?: string;
    userImage?: string;
}

export default function StoryViewerModal({
    userGroup,
    onClose,
    onNextUser,
    onPrevUser,
}: StoryViewerModalProps) {
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [replySent, setReplySent] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [showViewersDrawer, setShowViewersDrawer] = useState(false);
    const [viewersTab, setViewersTab] = useState<'all' | 'reactions'>('all');

    // Embla Carousel Integration for swipe/slide navigation
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        duration: 25,
        skipSnaps: false,
    });

    const currentStory = userGroup.stories[storyIndex] || userGroup.stories[0];
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const viewersList = currentStory?.viewers || [];
    const reactionsList = currentStory?.reactions || [];

    // Sync Embla when userGroup changes
    useEffect(() => {
        setStoryIndex(0);
        setProgress(0);
        setReplyText('');
        setShowViewersDrawer(false);
        if (emblaApi) {
            emblaApi.scrollTo(0, true);
        }
    }, [userGroup.userId, emblaApi]);

    // Handle Embla slide selection
    const onSelectSlide = useCallback(() => {
        if (!emblaApi) return;
        const selected = emblaApi.selectedScrollSnap();
        setStoryIndex(selected);
        setProgress(0);
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelectSlide);
        emblaApi.on('pointerDown', () => setIsPaused(true));
        emblaApi.on('pointerUp', () => setIsPaused(false));
    }, [emblaApi, onSelectSlide]);

    // Trigger Facebook-style entrance floating animation for existing likes when opening a story
    useEffect(() => {
        if (!currentStory?._id || reactionsList.length === 0) return;

        const timeouts: NodeJS.Timeout[] = [];
        reactionsList.forEach((r: any, idx: number) => {
            const t = setTimeout(() => {
                const newBubble: FloatingReaction = {
                    id: Date.now() + Math.random(),
                    reaction: r.reaction || 'love',
                    left: 20 + (idx % 4) * 20 + Math.random() * 8,
                    userName: r.userName,
                    userImage: r.userImage,
                };
                setFloatingReactions((prev) => [...prev, newBubble]);

                setTimeout(() => {
                    setFloatingReactions((prev) => prev.filter((item) => item.id !== newBubble.id));
                }, 2200);
            }, idx * 450);
            timeouts.push(t);
        });

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [currentStory?._id]);

    // Mark current story as viewed
    useEffect(() => {
        if (currentStory?._id) {
            fetch('/api/social-media/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'view',
                    storyId: currentStory._id,
                }),
            }).catch(() => {});
        }
    }, [currentStory?._id]);

    // Previous Story / Previous User Navigation
    const handlePrevStory = useCallback(() => {
        if (showViewersDrawer) return;
        if (emblaApi && emblaApi.canScrollPrev()) {
            emblaApi.scrollPrev();
            setProgress(0);
        } else if (onPrevUser) {
            onPrevUser();
        }
    }, [showViewersDrawer, emblaApi, onPrevUser]);

    // Next Story / Next User Navigation
    const handleNextStory = useCallback(() => {
        if (showViewersDrawer) return;
        if (emblaApi && emblaApi.canScrollNext()) {
            emblaApi.scrollNext();
            setProgress(0);
        } else if (onNextUser) {
            onNextUser();
        } else {
            onClose();
        }
    }, [showViewersDrawer, emblaApi, onNextUser, onClose]);

    // Auto-advance when progress reaches 100%
    useEffect(() => {
        if (progress >= 100 && !isPaused && !showViewersDrawer) {
            handleNextStory();
            setProgress(0);
        }
    }, [progress, isPaused, showViewersDrawer, handleNextStory]);

    // Progress timer
    useEffect(() => {
        if (isPaused || showViewersDrawer) return;

        const duration = 5000; // 5 seconds per story
        const interval = 50; // update every 50ms
        const step = (interval / duration) * 100;

        timerRef.current = setInterval(() => {
            setProgress((prev) => Math.min(100, prev + step));
        }, interval);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused, showViewersDrawer, storyIndex, userGroup.userId]);

    // Handle emoji reaction with Facebook-style floating animation
    const handleReaction = async (e: React.MouseEvent, reactionType: string) => {
        e.stopPropagation();
        if (!currentStory?._id) return;

        // Spawn floating reaction particles
        const spawnReactions: FloatingReaction[] = [
            {
                id: Date.now() + Math.random(),
                reaction: reactionType,
                left: 30 + Math.random() * 45,
            },
            {
                id: Date.now() + Math.random() + 1,
                reaction: reactionType,
                left: 20 + Math.random() * 55,
            },
        ];

        setFloatingReactions((prev) => [...prev, ...spawnReactions]);

        setTimeout(() => {
            setFloatingReactions((prev) =>
                prev.filter((r) => !spawnReactions.some((sr) => sr.id === r.id))
            );
        }, 2000);

        try {
            const res = await fetch('/api/social-media/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'react',
                    storyId: currentStory._id,
                    reaction: reactionType,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.reactions) {
                    currentStory.reactions = data.reactions;
                }
            }
        } catch (err) {
            console.error('Failed to send reaction:', err);
        }
    };

    // Handle sending reply
    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!replyText.trim() || !currentStory?._id || sendingReply) return;

        setSendingReply(true);
        try {
            const res = await fetch('/api/social-media/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reply',
                    storyId: currentStory._id,
                    replyText: replyText.trim(),
                }),
            });
            if (res.ok) {
                setReplyText('');
                setReplySent(true);
                setTimeout(() => setReplySent(false), 2500);
            }
        } catch (err) {
            console.error('Failed to send reply:', err);
        } finally {
            setSendingReply(false);
        }
    };

    const hasPrev = (emblaApi && emblaApi.canScrollPrev()) || Boolean(onPrevUser);
    const hasNext = (emblaApi && emblaApi.canScrollNext()) || Boolean(onNextUser);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-99999 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in"
            onClick={onClose}
        >
            {/* Left Carousel Navigation Arrow (Previous Story/User) */}
            {hasPrev && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrevStory();
                    }}
                    className="hidden sm:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white backdrop-blur-md items-center justify-center shadow-2xl transition transform hover:scale-110 cursor-pointer border border-white/20"
                    aria-label="Previous Story"
                >
                    <Icon icon="solar:alt-arrow-left-bold" width={28} />
                </button>
            )}

            {/* Right Carousel Navigation Arrow (Next Story/User) */}
            {hasNext && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNextStory();
                    }}
                    className="hidden sm:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white backdrop-blur-md items-center justify-center shadow-2xl transition transform hover:scale-110 cursor-pointer border border-white/20"
                    aria-label="Next Story"
                >
                    <Icon icon="solar:alt-arrow-right-bold" width={28} />
                </button>
            )}

            {/* Main Story Container */}
            <div
                className="relative w-full max-w-sm sm:max-w-md h-[90vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Top Story Progress Bars */}
                <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5 pointer-events-none">
                    {userGroup.stories.map((s, idx) => (
                        <div key={`story-bar-${s._id || idx}-${idx}`} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-75"
                                style={{
                                    width:
                                        idx < storyIndex
                                            ? '100%'
                                            : idx === storyIndex
                                            ? `${progress}%`
                                            : '0%',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* 2. Top Header User Info, Viewers Button & Close Button */}
                <div
                    className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Link
                        href={`/${userGroup.userSlug || userGroup.userId}`}
                        className="flex items-center gap-2.5 group"
                    >
                        {userGroup.userImage ? (
                            <img
                                src={userGroup.userImage}
                                alt={userGroup.userName}
                                className="w-9 h-9 rounded-full object-cover border-2 border-white/60 shadow-md group-hover:scale-105 transition"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                                {userGroup.userName?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold drop-shadow-md group-hover:underline">
                                {userGroup.userName}
                            </p>
                            <p className="text-[10px] text-white/70">
                                {currentStory?.createdAt
                                    ? new Date(currentStory.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                      })
                                    : ''}
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5">
                        {/* View & Reactions Drawer Trigger Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowViewersDrawer(true);
                                setIsPaused(true);
                            }}
                            className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            title="View viewers & reactions"
                        >
                            <Icon icon="solar:eye-bold" width={14} />
                            <span>{viewersList.length}</span>
                            {reactionsList.length > 0 && (
                                <span className="flex items-center gap-0.5 border-l border-white/30 pl-1.5 ml-0.5 text-amber-300">
                                    <Icon icon="solar:heart-bold" width={12} className="text-rose-400" />
                                    <span>{reactionsList.length}</span>
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPaused(!isPaused);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                            title={isPaused ? 'Resume' : 'Pause'}
                        >
                            <Icon icon={isPaused ? 'solar:play-bold' : 'solar:pause-bold'} width={18} />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                            title="Close"
                        >
                            <Icon icon="solar:close-circle-bold" width={20} />
                        </button>
                    </div>
                </div>

                {/* 3. Embla Carousel Story Media Content Viewport */}
                <div className="relative w-full h-full overflow-hidden" ref={emblaRef}>
                    <div className="flex h-full">
                        {userGroup.stories.map((story, idx) => (
                            <div
                                key={`story-slide-${story._id || idx}-${idx}`}
                                className="flex-[0_0_100%] h-full relative flex items-center justify-center overflow-hidden"
                            >
                                {story.mediaType === 'image' && (
                                    <img
                                        src={story.mediaUrl}
                                        alt="Story"
                                        className="w-full h-full object-cover select-none"
                                    />
                                )}

                                {story.mediaType === 'video' && (
                                    <video
                                        src={story.mediaUrl}
                                        autoPlay={idx === storyIndex}
                                        playsInline
                                        muted={false}
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {story.mediaType === 'text' && (
                                    <div
                                        className="w-full h-full flex items-center justify-center p-8 text-center"
                                        style={{
                                            background:
                                                story.bgStyle?.gradient ||
                                                'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                        }}
                                    >
                                        <p className="text-white font-black text-xl sm:text-2xl leading-relaxed drop-shadow-lg select-text">
                                            {story.textContent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Navigation Tap Zones on mobile */}
                    <div
                        className="absolute inset-y-16 left-0 w-1/3 z-20 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevStory();
                        }}
                    />
                    <div
                        className="absolute inset-y-16 right-0 w-1/3 z-20 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNextStory();
                        }}
                    />

                    {/* Facebook-style Animated Floating Reactions & Likes going Bottom-to-Top */}
                    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                        {floatingReactions.map((r) => (
                            <div
                                key={`floating-${r.id}`}
                                className="absolute bottom-20 animate-float-up flex items-center gap-1.5 drop-shadow-xl"
                                style={{ left: `${r.left}%` }}
                            >
                                {r.userImage && (
                                    <img
                                        src={r.userImage}
                                        alt={r.userName || ''}
                                        className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-md"
                                    />
                                )}
                                <div className="bg-white/90 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/50 flex items-center justify-center">
                                    <FacebookEmoji type={r.reaction} size="xs" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Bottom Quick Reply & Facebook Animated Reaction Buttons */}
                <div
                    className="absolute bottom-4 inset-x-4 z-30 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Sent Confirmation Toast */}
                    {replySent && (
                        <div className="bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold py-1.5 px-4 rounded-full text-center shadow-lg animate-in fade-in">
                            Reply sent to {userGroup.userName}!
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {/* Reply Form */}
                        <form onSubmit={handleSendReply} className="flex-1 relative flex items-center">
                            <input
                                type="text"
                                placeholder={`Reply to ${userGroup.userName}...`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-white/20 hover:bg-white/30 focus:bg-white/40 text-white placeholder-white/70 text-xs pl-4 pr-9 py-2.5 rounded-full backdrop-blur-md border border-white/20 outline-none transition"
                            />
                            {replyText.trim() && (
                                <button
                                    type="submit"
                                    disabled={sendingReply}
                                    className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    <Icon icon="solar:plain-bold" width={14} />
                                </button>
                            )}
                        </form>

                        {/* Animated Facebook Reaction Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            {[
                                { type: 'like', label: 'Like' },
                                { type: 'love', label: 'Love' },
                                { type: 'haha', label: 'Haha' },
                                { type: 'wow', label: 'Wow' },
                                { type: 'sad', label: 'Sad' },
                                { type: 'angry', label: 'Angry' },
                            ].map((r) => (
                                <button
                                    key={r.type}
                                    type="button"
                                    onClick={(e) => handleReaction(e, r.type)}
                                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 active:scale-125 backdrop-blur-md flex items-center justify-center transition transform hover:scale-115 cursor-pointer select-none"
                                    title={r.label}
                                >
                                    <FacebookEmoji type={r.type} size="xxs" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 5. Facebook-Style Story Viewers & Reactions Sheet/Drawer */}
                {showViewersDrawer && (
                    <div
                        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowViewersDrawer(false);
                            setIsPaused(false);
                        }}
                    >
                        <div
                            className="bg-white rounded-t-3xl max-h-[70%] h-[70%] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:eye-bold" className="text-indigo-600" width={18} />
                                    <h3 className="font-black text-gray-900 text-sm">
                                        Story Insights
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowViewersDrawer(false);
                                        setIsPaused(false);
                                    }}
                                    className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-bold" width={20} />
                                </button>
                            </div>

                            {/* Drawer Tabs */}
                            <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-100 bg-gray-50/70">
                                <button
                                    type="button"
                                    onClick={() => setViewersTab('all')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                        viewersTab === 'all'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200/70'
                                    }`}
                                >
                                    <Icon icon="solar:eye-bold" width={14} />
                                    <span>Views ({viewersList.length})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setViewersTab('reactions')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                        viewersTab === 'reactions'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200/70'
                                    }`}
                                >
                                    <Icon icon="solar:heart-bold" width={14} className="text-rose-400" />
                                    <span>Reactions ({reactionsList.length})</span>
                                </button>
                            </div>

                            {/* Viewers / Reactions User List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
                                {viewersTab === 'all' ? (
                                    viewersList.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400 text-xs font-medium">
                                            No views yet
                                        </div>
                                    ) : (
                                        viewersList.map((viewer: any, idx: number) => {
                                            const matchedReaction = reactionsList.find(
                                                (r: any) => String(r.userId) === String(viewer.userId)
                                            );
                                            return (
                                                <div
                                                    key={`viewer-${viewer.userId || idx}-${idx}`}
                                                    className="flex items-center justify-between pt-3 first:pt-0 gap-3"
                                                >
                                                    <Link
                                                        href={`/${viewer.userSlug || viewer.userId}`}
                                                        onClick={onClose}
                                                        className="flex items-center gap-3 min-w-0 group flex-1"
                                                    >
                                                        <div className="relative shrink-0">
                                                            {viewer.userImage ? (
                                                                <img
                                                                    src={viewer.userImage}
                                                                    alt={viewer.userName}
                                                                    className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                                                    {viewer.userName?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            {matchedReaction && (
                                                                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden bg-white shadow-xs border border-gray-100 flex items-center justify-center">
                                                                    <FacebookEmoji type={matchedReaction.reaction} size="xxs" />
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 truncate transition">
                                                                {viewer.userName}
                                                            </h4>
                                                            <p className="text-[10px] text-gray-400 truncate">
                                                                {viewer.viewedAt
                                                                    ? new Date(viewer.viewedAt).toLocaleTimeString([], {
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      })
                                                                    : 'Recently'}
                                                            </p>
                                                        </div>
                                                    </Link>

                                                    <Link
                                                        href={`/${viewer.userSlug || viewer.userId}`}
                                                        onClick={onClose}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 text-xs font-bold rounded-xl transition shrink-0"
                                                    >
                                                        Profile
                                                    </Link>
                                                </div>
                                            );
                                        })
                                    )
                                ) : reactionsList.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 text-xs font-medium">
                                        No reactions yet
                                    </div>
                                ) : (
                                    reactionsList.map((reactor: any, idx: number) => (
                                        <div
                                            key={`reactor-${reactor.userId || idx}-${idx}`}
                                            className="flex items-center justify-between pt-3 first:pt-0 gap-3"
                                        >
                                            <Link
                                                href={`/${reactor.userSlug || reactor.userId}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 min-w-0 group flex-1"
                                            >
                                                <div className="relative shrink-0">
                                                    {reactor.userImage ? (
                                                        <img
                                                            src={reactor.userImage}
                                                            alt={reactor.userName}
                                                            className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                                            {reactor.userName?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden bg-white shadow-xs border border-gray-100 flex items-center justify-center">
                                                        <FacebookEmoji type={reactor.reaction} size="xxs" />
                                                    </span>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 truncate transition">
                                                        {reactor.userName}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 truncate capitalize">
                                                        Reacted {reactor.reaction}
                                                    </p>
                                                </div>
                                            </Link>

                                            <Link
                                                href={`/${reactor.userSlug || reactor.userId}`}
                                                onClick={onClose}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 text-xs font-bold rounded-xl transition shrink-0"
                                            >
                                                Profile
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
