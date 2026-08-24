"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@iconify/react";
import PostCard from "../ui/PostCard";
import VideoViewerModal from "../ui/VideoViewerModal";
import type { ISocialPostData } from "../models/SocialMedia";

type SavedCategory = "all" | "image" | "video" | "poll" | "text";

export default function SavedPage() {
    const { data: session, status } = useSession();
    const currentUser = (session?.user as any) || null;
    const currentUserId = currentUser?._id || currentUser?.id;

    const [savedPosts, setSavedPosts] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<SavedCategory>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSort, setSelectedSort] = useState<"newest" | "oldest" | "likes">("newest");
    const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);

    // Fetch strictly only the saved posts for the logged-in user
    const fetchSavedPosts = useCallback(async () => {
        if (!currentUserId) {
            if (status !== "loading") {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/social-media/save");
            const data = await res.json();
            if (res.ok && Array.isArray(data.posts)) {
                setSavedPosts(data.posts);
            } else {
                setSavedPosts([]);
            }
        } catch (err) {
            console.error("Error fetching saved posts:", err);
            setSavedPosts([]);
        } finally {
            setLoading(false);
        }
    }, [currentUserId, status]);

    useEffect(() => {
        if (status !== "loading") {
            fetchSavedPosts();
        }
    }, [fetchSavedPosts, status]);

    // Unsave / remove handler
    const handlePostDeletedOrUnsaved = (postId: string) => {
        setSavedPosts((prev) => prev.filter((p) => String(p._id) !== postId && p.shortId !== postId));
    };

    // Filter and search through saved posts
    const filteredPosts = useMemo(() => {
        return savedPosts.filter((post) => {
            // Category filter
            if (activeCategory === "image" && post.type !== "image" && (!post.images || post.images.length === 0)) {
                return false;
            }
            if (activeCategory === "video" && post.type !== "video" && (!post.videos || post.videos.length === 0)) {
                return false;
            }
            if (activeCategory === "poll" && post.type !== "poll" && !post.poll) {
                return false;
            }
            if (activeCategory === "text" && post.type !== "text" && post.type !== "text-bg") {
                return false;
            }

            // Keyword search
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesContent = post.content?.toLowerCase().includes(query);
                const matchesAuthor = post.userName?.toLowerCase().includes(query);
                const matchesTags = post.tags?.some((t) => t.toLowerCase().includes(query));
                if (!matchesContent && !matchesAuthor && !matchesTags) return false;
            }

            return true;
        }).sort((a, b) => {
            if (selectedSort === "oldest") {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            if (selectedSort === "likes") {
                const aLikes = (a.likesCount || 0) + (a.reactionsCount?.like || 0) + (a.reactionsCount?.love || 0);
                const bLikes = (b.likesCount || 0) + (b.reactionsCount?.like || 0) + (b.reactionsCount?.love || 0);
                return bLikes - aLikes;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [savedPosts, activeCategory, searchQuery, selectedSort]);

    // Categories count mapping
    const categoryCounts = useMemo(() => {
        const counts = { all: savedPosts.length, image: 0, video: 0, poll: 0, text: 0 };
        savedPosts.forEach((p) => {
            if (p.type === "image" || (p.images && p.images.length > 0)) counts.image++;
            if (p.type === "video" || (p.videos && p.videos.length > 0)) counts.video++;
            if (p.type === "poll" || p.poll) counts.poll++;
            if (p.type === "text" || p.type === "text-bg") counts.text++;
        });
        return counts;
    }, [savedPosts]);

    // Collect all video URLs for Lightbox modal
    const allVideos = useMemo(() => {
        const list: any[] = [];
        filteredPosts.forEach((post) => {
            if (post.videos && post.videos.length > 0) {
                post.videos.forEach((vidUrl) => {
                    list.push({
                        url: vidUrl,
                        author: post.userName,
                        caption: post.content,
                        avatar: post.userImage,
                    });
                });
            }
        });
        return list;
    }, [filteredPosts]);

    return (
        <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-20 pt-4">
            <div className="container py-4">
                
                {/* ── Page Header / Hero Banner ── */}
                <div className="mb-6 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
                                <Icon icon="solar:bookmark-bold" />
                                Private Bookmarks
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                                My Saved Information & Posts
                            </h1>
                            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
                                Revisit your bookmarked articles, photos, video reels, and discussions anytime. Only visible to you.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center">
                                <span className="block text-2xl font-black leading-tight">{savedPosts.length}</span>
                                <span className="text-[11px] text-blue-100 font-bold uppercase tracking-wider">Saved Items</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3-Column Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* ═════════════════════════════════════════════════════════════
                        1. LEFT SIDEBAR: Navigation & Saved Categories (Col 1-3)
                       ═════════════════════════════════════════════════════════════ */}
                    <aside className="lg:col-span-3 space-y-5 sticky top-20">
                        
                        {/* 1. Main Navigation Feed Filters */}
                        <div className="bg-white rounded-3xl p-3 shadow-xs border border-gray-200/90 space-y-1">
                            {[
                                { id: 'all', label: 'All Feeds', href: '/', icon: 'solar:feed-bold', color: 'text-blue-500', active: false },
                                { id: 'video', label: 'Watch Videos', href: '/videos', icon: 'solar:videocamera-record-bold', color: 'text-red-500', active: false },
                                { id: 'groups', label: 'Community Groups', href: '/groups', icon: 'solar:users-group-two-rounded-bold', color: 'text-purple-500', active: false },
                                { id: 'image', label: 'Photos Only', href: '/?type=image', icon: 'solar:gallery-wide-bold', color: 'text-rose-500', active: false },
                                { id: 'poll', label: 'Community Polls', href: '/?type=poll', icon: 'solar:chart-2-bold', color: 'text-amber-500', active: false },
                                { id: 'popular', label: 'Trending & Popular', href: '/?type=popular', icon: 'solar:fire-bold', color: 'text-orange-500', active: false },
                                { id: 'members', label: 'Members Directory', href: '/members', icon: 'solar:users-group-rounded-bold', color: 'text-indigo-500', active: false },
                                ...(currentUser
                                    ? [
                                          { id: 'my-posts', label: 'My Posts', href: '/?type=my-posts', icon: 'solar:user-bold', color: 'text-cyan-500', active: false },
                                          { id: 'saves', label: 'Saved Posts', href: '/saves', icon: 'solar:bookmark-bold', color: 'text-amber-500', active: true },
                                      ]
                                    : []),
                            ].map((item) => {
                                const targetHref = item.active ? '/' : item.href;

                                return (
                                    <Link
                                        key={item.id}
                                        href={targetHref}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group ${
                                            item.active
                                                ? 'bg-blue-50 text-blue-600 shadow-2xs translate-x-1'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                                        }`}
                                    >
                                    <span className="flex items-center gap-3">
                                        <Icon
                                            icon={item.icon}
                                            width={18}
                                            className={`transition-transform duration-200 group-hover:scale-110 ${
                                                item.active ? 'text-blue-600' : item.color
                                            }`}
                                        />
                                        <span>{item.label}</span>
                                    </span>
                                    {item.active && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                    )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* 2. Collections & Category Filters */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-5">
                            
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Icon icon="solar:folder-favourite-bookmark-bold" className="text-indigo-600" width={18} />
                                    Saved Collections
                                </h3>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="text-[11px] font-bold text-red-600 hover:text-red-700 transition"
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>

                            {/* Search in Saved */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Icon icon="solar:magnifer-bold" className="text-gray-400" />
                                    Search Saved Posts
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by keywords..."
                                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-gray-50/60 hover:bg-white transition"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <Icon icon="solar:close-circle-bold" width={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category Filter List */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Filter by Content Type
                                </label>

                                {[
                                    { id: "all", label: "All Saved Items", icon: "solar:bookmark-square-bold", count: categoryCounts.all },
                                    { id: "image", label: "Photos & Albums", icon: "solar:gallery-wide-bold", count: categoryCounts.image },
                                    { id: "video", label: "Videos & Reels", icon: "solar:videocamera-record-bold", count: categoryCounts.video },
                                    { id: "poll", label: "Polls & Votes", icon: "solar:chart-2-bold", count: categoryCounts.poll },
                                    { id: "text", label: "Text & Notes", icon: "solar:notes-bold", count: categoryCounts.text },
                                ].map((cat) => {
                                    const isSelected = activeCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setActiveCategory(cat.id as SavedCategory)}
                                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                                                isSelected
                                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                                                    : "text-gray-600 hover:bg-gray-50 border border-transparent"
                                            }`}
                                        >
                                            <span className="flex items-center gap-2.5 truncate">
                                                <Icon
                                                    icon={cat.icon}
                                                    width={17}
                                                    className={isSelected ? "text-indigo-600" : "text-gray-400"}
                                                />
                                                <span className="truncate">{cat.label}</span>
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                                            }`}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Sort Order Filter */}
                            <div className="space-y-1.5 pt-2 border-t border-gray-100">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Icon icon="solar:sort-vertical-bold" className="text-gray-400" />
                                    Sort Order
                                </label>
                                <select
                                    value={selectedSort}
                                    onChange={(e) => setSelectedSort(e.target.value as any)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-gray-50/60 cursor-pointer"
                                >
                                    <option value="newest">Recently Saved (Newest)</option>
                                    <option value="oldest">Earliest Saved</option>
                                    <option value="likes">Most Popular (Likes)</option>
                                </select>
                            </div>

                        </div>
                    </aside>

                    {/* ═════════════════════════════════════════════════════════════
                        2. MIDDLE COLUMN: Saved Posts Feed (Col 4-9)
                       ═════════════════════════════════════════════════════════════ */}
                    <main className="lg:col-span-6 space-y-5">
                        
                        {/* Status bar */}
                        <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/90 flex items-center justify-between flex-wrap gap-2">
                            <span className="font-black text-sm text-gray-900">
                                {filteredPosts.length} {filteredPosts.length === 1 ? "Item" : "Items"} in {activeCategory.toUpperCase()}
                            </span>

                            <button
                                type="button"
                                onClick={fetchSavedPosts}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                            >
                                <Icon icon="solar:refresh-bold" width={14} />
                                Refresh
                            </button>
                        </div>

                        {/* Unauthenticated notice */}
                        {!currentUser && (
                            <div className="bg-white rounded-3xl p-8 text-center shadow-xs border border-gray-200/90 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                                    <Icon icon="solar:lock-bold" width={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-gray-900">Sign in to view saved items</h3>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        Your bookmarks and saved collections are tied to your personal user account.
                                    </p>
                                </div>
                                <Link
                                    href="/login"
                                    className="inline-block px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
                                >
                                    Sign In to Your Account
                                </Link>
                            </div>
                        )}

                        {/* Loading skeletons */}
                        {loading && currentUser && (
                            <div className="space-y-4">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/80 animate-pulse space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-300 rounded-full" />
                                            <div className="space-y-1 flex-1">
                                                <div className="h-4 bg-gray-300 rounded w-1/3" />
                                                <div className="h-3 bg-gray-200 rounded w-1/5" />
                                            </div>
                                        </div>
                                        <div className="h-20 bg-gray-200 rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && currentUser && filteredPosts.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-gray-200/90 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                    <Icon icon="solar:bookmark-opened-bold" width={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-gray-900">No saved items found</h3>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        {searchQuery
                                            ? "No saved posts matched your search keywords."
                                            : "You haven't bookmarked any posts in this category yet. Click the bookmark icon on any post in your feed to save it here!"}
                                    </p>
                                </div>
                                <Link
                                    href="/"
                                    className="inline-block px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
                                >
                                    Explore Newsfeed
                                </Link>
                            </div>
                        )}

                        {/* Saved Posts Stream */}
                        {!loading && currentUser && filteredPosts.length > 0 && (
                            <div className="space-y-4">
                                {filteredPosts.map((post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        currentUser={currentUser}
                                        onPostDeleted={handlePostDeletedOrUnsaved}
                                    />
                                ))}
                            </div>
                        )}

                    </main>

                    {/* ═════════════════════════════════════════════════════════════
                        3. RIGHT SIDEBAR: Advice & Bookmarking Tips (Col 10-12)
                       ═════════════════════════════════════════════════════════════ */}
                    <aside className="lg:col-span-3 space-y-5 sticky top-20">
                        
                        {/* ── Advice Card 1: Privacy & Organization ── */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Icon icon="solar:shield-check-bold" width={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs text-gray-900">Privacy & Bookmarks</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">100% Private to You</p>
                                </div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-600">
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Your saved posts and collections are completely private and cannot be viewed by other users.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Click the bookmark ribbon icon on any post card at any time to save or unsave it.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Filter easily by Photos, Video Reels, and Polls from the left sidebar.</span>
                                </li>
                            </ul>
                        </div>

                        {/* ── Advice Card 2: Quick Links ── */}
                        <div className="bg-linear-to-br from-indigo-50 via-white to-blue-50/50 rounded-3xl p-5 shadow-xs border border-indigo-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:compass-bold" className="text-indigo-600" width={18} />
                                <h4 className="font-black text-xs text-indigo-900 uppercase tracking-wide">
                                    Quick Shortcuts
                                </h4>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                <Link
                                    href="/"
                                    className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-indigo-50 text-xs font-bold text-gray-700 hover:text-indigo-600 transition shadow-2xs"
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon icon="solar:feed-bold" className="text-blue-500" />
                                        Main Newsfeed
                                    </span>
                                    <Icon icon="solar:alt-arrow-right-bold" width={14} className="text-gray-400" />
                                </Link>

                                <Link
                                    href="/members"
                                    className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-indigo-50 text-xs font-bold text-gray-700 hover:text-indigo-600 transition shadow-2xs"
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-indigo-500" />
                                        Members Directory
                                    </span>
                                    <Icon icon="solar:alt-arrow-right-bold" width={14} className="text-gray-400" />
                                </Link>
                            </div>
                        </div>

                        {/* ── Advice Card 3: Dedicated Extensible Space ── */}
                        <div className="border border-dashed border-gray-300 rounded-3xl p-5 text-center bg-gray-50/50 space-y-2">
                            <Icon icon="solar:widget-add-bold" className="text-gray-400 mx-auto" width={24} />
                            <h5 className="text-xs font-bold text-gray-700">Space for Custom Advice</h5>
                            <p className="text-[11px] text-gray-400">
                                This space is reserved for dynamic advice, promo banners, and community widgets.
                            </p>
                        </div>

                    </aside>

                </div>

            </div>

            {/* Lightbox Video Viewer Modal */}
            {activeVideoIndex !== null && allVideos.length > 0 && (
                <VideoViewerModal
                    videos={allVideos}
                    initialIndex={activeVideoIndex}
                    onClose={() => setActiveVideoIndex(null)}
                />
            )}
        </div>
    );
}
