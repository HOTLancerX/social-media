'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Icon } from '@iconify/react';
import StoryViewerModal from './StoryViewerModal';
import { GalleryModal } from '@/components/Gallery';
import { BG_PRESETS } from './Text-BG';

interface StoriesBarProps {
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
    } | null;
}

export default function StoriesBar({ currentUser }: StoriesBarProps) {
    const [storyGroups, setStoryGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

    // Embla Carousel Integration
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
    });

    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback((api: any) => {
        setPrevBtnDisabled(!api.canScrollPrev());
        setNextBtnDisabled(!api.canScrollNext());
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect(emblaApi);
        emblaApi.on('reInit', onSelect);
        emblaApi.on('select', onSelect);
        emblaApi.on('scroll', onSelect);
    }, [emblaApi, onSelect]);

    // Create Story states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createType, setCreateType] = useState<'media' | 'text'>('media');
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [textContent, setTextContent] = useState('');
    const [selectedBg, setSelectedBg] = useState(BG_PRESETS[0]);
    const [publishing, setPublishing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const loadStories = () => {
        setLoading(true);
        fetch('/api/social-media/stories')
            .then((r) => r.json())
            .then((res) => {
                setStoryGroups(res.stories || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadStories();
    }, []);

    // Re-initialize Embla when stories load
    useEffect(() => {
        if (emblaApi) {
            emblaApi.reInit();
        }
    }, [storyGroups, emblaApi]);

    const handleCreateMediaStory = async (selected: string | string[]) => {
        const mediaUrl = Array.isArray(selected) ? selected[0] : selected;
        if (!mediaUrl) return;

        setPublishing(true);
        setErrorMsg('');
        try {
            const isVideo = mediaUrl.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mediaUrl.includes('/video/');
            const res = await fetch('/api/social-media/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaType: isVideo ? 'video' : 'image',
                    mediaUrl,
                }),
            });

            if (res.ok) {
                setShowGalleryModal(false);
                setShowCreateModal(false);
                loadStories();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Failed to publish story');
            }
        } catch (err) {
            setErrorMsg('Network error while publishing story');
        } finally {
            setPublishing(false);
        }
    };

    const handleCreateTextStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textContent.trim()) return;

        setPublishing(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/social-media/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaType: 'text',
                    textContent: textContent.trim(),
                    bgStyle: selectedBg,
                }),
            });

            if (res.ok) {
                setTextContent('');
                setShowCreateModal(false);
                loadStories();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Failed to publish text story');
            }
        } catch (err) {
            setErrorMsg('Network error while publishing story');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="relative mb-5 select-none group/stories">
            {/* Left Carousel Navigation Button */}
            {!prevBtnDisabled && (
                <button
                    type="button"
                    onClick={scrollPrev}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-xl border border-gray-200/80 text-gray-700 hover:text-indigo-600 hover:bg-white flex items-center justify-center transition transform hover:scale-115 active:scale-95 cursor-pointer shadow-black/10"
                    aria-label="Previous Stories"
                >
                    <Icon icon="solar:alt-arrow-left-bold" width={22} />
                </button>
            )}

            {/* Right Carousel Navigation Button */}
            {!nextBtnDisabled && (
                <button
                    type="button"
                    onClick={scrollNext}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-xl border border-gray-200/80 text-gray-700 hover:text-indigo-600 hover:bg-white flex items-center justify-center transition transform hover:scale-115 active:scale-95 cursor-pointer shadow-black/10"
                    aria-label="Next Stories"
                >
                    <Icon icon="solar:alt-arrow-right-bold" width={22} />
                </button>
            )}

            {/* Embla Carousel Viewport */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-3 py-1 px-1">
                    {/* 1. Create Story Card Slide */}
                    <div className="flex-[0_0_auto]">
                        <div
                            onClick={() => {
                                if (!currentUser?._id) {
                                    window.location.href = '/login';
                                    return;
                                }
                                setShowCreateModal(true);
                            }}
                            className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200/80 shrink-0 cursor-pointer group flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="w-full h-32 overflow-hidden bg-indigo-50">
                                {currentUser?.image ? (
                                    <img
                                        src={currentUser.image}
                                        alt="My Avatar"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl">
                                        {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-26 inset-x-0 flex justify-center">
                                <div className="w-9 h-9 rounded-full bg-indigo-600 border-4 border-white text-white flex items-center justify-center shadow-md group-hover:bg-indigo-700 group-hover:scale-110 transition duration-300">
                                    <Icon icon="solar:add-circle-bold" width={20} />
                                </div>
                            </div>

                            <div className="p-2 pt-4 text-center bg-white">
                                <p className="text-[11px] font-bold text-gray-800 leading-tight">Create Story</p>
                            </div>
                        </div>
                    </div>

                    {/* Loading Skeleton Stream */}
                    {loading &&
                        Array.from({ length: 4 }).map((_, idx) => (
                            <div key={`skeleton-${idx}`} className="flex-[0_0_auto]">
                                <div className="w-28 sm:w-32 h-44 sm:h-48 rounded-2xl bg-gray-200/80 animate-pulse shrink-0 flex flex-col justify-between p-3 border border-gray-100">
                                    <div className="w-8 h-8 rounded-full bg-gray-300/80" />
                                    <div className="w-16 h-3 rounded-full bg-gray-300/80" />
                                </div>
                            </div>
                        ))}

                    {/* 2. Active Stories Stream with Animated Latest/New Badge */}
                    {!loading &&
                        storyGroups.map((group, idx) => {
                            const firstStory = group.stories[0];
                            const previewImg =
                                firstStory?.mediaUrl ||
                                group.userImage ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

                            // Check if this story was created recently (within last 3 hours)
                            const isRecent =
                                group.latestCreatedAt &&
                                Date.now() - new Date(group.latestCreatedAt).getTime() < 3 * 60 * 60 * 1000;
                            const isNewUnviewed = group.hasUnviewed || isRecent;

                            return (
                                <div key={`story-group-${group.userId || idx}-${idx}`} className="flex-[0_0_auto]">
                                    <div
                                        onClick={() => setActiveGroupIndex(idx)}
                                        style={{ animationDelay: `${idx * 75}ms` }}
                                        className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-2xl overflow-hidden shadow-sm border border-gray-200 shrink-0 cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-right-3"
                                    >
                                        {firstStory?.mediaType === 'text' ? (
                                            <div
                                                className="w-full h-full flex items-center justify-center p-3 text-center"
                                                style={{
                                                    background:
                                                        firstStory.bgStyle?.gradient ||
                                                        'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                                }}
                                            >
                                                <p className="text-white text-[11px] font-bold line-clamp-4 drop-shadow-md">
                                                    {firstStory.textContent}
                                                </p>
                                            </div>
                                        ) : (
                                            <img
                                                src={previewImg}
                                                alt={group.userName}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                                            />
                                        )}

                                        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-black/30" />

                                        {/* User Avatar with Animated Gradient Story Ring */}
                                        <div className="absolute top-2.5 left-2.5 z-10">
                                            <div
                                                className={`p-0.5 rounded-full shadow-md ${
                                                    isNewUnviewed
                                                        ? 'bg-linear-to-tr from-rose-500 via-amber-400 to-indigo-600 animate-pulse ring-2 ring-rose-400/50'
                                                        : 'bg-gray-400/80'
                                                }`}
                                            >
                                                {group.userImage ? (
                                                    <img
                                                        src={group.userImage}
                                                        alt={group.userName}
                                                        className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white">
                                                        {group.userName?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Animated "NEW" Live Indicator Badge for Latest Stories */}
                                        {isNewUnviewed && (
                                            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/20 shadow-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                <span className="text-[9px] font-black text-white tracking-wider">
                                                    NEW
                                                </span>
                                            </div>
                                        )}

                                        {/* User Name */}
                                        <div className="absolute bottom-2.5 inset-x-2.5 z-10">
                                            <p className="text-xs font-bold text-white truncate drop-shadow-md">
                                                {group.isMine ? 'Your Story' : group.userName}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Lightbox / Fullscreen Story Viewer */}
            {activeGroupIndex !== null && storyGroups[activeGroupIndex] && (
                <StoryViewerModal
                    userGroup={storyGroups[activeGroupIndex]}
                    onClose={() => setActiveGroupIndex(null)}
                    onNextUser={() => {
                        if (activeGroupIndex < storyGroups.length - 1) {
                            setActiveGroupIndex(activeGroupIndex + 1);
                        } else {
                            setActiveGroupIndex(null);
                        }
                    }}
                    onPrevUser={() => {
                        if (activeGroupIndex > 0) {
                            setActiveGroupIndex(activeGroupIndex - 1);
                        }
                    }}
                />
            )}

            {/* Create Story Modal */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                <Icon icon="solar:camera-add-bold" className="text-indigo-600" width={22} />
                                Create a Story
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                            >
                                <Icon icon="solar:close-circle-bold" width={24} />
                            </button>
                        </div>

                        {/* Format Selection Tabs */}
                        <div className="flex p-2 bg-gray-50/80 m-4 rounded-2xl border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setCreateType('media')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                    createType === 'media'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Icon icon="solar:gallery-bold" width={18} />
                                Photo / Video Story
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateType('text')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                                    createType === 'text'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Icon icon="solar:text-bold" width={18} />
                                Text Story
                            </button>
                        </div>

                        {/* Tab 1: Media Story (Gallery Integration) */}
                        {createType === 'media' && (
                            <div className="p-6 pt-2 text-center space-y-4">
                                <div
                                    onClick={() => setShowGalleryModal(true)}
                                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/80 transition group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition duration-300">
                                        <Icon icon="solar:gallery-add-bold" width={28} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800">
                                        Select from Media Gallery
                                    </h4>
                                    <p className="text-xs text-gray-500 max-w-xs">
                                        Choose high-resolution photos or videos from your library to publish as a 24-hour story.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Text Story */}
                        {createType === 'text' && (
                            <form onSubmit={handleCreateTextStory} className="p-6 pt-2 space-y-4">
                                {/* Preview Card */}
                                <div
                                    className="w-full h-56 rounded-3xl p-6 flex items-center justify-center text-center shadow-inner transition-all duration-300"
                                    style={{
                                        background: selectedBg.gradient,
                                    }}
                                >
                                    <p className="text-white font-black text-xl leading-relaxed drop-shadow-md select-none wrap-break-word max-w-xs">
                                        {textContent || 'Start typing your story...'}
                                    </p>
                                </div>

                                {/* Text Input */}
                                <div>
                                    <textarea
                                        rows={3}
                                        placeholder="What's on your mind?..."
                                        value={textContent}
                                        onChange={(e) => setTextContent(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:bg-white text-xs font-semibold outline-none transition resize-none"
                                        maxLength={250}
                                    />
                                    <div className="flex justify-end text-[10px] text-gray-400 mt-1">
                                        {textContent.length}/250
                                    </div>
                                </div>

                                {/* Background Theme Selector */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-600 mb-2 block">
                                        Choose Gradient Theme:
                                    </label>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                        {BG_PRESETS.map((bg) => (
                                            <button
                                                key={bg.id}
                                                type="button"
                                                onClick={() => setSelectedBg(bg)}
                                                className={`w-9 h-9 rounded-xl shrink-0 cursor-pointer transition transform hover:scale-110 ${
                                                    selectedBg.id === bg.id
                                                        ? 'ring-3 ring-indigo-600 ring-offset-2 scale-105'
                                                        : 'opacity-80'
                                                }`}
                                                style={{ background: bg.gradient }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Error alert */}
                                {errorMsg && (
                                    <p className="text-xs text-rose-500 font-bold">{errorMsg}</p>
                                )}

                                {/* Action button */}
                                <button
                                    type="submit"
                                    disabled={publishing || !textContent.trim()}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {publishing ? (
                                        <>
                                            <Icon icon="line-md:loading-twotone-loop" width={18} />
                                            Publishing...
                                        </>
                                    ) : (
                                        'Share to Story'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Gallery Picker Modal */}
            <GalleryModal
                isOpen={showGalleryModal}
                onClose={() => setShowGalleryModal(false)}
                multiple={false}
                selectedImages={[]}
                onSelect={(url) => handleCreateMediaStory(url)}
            />
        </div>
    );
}
