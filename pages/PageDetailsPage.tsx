'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PostForm from '../ui/PostForm';
import PostCard from '../ui/PostCard';
import type { ISocialPostData } from '../models/SocialMedia';

interface PageDetailsProps {
    pageSlug: string;
    currentUser?: any;
}

export default function PageDetailsPage({ pageSlug, currentUser }: PageDetailsProps) {
    const [page, setPage] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [posts, setPosts] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPage = () => {
        setLoading(true);
        fetch(`/api/social-media/pages?slug=${pageSlug}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.page) {
                    setPage(res.page);
                    setIsFollowing(res.isFollowing);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadPage();
    }, [pageSlug]);

    const handleFollowToggle = async () => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }

        try {
            const res = await fetch('/api/social-media/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isFollowing ? 'unfollow' : 'follow',
                    pageId: page._id,
                }),
            });
            if (res.ok) {
                setIsFollowing(!isFollowing);
            }
        } catch (err) {
            console.error('Follow failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4">
                <div className="h-64 bg-gray-200 rounded-3xl animate-pulse" />
                <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-3">
                <Icon icon="solar:shop-bold" width={48} className="text-gray-400 mx-auto" />
                <h3 className="text-lg font-bold text-gray-800">Page Not Found</h3>
            </div>
        );
    }

    const isOwner = currentUser?._id && String(page.ownerId?._id || page.ownerId) === String(currentUser._id);

    return (
        <div className="min-h-screen bg-[#F0F2F5] pb-16 pt-4">
            <div className="max-w-5xl mx-auto px-4 space-y-6">
                {/* 1. Page Header */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="relative w-full h-56 md:h-72 bg-gray-900 overflow-hidden">
                        <img
                            src={page.coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600'}
                            alt={page.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                    </div>

                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900">{page.name}</h1>
                                {page.verified && (
                                    <Icon icon="solar:verified-check-bold" width={20} className="text-blue-500" />
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                                {page.category} • {page.followers?.length || 1} followers
                            </p>
                            {page.bio && (
                                <p className="text-xs text-gray-700 max-w-xl pt-1">
                                    {page.bio}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleFollowToggle}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 ${
                                    isFollowing
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                <Icon icon={isFollowing ? 'solar:check-read-bold' : 'solar:like-bold'} width={16} />
                                <span>{isFollowing ? 'Following' : 'Follow Page'}</span>
                            </button>

                            {page.ctaButton?.link && (
                                <a
                                    href={page.ctaButton.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                >
                                    <span>{page.ctaButton.label || 'Visit'}</span>
                                    <Icon icon="solar:arrow-right-up-linear" width={14} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Page Timeline Stream */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Page Information</h3>
                        <div className="space-y-2.5 text-xs text-gray-600">
                            {page.website && (
                                <div className="flex items-center gap-2.5">
                                    <Icon icon="solar:global-bold" width={18} className="text-gray-400 shrink-0" />
                                    <a href={page.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">
                                        {page.website}
                                    </a>
                                </div>
                            )}
                            {page.email && (
                                <div className="flex items-center gap-2.5">
                                    <Icon icon="solar:letter-bold" width={18} className="text-gray-400 shrink-0" />
                                    <span>{page.email}</span>
                                </div>
                            )}
                            {page.phone && (
                                <div className="flex items-center gap-2.5">
                                    <Icon icon="solar:phone-bold" width={18} className="text-gray-400 shrink-0" />
                                    <span>{page.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-5">
                        {isOwner && (
                            <PostForm currentUser={currentUser} onPostCreated={(newPost) => setPosts([newPost, ...posts])} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
