'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import PostForm from '../ui/PostForm';
import PostCard from '../ui/PostCard';
import StoriesBar from '../ui/StoriesBar';
import ReelsFeedBar from '../ui/ReelsFeedBar';
import VideoViewerModal from '../ui/VideoViewerModal';
import HexAvatar from '../ui/HexAvatar';
import type { ISocialPostData } from '../models/SocialMedia';

type FeedTab = 'all' | 'image' | 'video' | 'poll' | 'popular' | 'my-posts' | 'saves';

export default function SocialFeedsPage() {
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;
    const searchParams = useSearchParams();

    const urlType = searchParams.get('type') || searchParams.get('tab') || 'all';
    const urlTag = searchParams.get('tag') || null;
    const urlSearch = searchParams.get('search') || '';

    const activeTab: FeedTab = (['image', 'video', 'poll', 'popular', 'my-posts', 'saves'].includes(urlType) ? urlType : 'all') as FeedTab;
    const [searchQuery, setSearchQuery] = useState(urlSearch);
    const [activeTag, setActiveTag] = useState<string | null>(urlTag);

    const [posts, setPosts] = useState<ISocialPostData[]>([]);
    const [newIncomingPosts, setNewIncomingPosts] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);

    // Sidebar Social Data
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friendsList, setFriendsList] = useState<any[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);

    // Sync state when URL query params change
    useEffect(() => {
        setSearchQuery(urlSearch);
        setActiveTag(urlTag);
    }, [urlSearch, urlTag]);

    // Load friend requests & contacts for logged-in user
    const loadFriendsData = useCallback(() => {
        if (!currentUser?._id) return;
        setLoadingFriends(true);
        Promise.all([
            fetch('/api/social-media/friends?list=pending').then((r) => r.json()),
            fetch('/api/social-media/friends?list=friends&limit=8').then((r) => r.json()),
        ])
            .then(([pendingRes, friendsRes]) => {
                setPendingRequests(pendingRes.pending || []);
                setFriendsList(friendsRes.friends || []);
            })
            .catch(() => {})
            .finally(() => setLoadingFriends(false));
    }, [currentUser?._id]);

    useEffect(() => {
        loadFriendsData();
    }, [loadFriendsData]);

    const handleAcceptRequest = async (friendshipId: string) => {
        try {
            const res = await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', friendshipId }),
            });
            if (res.ok) {
                loadFriendsData();
            }
        } catch (err) {
            console.error('Failed to accept friend:', err);
        }
    };

    const handleDeclineRequest = async (friendshipId: string) => {
        try {
            const res = await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline', friendshipId }),
            });
            if (res.ok) {
                loadFriendsData();
            }
        } catch (err) {
            console.error('Failed to decline friend:', err);
        }
    };

    // Trending hashtags
    const [trendingTags] = useState<string[]>([
        'photography',
        'tech',
        'design',
        'news',
        'nature',
        'community',
        'life',
    ]);

    const fetchPosts = useCallback(
        async (targetPage: number = 1, append: boolean = false) => {
            if (targetPage === 1) setLoading(true);
            else setLoadingMore(true);

            try {
                const params = new URLSearchParams();
                params.set('page', String(targetPage));
                params.set('limit', '10');

                if (activeTab === 'saves') {
                    params.set('tab', 'saves');
                } else if (activeTab === 'my-posts' && currentUser?._id) {
                    params.set('userId', currentUser._id);
                } else if (activeTab !== 'all') {
                    params.set('type', activeTab);
                }

                if (activeTag) {
                    params.set('tag', activeTag);
                }
                if (searchQuery.trim()) {
                    params.set('search', searchQuery.trim());
                }

                const res = await fetch(`/api/social-media?${params.toString()}`);
                const data = await res.json();

                if (res.ok) {
                    const incomingPosts = data.posts || [];
                    if (append) {
                        setPosts((prev) => [...prev, ...incomingPosts]);
                    } else {
                        setPosts(incomingPosts);
                    }
                    setHasMore(Boolean(data.hasMore));
                    setPage(targetPage);
                } else {
                    if (!append) setPosts([]);
                }
            } catch (err) {
                console.error('Failed to fetch posts:', err);
                if (!append) setPosts([]);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [activeTab, activeTag, searchQuery, currentUser?._id]
    );

    useEffect(() => {
        setPage(1);
        fetchPosts(1, false);
    }, [fetchPosts]);

    // Periodic check for new incoming posts in feed (every 12 seconds)
    useEffect(() => {
        if (loading || posts.length === 0) return;

        const checkNewPosts = async () => {
            try {
                const params = new URLSearchParams();
                params.set('page', '1');
                params.set('limit', '10');

                if (activeTab === 'saves') {
                    params.set('tab', 'saves');
                } else if (activeTab === 'my-posts' && currentUser?._id) {
                    params.set('userId', currentUser._id);
                } else if (activeTab !== 'all') {
                    params.set('type', activeTab);
                }

                if (activeTag) params.set('tag', activeTag);
                if (searchQuery.trim()) params.set('search', searchQuery.trim());

                const res = await fetch(`/api/social-media?${params.toString()}`);
                if (!res.ok) return;
                const data = await res.json();
                const freshPosts: ISocialPostData[] = data.posts || [];

                if (freshPosts.length > 0 && posts.length > 0) {
                    const existingIds = new Set(posts.map((p) => String(p._id)));
                    const topPostTime = new Date(posts[0]?.createdAt || 0).getTime();

                    const brandNew = freshPosts.filter((p) => {
                        if (existingIds.has(String(p._id))) return false;
                        const pTime = new Date(p.createdAt || 0).getTime();
                        return pTime >= topPostTime || !existingIds.has(String(p._id));
                    });

                    if (brandNew.length > 0) {
                        setNewIncomingPosts(brandNew);
                    }
                }
            } catch {
                // silent background polling
            }
        };

        const interval = setInterval(checkNewPosts, 12000);
        return () => clearInterval(interval);
    }, [activeTab, activeTag, searchQuery, currentUser?._id, loading, posts]);

    const handleLoadNewPosts = () => {
        if (newIncomingPosts.length === 0) return;
        setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => String(p._id)));
            const uniqueNew = newIncomingPosts.filter((p) => !existingIds.has(String(p._id)));
            return [...uniqueNew, ...prev];
        });
        setNewIncomingPosts([]);
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePostCreated = (newPost: any) => {
        setPosts((prev) => [newPost, ...prev]);
    };

    const handlePostDeleted = (postId: string) => {
        setPosts((prev) => prev.filter((p) => String(p._id) !== postId));
        setNewIncomingPosts((prev) => prev.filter((p) => String(p._id) !== postId));
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-16">
            {/* 3-Column Layout Container */}
            <div className="container py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT SIDEBAR (Col 1-3) */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-22">
                        {/* Profile Summary Card */}
                        <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/80 text-center">
                            <div className="relative inline-block mx-auto mb-3">
                                <HexAvatar
                                    image={currentUser?.image}
                                    name={currentUser?.name}
                                    size="lg"
                                    isOnline={Boolean(currentUser)}
                                    showLiveDot={Boolean(currentUser)}
                                    showStatusOrLevel={false}
                                    className="mx-auto"
                                />
                            </div>
                            <h3 className="font-bold text-sm text-gray-900 truncate">
                                {currentUser ? currentUser.name : 'Guest User'}
                            </h3>
                            <p className="text-xs text-gray-500 mb-3 truncate">
                                {currentUser?.slug ? `@${currentUser.slug}` : 'Join the community'}
                            </p>

                            {currentUser ? (
                                <Link
                                    href={`/${currentUser.slug || 'user'}`}
                                    className="block w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition text-center"
                                >
                                    My Profile
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition text-center shadow-xs"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>

                        {/* Navigation Feed Filters (Direct Animated Links) */}
                        <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-gray-200/80 space-y-1">
                            {[
                                { id: 'all', label: 'All Feeds', href: '/', icon: 'solar:feed-bold', color: 'text-blue-500' },
                                { id: 'video', label: 'Watch Videos', href: '/videos', icon: 'solar:videocamera-record-bold', color: 'text-red-500' },
                                { id: 'image', label: 'Photos Only', href: '/?type=image', icon: 'solar:gallery-wide-bold', color: 'text-rose-500' },
                                { id: 'poll', label: 'Community Polls', href: '/?type=poll', icon: 'solar:chart-2-bold', color: 'text-amber-500' },
                                { id: 'popular', label: 'Trending & Popular', href: '/?type=popular', icon: 'solar:fire-bold', color: 'text-orange-500' },
                                { id: 'members', label: 'Members Directory', href: '/members', icon: 'solar:users-group-rounded-bold', color: 'text-indigo-500' },
                                ...(currentUser
                                    ? [
                                          { id: 'my-posts', label: 'My Posts', href: '/?type=my-posts', icon: 'solar:user-bold', color: 'text-cyan-500' },
                                          { id: 'saves', label: 'Saved Posts', href: '/saves', icon: 'solar:bookmark-bold', color: 'text-amber-500' },
                                      ]
                                    : []),
                            ].map((item) => {
                                const isActive = activeTab === item.id;
                                const targetHref = isActive && item.id !== 'all' ? '/' : item.href;

                                return (
                                    <Link
                                        key={item.id}
                                        href={targetHref}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-600 shadow-2xs translate-x-1'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon
                                                icon={item.icon}
                                                width={18}
                                                className={`transition-transform duration-200 group-hover:scale-110 ${
                                                    isActive ? 'text-blue-600' : item.color
                                                }`}
                                            />
                                            <span>{item.label}</span>
                                        </span>
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </aside>

                    {/* MAIN FEED COLUMN (Col 4-9) */}
                    <main className="lg:col-span-6 space-y-5">
                        {/* 1. 24h Ephemeral Stories Bar */}
                        <StoriesBar currentUser={currentUser} />

                        {/* 2. Create Post Box */}
                        <PostForm
                            currentUser={currentUser}
                            onPostCreated={handlePostCreated}
                        />

                        {/* Floating New Posts Available Notification Pill */}
                        {newIncomingPosts.length > 0 && (
                            <div className="sticky top-20 z-30 flex justify-center py-2 animate-bounce">
                                <button
                                    type="button"
                                    onClick={handleLoadNewPosts}
                                    className="group flex items-center gap-2.5 px-5 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-white/20"
                                >
                                    <Icon icon="solar:refresh-circle-bold" width={18} className="animate-spin text-white" />
                                    <span>
                                        {newIncomingPosts.length === 1
                                            ? '1 new post available'
                                            : `${newIncomingPosts.length} new posts available`} — Click to update
                                    </span>
                                    <Icon icon="solar:arrow-up-linear" width={16} className="text-blue-200" />
                                </button>
                            </div>
                        )}

                        {/* Active Filter Pill */}
                        {(activeTag || searchQuery) && (
                            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 shadow-xs border border-gray-200/80">
                                <span className="text-xs text-gray-600">
                                    {activeTag && (
                                        <>
                                            Filtering by topic: <strong className="text-blue-600">#{activeTag}</strong>
                                        </>
                                    )}
                                    {searchQuery && (
                                        <>
                                            Searching for: <strong className="text-blue-600">&ldquo;{searchQuery}&rdquo;</strong>
                                        </>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTag(null);
                                        setSearchQuery('');
                                    }}
                                    className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        )}

                        {/* 3. Feed Posts Stream */}
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((n) => (
                                    <div
                                        key={n}
                                        className="bg-white rounded-2xl p-4 space-y-4 shadow-xs border border-gray-200/80 animate-pulse"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                                                <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-full" />
                                            <div className="h-3 bg-gray-200 rounded w-4/5" />
                                        </div>
                                        <div className="h-44 bg-gray-100 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-gray-200/80 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                                    <Icon icon="solar:chat-square-call-bold" width={32} />
                                </div>
                                <h3 className="text-base font-bold text-gray-800">
                                    No posts found
                                </h3>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    {searchQuery || activeTag
                                        ? 'No posts matched your search filters. Try clearing your query.'
                                        : 'Be the first one to share an update, photo, video, or poll with the community!'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {posts.map((post, postIdx) => {
                                    const videoPlaylist = posts.filter(
                                        (p) => p.type === 'video' && p.videos && p.videos.length > 0
                                    );
                                    return (
                                        <React.Fragment key={String(post._id)}>
                                            <PostCard
                                                post={post}
                                                currentUser={currentUser}
                                                onPostDeleted={handlePostDeleted}
                                                onOpenVideoModal={(clickedPost) => {
                                                    const idx = videoPlaylist.findIndex(
                                                        (p) => String(p._id) === String(clickedPost._id)
                                                    );
                                                    setActiveVideoIndex(idx >= 0 ? idx : 0);
                                                }}
                                            />

                                            {/* Suggested Reels Carousel after 5 posts */}
                                            {postIdx === 4 && (
                                                <ReelsFeedBar
                                                    onSelectReel={(selectedReel) => {
                                                        const idx = videoPlaylist.findIndex(
                                                            (p) => String(p._id) === String(selectedReel._id)
                                                        );
                                                        setActiveVideoIndex(idx >= 0 ? idx : 0);
                                                    }}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="pt-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => fetchPosts(page + 1, true)}
                                            disabled={loadingMore}
                                            className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-xl shadow-xs border border-gray-200 transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <Icon icon="line-md:loading-twotone-loop" width={16} className="text-blue-600" />
                                                    Loading more posts...
                                                </>
                                            ) : (
                                                'Load More Posts'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>

                    {/* RIGHT SIDEBAR (Col 10-12) */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-22">
                        {/* 1. Friend Requests Widget (If Logged In) */}
                        {currentUser && (
                            <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon icon="solar:user-plus-bold" width={16} className="text-indigo-600" />
                                        Friend Requests
                                    </h3>
                                    {pendingRequests.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                            {pendingRequests.length}
                                        </span>
                                    )}
                                </div>

                                {pendingRequests.length > 0 ? (
                                    <div className="space-y-3 pt-1">
                                        {pendingRequests.slice(0, 3).map((req) => (
                                            <div key={req.friendshipId} className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2.5">
                                                <Link
                                                    href={`/${req.user.slug}`}
                                                    className="flex items-center gap-2.5 group"
                                                >
                                                    <HexAvatar
                                                        image={req.user.image}
                                                        name={req.user.name}
                                                        size="sm"
                                                        isOnline={true}
                                                        showLiveDot={false}
                                                        showStatusOrLevel={false}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 truncate">
                                                            {req.user.name}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 truncate">
                                                            @{req.user.slug}
                                                        </p>
                                                    </div>
                                                </Link>

                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAcceptRequest(req.friendshipId)}
                                                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeclineRequest(req.friendshipId)}
                                                        className="w-full py-1.5 bg-gray-200 hover:bg-rose-100 hover:text-rose-600 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {pendingRequests.length > 3 && (
                                            <Link
                                                href={`/${currentUser.slug}/friends`}
                                                className="block text-center text-xs font-bold text-indigo-600 hover:underline pt-1"
                                            >
                                                See all requests ({pendingRequests.length})
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-2">No pending friend requests</p>
                                )}
                            </div>
                        )}

                        {/* 2. Latest Friends / Contacts Widget (If Logged In) */}
                        {currentUser && (
                            <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon icon="solar:users-group-rounded-bold" width={16} className="text-emerald-500" />
                                        Friends & Contacts
                                    </h3>
                                    <Link
                                        href={`/${currentUser.slug || 'user'}/friends`}
                                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                                    >
                                        See All
                                    </Link>
                                </div>

                                {friendsList.length > 0 ? (
                                    <div className="space-y-1.5 pt-1">
                                        {friendsList.map((friend) => (
                                            <Link
                                                key={friend._id}
                                                href={`/${friend.slug}`}
                                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition group"
                                            >
                                                <HexAvatar
                                                    image={friend.image}
                                                    name={friend.name}
                                                    size="sm"
                                                    isOnline={true}
                                                    showLiveDot={true}
                                                    showStatusOrLevel={false}
                                                />

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-gray-800 group-hover:text-indigo-600 truncate transition">
                                                        {friend.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        @{friend.slug}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-2">No friends yet</p>
                                )}
                            </div>
                        )}

                        {/* 3. Trending Topics Widget */}
                        <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/80">
                            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Icon icon="solar:hashtag-square-bold" width={16} className="text-blue-500" />
                                Trending Topics
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {trendingTags.map((tag) => (
                                    <Link
                                        key={tag}
                                        href={`/?tag=${tag}`}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                            activeTag === tag
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Community Stats Card */}
                        <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:users-group-two-rounded-bold" width={22} />
                                <h4 className="font-bold text-sm">Community Feed</h4>
                            </div>
                            <p className="text-xs text-blue-100 leading-relaxed">
                                Share status updates, post vibrant color cards, create polls, and react with Love, Care, Haha, Wow, Sad, and Angry!
                            </p>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Fullscreen Video Reels & Watch Modal */}
            {activeVideoIndex !== null && (
                (() => {
                    const videoPlaylist = posts.filter(
                        (p) => p.type === 'video' && p.videos && p.videos.length > 0
                    );
                    if (videoPlaylist.length === 0) return null;
                    return (
                        <VideoViewerModal
                            videos={videoPlaylist}
                            initialIndex={activeVideoIndex}
                            currentUser={currentUser}
                            onClose={() => setActiveVideoIndex(null)}
                            onPostUpdated={(updatedPost) => {
                                setPosts((prev) =>
                                    prev.map((p) =>
                                        String(p._id) === String(updatedPost._id) ? updatedPost : p
                                    )
                                );
                            }}
                        />
                    );
                })()
            )}
        </div>
    );
}
