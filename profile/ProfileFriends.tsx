'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface ProfileFriendsProps {
    userId: string;
    isOwner?: boolean;
}

export default function ProfileFriends({ userId, isOwner = false }: ProfileFriendsProps) {
    const [friends, setFriends] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [subTab, setSubTab] = useState<'all' | 'pending'>('all');

    const fetchFriendsData = () => {
        setLoading(true);
        fetch(`/api/social-media/friends?targetUserId=${userId}&list=friends`)
            .then((r) => r.json())
            .then((res) => {
                setFriends(res.friends || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        if (isOwner) {
            fetch('/api/social-media/friends?list=pending')
                .then((r) => r.json())
                .then((res) => {
                    setPending(res.pending || []);
                })
                .catch(() => {});
        }
    };

    useEffect(() => {
        fetchFriendsData();
    }, [userId, isOwner]);

    const handleAcceptRequest = async (friendshipId: string) => {
        try {
            const res = await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', friendshipId }),
            });
            if (res.ok) {
                fetchFriendsData();
            }
        } catch (err) {
            console.error('Failed to accept request:', err);
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
                fetchFriendsData();
            }
        } catch (err) {
            console.error('Failed to decline request:', err);
        }
    };

    const filteredFriends = friends.filter((f) =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            {/* Header + Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:users-group-rounded-bold" className="text-indigo-600" width={22} />
                        Friends ({friends.length})
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        People connected in the community
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isOwner && pending.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setSubTab('all')}
                                className={`px-3 py-1.5 rounded-lg transition ${
                                    subTab === 'all' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'
                                }`}
                            >
                                All Friends
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubTab('pending')}
                                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                                    subTab === 'pending' ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-500'
                                }`}
                            >
                                <span>Requests</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                                    {pending.length}
                                </span>
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <Icon icon="solar:magnifer-linear" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-400 focus:bg-white transition w-44 sm:w-56"
                        />
                    </div>
                </div>
            </div>

            {/* Pending Requests Section (Owner view) */}
            {isOwner && subTab === 'pending' && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                        Pending Friend Requests ({pending.length})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.map((item) => (
                            <div key={item.friendshipId} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between gap-3 shadow-xs">
                                <Link href={`/${item.user.slug}`} className="flex items-center gap-3 min-w-0">
                                    {item.user.image ? (
                                        <img src={item.user.image} alt={item.user.name} className="w-12 h-12 rounded-full object-cover border border-white shadow-xs shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                                            {item.user.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs text-gray-900 truncate hover:text-indigo-600">{item.user.name}</p>
                                        <p className="text-[11px] text-gray-400 font-medium">@{item.user.slug}</p>
                                    </div>
                                </Link>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleAcceptRequest(item.friendshipId)}
                                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                                        title="Confirm request"
                                    >
                                        <Icon icon="solar:check-circle-bold" width={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeclineRequest(item.friendshipId)}
                                        className="p-2 bg-gray-200 hover:bg-rose-100 hover:text-rose-600 text-gray-600 rounded-xl transition cursor-pointer"
                                        title="Decline request"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends Grid */}
            {subTab === 'all' && (
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                <div key={n} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse h-20" />
                            ))}
                        </div>
                    ) : filteredFriends.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFriends.map((f) => (
                                <div
                                    key={f._id}
                                    className="p-3.5 bg-gray-50/70 hover:bg-white rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-md transition duration-200 flex items-center justify-between gap-3 group"
                                >
                                    <Link href={`/${f.slug}`} className="flex items-center gap-3 min-w-0">
                                        {f.image ? (
                                            <img
                                                src={f.image}
                                                alt={f.name}
                                                className="w-12 h-12 rounded-full object-cover border border-white shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                {f.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs text-gray-900 truncate group-hover:text-indigo-600 transition">
                                                {f.name}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-medium">@{f.slug}</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href={`/${f.slug}`}
                                        className="px-3 py-1.5 bg-white group-hover:bg-indigo-50 border border-gray-200 group-hover:border-indigo-200 text-gray-700 group-hover:text-indigo-600 rounded-xl text-xs font-bold shadow-2xs transition shrink-0"
                                    >
                                        View
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 space-y-3">
                            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                                <Icon icon="solar:users-group-rounded-bold" width={28} />
                            </div>
                            <p className="text-sm font-bold text-gray-700">No friends found</p>
                            <p className="text-xs text-gray-400">Connect with others in the community to build your friend list.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
