'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import PostCard from '../ui/PostCard';
import type { ISocialPostData } from '../models/SocialMedia';

interface SinglePostPageProps {
    postId?: string;
    searchParams?: Record<string, string | string[] | undefined>;
}

export default function SinglePostPage({ postId: propPostId }: SinglePostPageProps) {
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    const [post, setPost] = useState<ISocialPostData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Extract post ID from props or URL pathname/hash
        let id = propPostId;
        if (!id && typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            id = pathParts[pathParts.length - 1];
            if (id === 'post' || id === 'feeds') {
                const hash = window.location.hash.replace(/^#post-/, '');
                if (hash) id = hash;
            }
        }

        if (id) {
            fetchPost(id);
        } else {
            setError('No post ID specified');
            setLoading(false);
        }
    }, [propPostId]);

    const fetchPost = async (id: string) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/social-media/${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.post) {
                    setPost(data.post);
                } else {
                    setError('Post not found');
                }
            } else {
                setError('Post not found or has been deleted');
            }
        } catch (err: any) {
            console.error('Failed to load post:', err);
            setError('Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-16">
            {/* Top Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-blue-600 transition"
                    >
                        <Icon icon="solar:arrow-left-bold" width={18} />
                        <span>Back to Feeds</span>
                    </a>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                            <Icon icon="solar:chat-round-line-bold" width={16} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">Post Details</span>
                    </div>
                </div>
            </div>

            {/* Post Container */}
            <div className="container pt-6">
                {loading ? (
                    <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 space-y-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                                <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                            </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-56 bg-gray-100 rounded-xl" />
                    </div>
                ) : error || !post ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-gray-200/80 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                            <Icon icon="solar:danger-circle-bold" width={32} />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">
                            {error || 'Post Not Found'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            This post may have been removed or the link might be broken.
                        </p>
                        <a
                            href="/"
                            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                        >
                            Explore Feeds
                        </a>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <PostCard
                            post={post}
                            currentUser={currentUser}
                            onPostDeleted={() => {
                                window.location.href = '/';
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
