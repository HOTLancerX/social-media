'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ProfileHeader, { type ProfileTab } from './ProfileHeader';
import ProfileAbout from './ProfileAbout';
import ProfileFriends from './ProfileFriends';
import ProfileFollowers from './ProfileFollowers';
import ProfilePhotos from './ProfilePhotos';
import ProfileVideos from './ProfileVideos';
import ProfileSettings from './ProfileSettings';
import PostForm from '../ui/PostForm';
import PostCard from '../ui/PostCard';
import { Icon } from '@iconify/react';
import type { ISocialPostData } from '../models/SocialMedia';

interface UserProfilePageProps {
    userData: {
        user: {
            _id: string;
            name: string;
            slug: string;
            email?: string;
            image?: string;
            type?: string;
            city?: string;
            state?: string;
            createdAt?: string;
        };
        info: Record<string, string>;
        stats: {
            friendsCount: number;
            postsCount: number;
            photosCount: number;
            videosCount: number;
        };
    };
    initialTab?: ProfileTab;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
}

export default function UserProfilePage({
    userData,
    initialTab = 'posts',
    currentUser,
}: UserProfilePageProps) {
    const { data: session } = useSession();
    const effectiveCurrentUser = currentUser || (session?.user as any) || null;

    const [profileData, setProfileData] = useState(userData);
    const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
    const [posts, setPosts] = useState<ISocialPostData[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    const [recentFriends, setRecentFriends] = useState<any[]>([]);

    const user = profileData.user;
    const info = profileData.info || {};
    const stats = profileData.stats || { friendsCount: 0, postsCount: 0, photosCount: 0, videosCount: 0 };
    const isOwner = effectiveCurrentUser?._id && String(effectiveCurrentUser._id) === String(user._id);

    const reloadProfile = () => {
        fetch(`/api/social-media/profile?userId=${user._id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.user) {
                    setProfileData(res);
                }
            })
            .catch(() => {});
    };

    // Load recent 6 friends for left sidebar
    useEffect(() => {
        fetch(`/api/social-media/friends?targetUserId=${user._id}&list=friends&limit=6`)
            .then((r) => r.json())
            .then((res) => {
                setRecentFriends(res.friends || []);
            })
            .catch(() => {});
    }, [user._id]);

    // Load timeline posts
    useEffect(() => {
        if (activeTab === 'posts') {
            setLoadingPosts(true);
            fetch(`/api/social-media?userId=${user._id}&limit=20`)
                .then((r) => r.json())
                .then((res) => {
                    setPosts(res.posts || []);
                })
                .catch(() => {})
                .finally(() => setLoadingPosts(false));
        }
    }, [user._id, activeTab]);

    const handleNewPost = (newPost: any) => {
        setPosts((prev) => [newPost, ...prev]);
        setProfileData((prev) => ({
            ...prev,
            stats: {
                ...prev.stats,
                postsCount: (prev.stats.postsCount || 0) + 1,
            },
        }));
    };

    const handlePostDeleted = (postId: string) => {
        setPosts((prev) => prev.filter((p) => String(p._id) !== String(postId)));
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] pb-16 pt-4">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
                {/* 1. Header Suite */}
                <ProfileHeader
                    user={user}
                    info={info}
                    stats={stats}
                    activeTab={activeTab}
                    onTabChange={(t) => setActiveTab(t)}
                    currentUser={effectiveCurrentUser}
                    onProfileUpdated={reloadProfile}
                />

                {/* 2. Dynamic Tab Content */}
                {activeTab === 'posts' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Sidebar Widgets (Intro, 6 Friends Grid, Photos) */}
                        <div className="lg:col-span-5 space-y-5">
                            {/* Intro Card */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">
                                    Intro
                                </h3>

                                {info.bio && (
                                    <p className="text-xs text-gray-700 font-medium text-center py-1">
                                        {info.bio}
                                    </p>
                                )}

                                <div className="space-y-3 text-xs text-gray-600 border-t border-gray-100 pt-3">
                                    {info.location_city && (
                                        <div className="flex items-center gap-2.5">
                                            <Icon icon="solar:map-point-bold" width={18} className="text-gray-400 shrink-0" />
                                            <span>Lives in <strong className="text-gray-900">{info.location_city}</strong></span>
                                        </div>
                                    )}

                                    {info.location_hometown && (
                                        <div className="flex items-center gap-2.5">
                                            <Icon icon="solar:home-bold" width={18} className="text-gray-400 shrink-0" />
                                            <span>From <strong className="text-gray-900">{info.location_hometown}</strong></span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2.5">
                                        <Icon icon="solar:calendar-bold" width={18} className="text-gray-400 shrink-0" />
                                        <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                                    </div>
                                </div>

                                {isOwner && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('settings')}
                                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
                                    >
                                        Edit Bio & Details
                                    </button>
                                )}
                            </div>

                            {/* Friends Widget (Latest 6 Friends in 3x2 Grid) */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">
                                            Friends
                                        </h3>
                                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                            {stats.friendsCount || recentFriends.length} friends
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('friends')}
                                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                        See all friends
                                    </button>
                                </div>

                                {recentFriends.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-3">
                                        {recentFriends.slice(0, 6).map((f) => (
                                            <Link
                                                key={f._id}
                                                href={`/${f.slug}`}
                                                className="group text-center block space-y-1.5"
                                            >
                                                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200/80 group-hover:border-indigo-400 transition">
                                                    {f.image ? (
                                                        <img
                                                            src={f.image}
                                                            alt={f.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm">
                                                            {f.name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-800 group-hover:text-indigo-600 truncate transition">
                                                    {f.name}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4">No friends added yet</p>
                                )}
                            </div>

                            {/* Photos Widget */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">
                                        Photos
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('photos')}
                                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                        See all
                                    </button>
                                </div>
                                <ProfilePhotos userId={user._id} />
                            </div>
                        </div>

                        {/* Right Column: Timeline Stream */}
                        <div className="lg:col-span-7 space-y-5">
                            {isOwner && (
                                <PostForm currentUser={effectiveCurrentUser} onPostCreated={handleNewPost} />
                            )}

                            {loadingPosts ? (
                                <div className="space-y-4">
                                    {[1, 2].map((n) => (
                                        <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-48" />
                                    ))}
                                </div>
                            ) : posts.length > 0 ? (
                                posts.map((post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        currentUser={effectiveCurrentUser}
                                        onPostDeleted={handlePostDeleted}
                                    />
                                ))
                            ) : (
                                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                                        <Icon icon="solar:notes-bold" width={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800">No Posts on Timeline</h4>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        When {user.name} shares status updates, photos, or videos, they will appear here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <ProfileAbout
                        user={user}
                        info={info}
                        isOwner={isOwner}
                        onEditSettings={() => setActiveTab('settings')}
                    />
                )}

                {activeTab === 'friends' && (
                    <ProfileFriends userId={user._id} isOwner={isOwner} />
                )}

                {activeTab === 'followers' && (
                    <ProfileFollowers userId={user._id} isOwner={isOwner} />
                )}

                {activeTab === 'photos' && (
                    <ProfilePhotos userId={user._id} />
                )}

                {activeTab === 'videos' && (
                    <ProfileVideos userId={user._id} />
                )}

                {activeTab === 'settings' && isOwner && (
                    <ProfileSettings
                        user={user}
                        info={info}
                        onSaved={reloadProfile}
                    />
                )}
            </div>
        </div>
    );
}
