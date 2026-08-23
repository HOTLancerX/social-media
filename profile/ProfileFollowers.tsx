'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface ProfileFollowersProps {
    userId: string;
    isOwner?: boolean;
    initialType?: 'followers' | 'following';
}

export default function ProfileFollowers({
    userId,
    isOwner = false,
    initialType = 'followers',
}: ProfileFollowersProps) {
    const [activeType, setActiveType] = useState<'followers' | 'following'>(initialType);
    const [followers, setFollowers] = useState<any[]>([]);
    const [following, setFollowing] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch(`/api/social-media/friends?targetUserId=${userId}&list=followers`).then((r) => r.json()),
            fetch(`/api/social-media/friends?targetUserId=${userId}&list=following`).then((r) => r.json()),
        ])
            .then(([followersRes, followingRes]) => {
                setFollowers(followersRes.followers || []);
                setFollowing(followingRes.following || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [userId]);

    const handleConfirmRequest = async (friendshipId: string) => {
        try {
            await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', friendshipId }),
            });
            fetchData();
        } catch (err) {
            console.error('Failed to accept:', err);
        }
    };

    const currentList = activeType === 'followers' ? followers : following;
    const filteredList = currentList.filter(
        (u) =>
            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            {/* Header + Tabs Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setActiveType('followers')}
                        className={`text-base sm:text-lg font-black transition pb-1 border-b-2 ${
                            activeType === 'followers'
                                ? 'border-indigo-600 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Followers ({followers.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveType('following')}
                        className={`text-base sm:text-lg font-black transition pb-1 border-b-2 ${
                            activeType === 'following'
                                ? 'border-indigo-600 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Following ({following.length})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <Icon
                        icon="solar:magnifer-linear"
                        width={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 text-xs font-medium rounded-xl border border-gray-200 focus:border-indigo-400 focus:bg-white outline-none transition"
                    />
                </div>
            </div>

            {/* List Content */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3 animate-pulse h-20" />
                    ))}
                </div>
            ) : filteredList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredList.map((user) => (
                        <div
                            key={user._id}
                            className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md transition duration-200 flex items-center justify-between gap-3"
                        >
                            <Link href={`/${user.slug}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                                {user.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-transparent group-hover:ring-indigo-400 transition"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                                        {user.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-gray-900 group-hover:text-indigo-600 transition truncate">
                                        {user.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 truncate">@{user.slug}</p>
                                    {user.relation?.isPending && (
                                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700">
                                            Follower (Request Sent)
                                        </span>
                                    )}
                                </div>
                            </Link>

                            {isOwner && user.relation?.isPending && (
                                <button
                                    type="button"
                                    onClick={() => handleConfirmRequest(user.relation.friendshipId)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                                    title="Confirm friend request"
                                >
                                    Confirm
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                        <Icon icon="solar:users-group-rounded-bold" width={28} />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800">
                        {searchQuery ? 'No people matched your search' : `No ${activeType} yet`}
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        {activeType === 'followers'
                            ? 'People who follow or send friend requests will be displayed here.'
                            : 'People followed will appear here.'}
                    </p>
                </div>
            )}
        </div>
    );
}
