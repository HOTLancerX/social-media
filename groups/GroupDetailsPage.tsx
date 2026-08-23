'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PostForm from '../ui/PostForm';
import PostCard from '../ui/PostCard';
import type { ISocialPostData } from '../models/SocialMedia';

interface GroupDetailsPageProps {
    groupSlug: string;
    currentUser?: any;
}

export default function GroupDetailsPage({ groupSlug, currentUser }: GroupDetailsPageProps) {
    const [group, setGroup] = useState<any>(null);
    const [isMember, setIsMember] = useState(false);
    const [posts, setPosts] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    const loadGroup = () => {
        setLoading(true);
        fetch(`/api/social-media/groups?slug=${groupSlug}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.group) {
                    setGroup(res.group);
                    setIsMember(res.isMember);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadGroup();
    }, [groupSlug]);

    const handleJoinLeave = async () => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }

        setJoining(true);
        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isMember ? 'leave' : 'join',
                    groupId: group._id,
                }),
            });
            if (res.ok) {
                loadGroup();
            }
        } catch (err) {
            console.error('Failed to join/leave group:', err);
        } finally {
            setJoining(false);
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

    if (!group) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-3">
                <Icon icon="solar:users-group-rounded-bold" width={48} className="text-gray-400 mx-auto" />
                <h3 className="text-lg font-bold text-gray-800">Group Not Found</h3>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] pb-16 pt-4">
            <div className="max-w-5xl mx-auto px-4 space-y-6">
                {/* 1. Group Header Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="relative w-full h-56 md:h-72 bg-gray-900 overflow-hidden">
                        <img
                            src={group.coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600'}
                            alt={group.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                    </div>

                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900">{group.name}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    group.privacy === 'public' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                    {group.privacy} Group
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                                {group.category} • {group.members?.length || 1} members
                            </p>
                            {group.description && (
                                <p className="text-xs text-gray-700 max-w-xl pt-1">
                                    {group.description}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleJoinLeave}
                            disabled={joining}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 ${
                                isMember
                                    ? 'bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                        >
                            <Icon icon={isMember ? 'solar:user-cross-bold' : 'solar:user-plus-bold'} width={16} />
                            <span>{isMember ? 'Joined (Leave)' : 'Join Group'}</span>
                        </button>
                    </div>
                </div>

                {/* 2. Group Feed Stream */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: About Group Widget */}
                    <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">About this group</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {group.description || 'Welcome to our community group. Feel free to join the discussion and share.'}
                        </p>
                        <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <Icon icon={group.privacy === 'public' ? 'solar:global-bold' : 'solar:lock-bold'} width={18} className="text-gray-400" />
                                <span>{group.privacy === 'public' ? 'Public: Anyone can see who is in the group and what they post.' : 'Private: Only members can see who is in the group and what they post.'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Group Discussions */}
                    <div className="lg:col-span-8 space-y-5">
                        {isMember ? (
                            <PostForm currentUser={currentUser} onPostCreated={(newPost) => setPosts([newPost, ...posts])} />
                        ) : group.privacy === 'private' ? (
                            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 space-y-3">
                                <Icon icon="solar:lock-bold" width={32} className="text-amber-500 mx-auto" />
                                <h4 className="text-sm font-bold text-gray-800">This Group is Private</h4>
                                <p className="text-xs text-gray-500">Join this group to view discussion and participate.</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
