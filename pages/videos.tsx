'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import HexAvatar from '../ui/HexAvatar';
import VideoViewerModal from '../ui/VideoViewerModal';
import type { ISocialPostData } from '../models/SocialMedia';

const CATEGORIES = [
    { id: 'all', label: 'All Videos', icon: 'solar:videocamera-record-bold' },
    { id: 'trending', label: 'Trending', icon: 'solar:fire-bold' },
    { id: 'shorts', label: 'Shorts & Reels', icon: 'solar:play-circle-bold' },
    { id: 'tech', label: 'Tech & Coding', icon: 'solar:laptop-minimalistic-bold' },
    { id: 'photography', label: 'Photography', icon: 'solar:camera-bold' },
    { id: 'nature', label: 'Nature & Travel', icon: 'solar:mountains-bold' },
    { id: 'music', label: 'Music & Audio', icon: 'solar:music-note-bold' },
    { id: 'community', label: 'Community', icon: 'solar:users-group-two-rounded-bold' },
];

function formatCount(num: number = 0): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num || 0);
}

function timeAgo(dateString: string | Date): string {
    if (!dateString) return 'Just now';
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function getYouTubeThumbnail(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export default function VideosPage() {
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    const [videos, setVideos] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);

    // Fetch video posts from API
    const fetchVideos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('type', 'video');
            params.set('limit', '50');

            const res = await fetch(`/api/social-media?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const fetched: ISocialPostData[] = (data.posts || []).filter(
                    (p: ISocialPostData) =>
                        p.type === 'video' ||
                        (p.videos && p.videos.length > 0) ||
                        (p.linkPreview && p.linkPreview.url && (p.linkPreview.url.includes('youtube.com') || p.linkPreview.url.includes('youtu.be')))
                );
                setVideos(fetched);
            } else {
                setVideos([]);
            }
        } catch (err) {
            console.error('Failed to fetch videos:', err);
            setVideos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    // Filter and search videos
    const filteredVideos = useMemo(() => {
        return videos.filter((vid) => {
            const matchSearch =
                !searchQuery.trim() ||
                (vid.content && vid.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (vid.userName && vid.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (vid.tags && vid.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

            if (!matchSearch) return false;

            if (selectedCategory === 'all') return true;
            if (selectedCategory === 'trending') {
                return (vid.likesCount || 0) + (vid.commentsCount || 0) >= 1;
            }
            if (selectedCategory === 'shorts') {
                return true;
            }
            return vid.tags && vid.tags.includes(selectedCategory);
        });
    }, [videos, searchQuery, selectedCategory]);

    // Split for Shorts Shelf (vertical / short duration videos)
    const shortsList = useMemo(() => {
        return videos.slice(0, 8);
    }, [videos]);

    // Featured Hero Video (top trending / latest)
    const featuredVideo = useMemo(() => {
        if (filteredVideos.length === 0) return null;
        return [...filteredVideos].sort(
            (a, b) => (b.likesCount || 0) + (b.commentsCount || 0) - ((a.likesCount || 0) + (a.commentsCount || 0))
        )[0];
    }, [filteredVideos]);

    const handleOpenViewer = (videoToOpen: ISocialPostData) => {
        const idx = filteredVideos.findIndex((v) => String(v._id) === String(videoToOpen._id));
        setActiveVideoIndex(idx >= 0 ? idx : 0);
    };

    return (
        <div className="min-h-screen text-gray-900 pb-24 pt-4">
            <div className="container mx-auto px-4 sm:px-6 space-y-6">

                {/* ═════════════════════════════════════════════════════════════
                    1. Hero Search & Category Navigation Bar
                   ═════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-200/90 space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        
                        {/* Title Badge */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-11 h-11 bg-linear-to-tr from-red-600 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-red-500/20">
                                <Icon icon="solar:videocamera-record-bold" width={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    Watch & Video Hub
                                </h1>
                                <p className="text-xs text-gray-500 font-medium">
                                    Explore video creations, tutorial clips, and community reels
                                </p>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="w-full md:max-w-md">
                            <div className="relative flex items-center">
                                <div className="absolute left-3.5 text-gray-400">
                                    <Icon icon="solar:magnifer-bold" width={18} />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search videos, creators, #tags..."
                                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Category Chips Bar */}
                    <div className="overflow-x-auto no-scrollbar flex items-center gap-2 pt-2 border-t border-gray-100">
                        {CATEGORIES.map((cat) => {
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-xs scale-102'
                                            : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon icon={cat.icon} width={15} className={isActive ? 'text-white' : 'text-gray-500'} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════
                    2. Featured Premier Hero Banner (If Available)
                   ═════════════════════════════════════════════════════════════ */}
                {featuredVideo && !searchQuery && selectedCategory === 'all' && (() => {
                    const featUrl = (featuredVideo.videos && featuredVideo.videos[0]) || (featuredVideo as any).videoUrl || featuredVideo.linkPreview?.url || '';
                    const featThumb = getYouTubeThumbnail(featUrl);

                    return (
                        <section>
                            <div
                                onClick={() => handleOpenViewer(featuredVideo)}
                                className="relative rounded-3xl overflow-hidden cursor-pointer group bg-white border border-gray-200/90 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-400"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                                    
                                    {/* Left: Thumbnail & Play Trigger */}
                                    <div className="lg:col-span-7 relative aspect-video bg-black overflow-hidden">
                                        {featThumb ? (
                                            <img
                                                src={featThumb}
                                                alt={featuredVideo.content || 'Featured video'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : featUrl ? (
                                            <video
                                                src={featUrl}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                muted
                                                playsInline
                                                preload="metadata"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
                                                <Icon icon="solar:videocamera-record-bold" width={64} />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300 backdrop-blur-xs">
                                                <Icon icon="solar:play-bold" width={28} className="ml-1" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md text-[11px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/30">
                                            Featured Premier
                                        </div>
                                    </div>

                                    {/* Right: Video Metadata */}
                                    <div className="lg:col-span-5 p-6 sm:p-8 space-y-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">
                                            <Icon icon="solar:fire-bold" />
                                            Trending Spotlight
                                        </div>

                                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                            {featuredVideo.content || 'Untitled Video Creation'}
                                        </h2>

                                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                            {featuredVideo.content}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <HexAvatar image={featuredVideo.userImage} size="md" />
                                                <div>
                                                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                                                        {featuredVideo.userName || 'Creator'}
                                                        <Icon icon="solar:verified-check-bold" className="text-blue-500" width={14} />
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        {timeAgo(featuredVideo.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                                                <span className="flex items-center gap-1">
                                                    <Icon icon="solar:like-bold" className="text-rose-500" />
                                                    {formatCount(featuredVideo.likesCount)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Icon icon="solar:chat-round-line-bold" className="text-blue-500" />
                                                    {formatCount(featuredVideo.commentsCount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })()}

                {/* ═════════════════════════════════════════════════════════════
                    3. Shorts & Reels Shelf (Vertical Reels)
                   ═════════════════════════════════════════════════════════════ */}
                {shortsList.length > 0 && selectedCategory !== 'trending' && !searchQuery && (
                    <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-gray-200/90 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-xs">
                                    <Icon icon="solar:play-circle-bold" width={20} />
                                </div>
                                <h2 className="text-base font-black text-gray-900 tracking-tight">Shorts & Clips</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 overflow-hidden">
                            {shortsList.map((short) => {
                                const shortUrl = (short.videos && short.videos[0]) || (short as any).videoUrl || short.linkPreview?.url || '';

                                return (
                                    <div
                                        key={short._id}
                                        onClick={() => handleOpenViewer(short)}
                                        className="group relative aspect-9/16 rounded-2xl overflow-hidden bg-black border border-gray-200 cursor-pointer shadow-xs hover:shadow-md hover:border-blue-500 transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {shortUrl ? (
                                            <video
                                                src={shortUrl}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                muted
                                                playsInline
                                                preload="metadata"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                <Icon icon="solar:play-circle-bold" width={32} className="text-gray-500" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-3">
                                            <div className="self-end px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                                                <Icon icon="solar:play-bold" width={10} className="text-red-500" />
                                                Shorts
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-blue-300 transition-colors">
                                                    {short.content || 'Short Reel'}
                                                </p>
                                                <span className="text-[10px] text-gray-300 block font-medium">
                                                    {formatCount(short.likesCount)} likes
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ═════════════════════════════════════════════════════════════
                    4. All Videos Grid (16:9 Cards)
                   ═════════════════════════════════════════════════════════════ */}
                <main className="space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Icon icon="solar:videocamera-record-bold" className="text-red-500" />
                            {searchQuery
                                ? `Search Results for "${searchQuery}"`
                                : selectedCategory === 'all'
                                ? 'Recommended Videos'
                                : `${selectedCategory.toUpperCase()} Videos`}
                        </h2>
                        <span className="text-xs text-gray-500 font-bold">
                            {filteredVideos.length} Video{filteredVideos.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div key={n} className="bg-white rounded-2xl p-3 space-y-3 shadow-xs border border-gray-200/80 animate-pulse">
                                    <div className="aspect-video bg-gray-200 rounded-xl" />
                                    <div className="flex gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                                            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-xs space-y-4 max-w-lg mx-auto my-8">
                            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                                <Icon icon="solar:videocamera-broken" width={32} />
                            </div>
                            <h3 className="text-base font-black text-gray-900">No Videos Found</h3>
                            <p className="text-xs text-gray-500">
                                {searchQuery
                                    ? 'No videos matched your search query. Try different keywords.'
                                    : 'No videos have been uploaded yet in this category.'}
                            </p>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {filteredVideos.map((video) => {
                                const videoUrl = (video.videos && video.videos[0]) || (video as any).videoUrl || video.linkPreview?.url || '';
                                const ytThumb = getYouTubeThumbnail(videoUrl);

                                return (
                                    <div
                                        key={video._id}
                                        onClick={() => handleOpenViewer(video)}
                                        className="group cursor-pointer bg-white rounded-2xl p-3 shadow-xs border border-gray-200/90 hover:shadow-md hover:border-blue-400 transition-all duration-300 space-y-3"
                                    >
                                        {/* 16:9 Thumbnail Box with Play Overlay */}
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-200 shadow-2xs">
                                            {ytThumb ? (
                                                <img
                                                    src={ytThumb}
                                                    alt={video.content || 'Video Thumbnail'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : videoUrl ? (
                                                <video
                                                    src={videoUrl}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
                                                    <Icon icon="solar:videocamera-record-bold" width={40} />
                                                </div>
                                            )}

                                            {/* Dark Vignette Overlay on Hover */}
                                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                    <Icon icon="solar:play-bold" width={22} className="ml-0.5" />
                                                </div>
                                            </div>

                                            {/* Duration / HD Badge */}
                                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[10px] font-black text-white">
                                                HD
                                            </div>
                                        </div>

                                        {/* Video Info Row (Avatar + Content & Channel) */}
                                        <div className="flex gap-2.5 items-start">
                                            <div className="shrink-0 mt-0.5">
                                                <HexAvatar image={video.userImage} size="sm" />
                                            </div>

                                            <div className="space-y-1 flex-1 min-w-0">
                                                <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                    {video.content || 'Untitled Video'}
                                                </h3>

                                                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium truncate">
                                                    <span>{video.userName || 'Creator'}</span>
                                                    <Icon icon="solar:verified-check-bold" className="text-blue-500 shrink-0" width={12} />
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                                    <span>{formatCount(video.likesCount)} likes</span>
                                                    <span>•</span>
                                                    <span>{timeAgo(video.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                5. Video Popup Viewer Modal (Seamless Playback as before)
               ═════════════════════════════════════════════════════════════ */}
            {activeVideoIndex !== null && filteredVideos.length > 0 && (
                <VideoViewerModal
                    videos={filteredVideos}
                    initialIndex={activeVideoIndex}
                    currentUser={currentUser}
                    onClose={() => setActiveVideoIndex(null)}
                    onPostUpdated={(updatedPost) => {
                        setVideos((prev) =>
                            prev.map((v) => (String(v._id) === String(updatedPost._id) ? updatedPost : v))
                        );
                    }}
                />
            )}
        </div>
    );
}
