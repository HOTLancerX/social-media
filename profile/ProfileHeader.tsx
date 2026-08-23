'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { GalleryModal } from '@/components/Gallery';
import HexAvatar from '../ui/HexAvatar';

export type ProfileTab = 'posts' | 'about' | 'friends' | 'followers' | 'photos' | 'videos' | 'settings';

interface ProfileHeaderProps {
    user: {
        _id: string;
        name: string;
        slug: string;
        email?: string;
        image?: string;
        type?: string;
        status?: string;
    };
    info: Record<string, string>;
    stats: {
        friendsCount: number;
        postsCount: number;
        photosCount: number;
        videosCount: number;
    };
    activeTab: ProfileTab;
    onTabChange: (tab: ProfileTab) => void;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
    } | null;
    onProfileUpdated?: () => void;
}

export default function ProfileHeader({
    user,
    info,
    stats,
    activeTab,
    onTabChange,
    currentUser,
    onProfileUpdated,
}: ProfileHeaderProps) {
    const isOwner = currentUser?._id && String(currentUser._id) === String(user._id);

    const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'>('none');
    const [friendLoading, setFriendLoading] = useState(false);
    const [showCoverGallery, setShowCoverGallery] = useState(false);
    const [showAvatarGallery, setShowAvatarGallery] = useState(false);

    // Fetch Friendship status
    useEffect(() => {
        if (!currentUser?._id || isOwner) return;

        fetch(`/api/social-media/friends?targetUserId=${user._id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.status) setFriendStatus(res.status);
            })
            .catch(() => {});
    }, [currentUser?._id, user._id, isOwner]);

    // Handle friend request button action
    const handleFriendAction = async (action: 'send' | 'accept' | 'decline' | 'unfriend') => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }

        setFriendLoading(true);
        try {
            const res = await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    targetUserId: user._id,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.status) {
                    setFriendStatus(data.status);
                    onProfileUpdated?.();
                }
            }
        } catch (err) {
            console.error('Friend action failed:', err);
        } finally {
            setFriendLoading(false);
        }
    };

    const handleUpdateCover = async (selected: string | string[]) => {
        const coverUrl = Array.isArray(selected) ? selected[0] : selected;
        if (!coverUrl) return;
        try {
            await fetch('/api/social-media/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coverPhoto: coverUrl }),
            });
            setShowCoverGallery(false);
            onProfileUpdated?.();
        } catch (err) {
            console.error('Failed to update cover:', err);
        }
    };

    const handleUpdateAvatar = async (selected: string | string[]) => {
        const avatarUrl = Array.isArray(selected) ? selected[0] : selected;
        if (!avatarUrl) return;
        try {
            await fetch('/api/social-media/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: avatarUrl }),
            });
            setShowAvatarGallery(false);
            onProfileUpdated?.();
        } catch (err) {
            console.error('Failed to update avatar:', err);
        }
    };

    const coverPhotoUrl = info.cover_photo || 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=1600&auto=format&fit=crop&q=80';
    const userBio = info.bio || '';

    const tabs: { id: ProfileTab; label: string; count?: number; icon: string }[] = [
        { id: 'posts', label: 'Posts', icon: 'solar:notes-bold' },
        { id: 'about', label: 'About', icon: 'solar:user-id-bold' },
        { id: 'friends', label: 'Friends', count: stats.friendsCount, icon: 'solar:users-group-rounded-bold' },
        { id: 'followers', label: 'Followers', icon: 'solar:user-check-bold' },
        { id: 'photos', label: 'Photos', count: stats.photosCount, icon: 'solar:gallery-wide-bold' },
        { id: 'videos', label: 'Videos', count: stats.videosCount, icon: 'solar:videocamera-record-bold' },
    ];

    if (isOwner) {
        tabs.push({ id: 'settings', label: 'Settings', icon: 'solar:settings-bold' });
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* 1. Cover Photo Banner */}
            <div className="relative w-full h-56 sm:h-72 md:h-84 bg-gray-900 overflow-hidden group">
                <img
                    src={coverPhotoUrl}
                    alt="Cover Banner"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />

                {isOwner && (
                    <button
                        type="button"
                        onClick={() => setShowCoverGallery(true)}
                        className="absolute bottom-4 right-4 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold backdrop-blur-md transition shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                        <Icon icon="solar:camera-bold" width={16} />
                        <span>Edit Cover Photo</span>
                    </button>
                )}
            </div>

            {/* 2. User Avatar, Details & Actions Row */}
            <div className="px-4 sm:px-8 pb-4 pt-0 relative">
                <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
                    {/* Left: Avatar + Names */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                        <div className="relative group">
                            <HexAvatar
                                image={user.image}
                                name={user.name}
                                size="xl"
                                progress={80}
                                isOnline={user.status === 'online'}
                                showLiveDot={user.status === 'online'}
                                showStatusOrLevel={false}
                            />

                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarGallery(true)}
                                    className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg border-2 border-white transition cursor-pointer z-30 transform hover:scale-105"
                                    title="Change Profile Photo"
                                >
                                    <Icon icon="solar:camera-bold" width={18} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-1 sm:pb-2">
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                                    {user.name}
                                </h1>
                                {user.type && user.type !== 'user' && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wide">
                                        {user.type}
                                    </span>
                                )}
                            </div>

                            {userBio && (
                                <p className="text-xs sm:text-sm text-gray-600 max-w-md font-medium">
                                    {userBio}
                                </p>
                            )}

                            <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 justify-center sm:justify-start">
                                <span>@{user.slug}</span>
                                <span>•</span>
                                <span className="text-gray-600 font-bold">{stats.friendsCount} friends</span>
                            </p>
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 pb-2">
                        {isOwner ? (
                            <button
                                type="button"
                                onClick={() => onTabChange('settings')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <Icon icon="solar:pen-new-square-bold" width={16} />
                                <span>Edit Profile</span>
                            </button>
                        ) : (
                            <>
                                {/* Friend Status Action Button */}
                                {friendStatus === 'none' && (
                                    <button
                                        type="button"
                                        onClick={() => handleFriendAction('send')}
                                        disabled={friendLoading}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Icon icon="solar:user-plus-bold" width={16} />
                                        <span>Add Friend</span>
                                    </button>
                                )}

                                {friendStatus === 'pending_sent' && (
                                    <button
                                        type="button"
                                        onClick={() => handleFriendAction('unfriend')}
                                        disabled={friendLoading}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={16} />
                                        <span>Cancel Request</span>
                                    </button>
                                )}

                                {friendStatus === 'pending_received' && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleFriendAction('accept')}
                                            disabled={friendLoading}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <Icon icon="solar:check-circle-bold" width={16} />
                                            <span>Confirm</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFriendAction('decline')}
                                            disabled={friendLoading}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}

                                {friendStatus === 'friends' && (
                                    <button
                                        type="button"
                                        onClick={() => handleFriendAction('unfriend')}
                                        disabled={friendLoading}
                                        className="px-4 py-2 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 border border-emerald-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer group"
                                    >
                                        <Icon icon="solar:check-circle-bold" width={16} className="group-hover:hidden" />
                                        <Icon icon="solar:user-cross-bold" width={16} className="hidden group-hover:inline" />
                                        <span className="group-hover:hidden">Friends</span>
                                        <span className="hidden group-hover:inline">Unfriend</span>
                                    </button>
                                )}

                                {/* Message / Messenger Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.dispatchEvent(
                                            new CustomEvent('open_chat_sidebar', {
                                                detail: {
                                                    user: {
                                                        _id: user._id,
                                                        name: user.name,
                                                        slug: user.slug || user._id,
                                                        image: user.image,
                                                        status: 'online',
                                                    },
                                                },
                                            })
                                        );
                                    }}
                                    className="px-4 py-2 bg-linear-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    <Icon icon="solar:chat-round-dots-bold" width={16} />
                                    <span>Message</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 3. Horizontal Navigation Tabs Strip */}
                <div className="flex items-center gap-1 border-t border-gray-100 pt-1 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer relative ${
                                activeTab === tab.id
                                    ? 'text-indigo-600 bg-indigo-50/60'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            <Icon icon={tab.icon} width={16} />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 text-gray-700 font-mono">
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 inset-x-3 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gallery Media Selectors */}
            {showCoverGallery && (
                <GalleryModal
                    isOpen={showCoverGallery}
                    multiple={false}
                    selectedImages={coverPhotoUrl ? [coverPhotoUrl] : []}
                    onSelect={handleUpdateCover}
                    onClose={() => setShowCoverGallery(false)}
                />
            )}

            {showAvatarGallery && (
                <GalleryModal
                    isOpen={showAvatarGallery}
                    multiple={false}
                    selectedImages={user.image ? [user.image] : []}
                    onSelect={handleUpdateAvatar}
                    onClose={() => setShowAvatarGallery(false)}
                />
            )}
        </div>
    );
}
