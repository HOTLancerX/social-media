'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { REACTION_CONFIGS, REACTION_LIST } from './ReactionPicker';
import FacebookEmoji from './FacebookEmoji';
import type { IReactionsCount } from '../models/SocialMedia';
import type { ReactionType } from '../models/Like';

interface ReactionSummaryProps {
    targetId: string;
    targetType?: 'post' | 'comment';
    reactionsCount?: IReactionsCount;
    likesCount?: number;
    className?: string;
}

interface ReactionUserItem {
    _id: string;
    userId: string;
    userName: string;
    userImage?: string;
    userSlug?: string;
    userRole?: string;
    reaction: ReactionType;
    isFriend?: boolean;
    createdAt: string;
}

export default function ReactionSummary({
    targetId,
    targetType = 'post',
    reactionsCount,
    likesCount = 0,
    className = '',
}: ReactionSummaryProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [usersList, setUsersList] = useState<ReactionUserItem[]>([]);
    const [previewReactors, setPreviewReactors] = useState<ReactionUserItem[]>([]);
    const [summaryCounts, setSummaryCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Calculate top 3 reactions to display
    const topReactions = REACTION_LIST.filter((r) => (reactionsCount ? reactionsCount[r.type] > 0 : false))
        .sort((a, b) => (reactionsCount?.[b.type] || 0) - (reactionsCount?.[a.type] || 0))
        .slice(0, 3);

    const totalReactions = likesCount || (reactionsCount
        ? Object.values(reactionsCount).reduce((acc, v) => acc + (v || 0), 0)
        : 0);

    // Fetch live preview reactors for the post card stack
    useEffect(() => {
        if (totalReactions > 0 && targetId) {
            fetch(`/api/social-media/like?targetId=${targetId}&targetType=${targetType}`)
                .then((r) => r.json())
                .then((res) => {
                    if (res.previewReactors) {
                        setPreviewReactors(res.previewReactors);
                    }
                    if (res.summary) {
                        setSummaryCounts(res.summary);
                    }
                })
                .catch(() => {});
        }
    }, [targetId, targetType, totalReactions]);

    if (totalReactions <= 0 && topReactions.length === 0) {
        return null;
    }

    const openDetailsModal = async () => {
        setIsModalOpen(true);
        setLoading(true);
        try {
            const res = await fetch(
                `/api/social-media/like?targetId=${targetId}&targetType=${targetType}`
            );
            if (res.ok) {
                const data = await res.json();
                setUsersList(data.likes || []);
                setSummaryCounts(data.summary || {});
                if (data.previewReactors) {
                    setPreviewReactors(data.previewReactors);
                }
            }
        } catch (err) {
            console.error('Failed to load reaction details:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers =
        activeTab === 'all'
            ? usersList
            : usersList.filter((u) => u.reaction === activeTab);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toString();
    };

    return (
        <>
            <button
                type="button"
                onClick={openDetailsModal}
                className={`inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition cursor-pointer group select-none ${className}`}
                title="View reactions"
            >
                {/* Overlapping Reaction Emojis */}
                <div className="flex -space-x-1 items-center">
                    {topReactions.length > 0 ? (
                        topReactions.map((r, i) => (
                            <span
                                key={r.type}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full overflow-hidden bg-white shadow-xs border border-gray-100 z-10"
                                style={{ zIndex: 10 - i }}
                            >
                                <FacebookEmoji type={r.type} size="xxs" />
                            </span>
                        ))
                    ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full overflow-hidden bg-white shadow-xs border border-gray-100">
                            <FacebookEmoji type="like" size="xxs" />
                        </span>
                    )}
                </div>

                <span className="font-bold text-gray-700 text-xs">
                    {formatNumber(totalReactions)}
                </span>

                {/* Overlapping Real User Avatars Stack (Top 5: Friends first, then recent) */}
                {previewReactors.length > 0 && (
                    <div className="hidden sm:flex -space-x-1.5 items-center pl-0.5">
                        {previewReactors.slice(0, 5).map((u, idx) => (
                            <div
                                key={u._id || u.userId || idx}
                                className="relative rounded-full"
                                style={{ zIndex: 10 - idx }}
                                title={`${u.userName}${u.isFriend ? ' (Friend)' : ''}`}
                            >
                                {u.userImage ? (
                                    <img
                                        src={u.userImage}
                                        alt={u.userName}
                                        className="w-5 h-5 rounded-full object-cover border-2 border-white shadow-xs"
                                    />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-[9px] flex items-center justify-center border-2 border-white shadow-xs">
                                        {u.userName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </button>

            {/* Reaction Breakdown Modal */}
            {isModalOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-99999 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                                    <Icon icon="solar:heart-bold" className="text-rose-500" width={20} />
                                    Reactions ({totalReactions})
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-bold" width={22} />
                                </button>
                            </div>

                            {/* Tab filter bar */}
                            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 overflow-x-auto no-scrollbar bg-gray-50/70">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                        activeTab === 'all'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200/70'
                                    }`}
                                >
                                    <span>All</span>
                                    <span>{summaryCounts.all || totalReactions}</span>
                                </button>

                                {REACTION_LIST.map((r) => {
                                    const count = summaryCounts[r.type] || reactionsCount?.[r.type] || 0;
                                    if (count <= 0) return null;
                                    return (
                                        <button
                                            key={r.type}
                                            type="button"
                                            onClick={() => setActiveTab(r.type)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                                activeTab === r.type
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'text-gray-600 hover:bg-gray-200/70'
                                            }`}
                                        >
                                            <FacebookEmoji type={r.type} size="xxs" />
                                            <span>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Users List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
                                {loading ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Icon icon="line-md:loading-twotone-loop" width={32} className="text-blue-500" />
                                        <span className="text-xs font-bold">Loading reactions...</span>
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 text-xs font-medium">
                                        No reactions in this category
                                    </div>
                                ) : (
                                    filteredUsers.map((item) => {
                                        return (
                                            <div
                                                key={item._id || item.userId}
                                                className="flex items-center justify-between pt-3 first:pt-0 gap-3"
                                            >
                                                <Link
                                                    href={`/${item.userSlug || item.userId}`}
                                                    onClick={() => setIsModalOpen(false)}
                                                    className="flex items-center gap-3 min-w-0 group flex-1"
                                                >
                                                    <div className="relative shrink-0">
                                                        {item.userImage ? (
                                                            <img
                                                                src={item.userImage}
                                                                alt={item.userName}
                                                                className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                                                {item.userName?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden bg-white shadow-xs border border-gray-100 flex items-center justify-center">
                                                            <FacebookEmoji type={item.reaction} size="xxs" />
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 truncate transition">
                                                                {item.userName}
                                                            </h4>
                                                            {item.isFriend && (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-200">
                                                                    Friend
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 truncate">
                                                            {item.userSlug ? `@${item.userSlug}` : item.userRole || 'Community Member'}
                                                        </p>
                                                    </div>
                                                </Link>

                                                <Link
                                                    href={`/${item.userSlug || item.userId}`}
                                                    onClick={() => setIsModalOpen(false)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-xs font-bold rounded-xl transition shrink-0"
                                                >
                                                    View Profile
                                                </Link>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
