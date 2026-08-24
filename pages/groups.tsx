'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import HexAvatar from '../ui/HexAvatar';
import Gallery from '@/components/Gallery';

interface IGroupData {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    avatarImage?: string;
    coverImage?: string;
    privacy: 'public' | 'private';
    membersCount: number;
    creatorId?: any;
    admins?: any[];
    members?: any[];
    isMember?: boolean;
    isAdmin?: boolean;
    isPending?: boolean;
    createdAt?: string;
}

const CATEGORIES = [
    'All',
    'General',
    'Technology',
    'Design & Art',
    'Photography',
    'Music & Audio',
    'Gaming',
    'Business & Startups',
    'Lifestyle',
];

const DEFAULT_COVERS = [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600',
];

export default function GroupsPage() {
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    const [groups, setGroups] = useState<IGroupData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'discover' | 'my' | 'admin' | 'public' | 'private'>('discover');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [joiningId, setJoiningId] = useState<string | null>(null);

    // Create Group Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createSlug, setCreateSlug] = useState('');
    const [slugStatus, setSlugStatus] = useState<{
        checking: boolean;
        available: boolean | null;
        message: string;
    }>({ checking: false, available: null, message: '' });
    const [createDescription, setCreateDescription] = useState('');
    const [createCategory, setCreateCategory] = useState('Technology');
    const [createPrivacy, setCreatePrivacy] = useState<'public' | 'private'>('public');
    const [createAvatar, setCreateAvatar] = useState('');
    const [createCover, setCreateCover] = useState(DEFAULT_COVERS[0]);
    const [createRules, setCreateRules] = useState<string[]>([
        'Be respectful and kind to all members',
        'No hate speech, bullying, or harassment',
        'No unauthorized spam or promotional links',
    ]);
    const [newRuleInput, setNewRuleInput] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Auto-generate slug suggestion from name if not manually modified
    const handleNameChange = (nameVal: string) => {
        setCreateName(nameVal);
        const auto = nameVal.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        setCreateSlug(auto);
    };

    // Live slug availability check for new group
    useEffect(() => {
        if (!createSlug || createSlug.trim() === '') {
            setSlugStatus({ checking: false, available: null, message: '' });
            return;
        }

        const clean = createSlug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        if (clean.length < 2) {
            setSlugStatus({ checking: false, available: false, message: 'Slug must be at least 2 characters' });
            return;
        }

        setSlugStatus((prev) => ({ ...prev, checking: true }));
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/social-media/groups?check_slug=${encodeURIComponent(clean)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSlugStatus({
                        checking: false,
                        available: data.available,
                        message: data.message || (data.available ? 'Slug is available!' : 'Slug is already taken'),
                    });
                }
            } catch {
                setSlugStatus({ checking: false, available: null, message: '' });
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [createSlug]);

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeTab !== 'discover') {
                params.set('list', activeTab);
            }
            if (selectedCategory !== 'All') {
                params.set('category', selectedCategory);
            }
            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim());
            }

            const res = await fetch(`/api/social-media/groups?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data.groups || []);
            } else {
                setGroups([]);
            }
        } catch (err) {
            console.error('Failed to fetch groups:', err);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedCategory, searchQuery]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleJoinLeave = async (group: IGroupData) => {
        if (!currentUser?._id && !currentUser?.id) {
            window.location.href = '/login';
            return;
        }

        setJoiningId(group._id);
        const isJoined = group.isMember;
        const isPending = group.isPending;

        let action = 'join';
        if (isJoined) action = 'leave';
        else if (isPending) action = 'cancel_request';

        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    groupId: group._id,
                }),
            });

            if (res.ok) {
                fetchGroups();
            }
        } catch (err) {
            console.error('Group action failed:', err);
        } finally {
            setJoiningId(null);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) {
            setCreateError('Please provide a group name');
            return;
        }

        setCreating(true);
        setCreateError('');

        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    name: createName.trim(),
                    slug: createSlug.trim(),
                    description: createDescription.trim(),
                    category: createCategory,
                    privacy: createPrivacy,
                    avatarImage: createAvatar,
                    coverImage: createCover,
                    rules: createRules,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setIsCreateOpen(false);
                setCreateName('');
                setCreateDescription('');
                fetchGroups();
                if (data.group?.slug) {
                    window.location.href = `/group/${data.group.slug}`;
                }
            } else {
                const err = await res.json();
                setCreateError(err.error || 'Failed to create group');
            }
        } catch {
            setCreateError('An error occurred while creating the group');
        } finally {
            setCreating(false);
        }
    };

    const handleAddRule = () => {
        if (!newRuleInput.trim()) return;
        setCreateRules([...createRules, newRuleInput.trim()]);
        setNewRuleInput('');
    };

    const handleRemoveRule = (index: number) => {
        setCreateRules(createRules.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen text-gray-900 pb-20 pt-4">
            <div className="container mx-auto px-4 sm:px-6 space-y-6">

                {/* ═════════════════════════════════════════════════════════════
                    1. Hero Header & Create Group Trigger
                   ═════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200/90 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                                <Icon icon="solar:users-group-two-rounded-bold" />
                                Community Groups
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                Discover & Join Groups
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
                                Connect with people who share your passions, collaborate in private spaces, and join public discussions.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
                            >
                                <Icon icon="solar:add-circle-bold" width={18} />
                                <span>Create New Group</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════
                    2. 3-Column Layout: Filter Sidebar & Group Grid
                   ═════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Sidebar: Filters & Navigation */}
                    <aside className="lg:col-span-3 space-y-5 sticky top-20">
                        
                        {/* Navigation Tabs */}
                        <div className="bg-white rounded-3xl p-3 shadow-xs border border-gray-200/90 space-y-1">
                            {[
                                { id: 'discover', label: 'Discover Groups', icon: 'solar:compass-bold', color: 'text-blue-500' },
                                ...(currentUser
                                    ? [
                                          { id: 'my', label: 'My Joined Groups', icon: 'solar:user-check-bold', color: 'text-emerald-500' },
                                          { id: 'admin', label: 'Groups I Manage', icon: 'solar:shield-user-bold', color: 'text-purple-500' },
                                      ]
                                    : []),
                                { id: 'public', label: 'Public Groups', icon: 'solar:global-bold', color: 'text-cyan-500' },
                                { id: 'private', label: 'Private Groups', icon: 'solar:lock-bold', color: 'text-amber-500' },
                            ].map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveTab(item.id as any)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-600 shadow-2xs translate-x-1'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <Icon icon={item.icon} width={18} className={isActive ? 'text-blue-600' : item.color} />
                                            <span>{item.label}</span>
                                        </span>
                                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search in Groups */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-3">
                            <label className="text-xs font-bold text-gray-700 block">Search Groups</label>
                            <div className="relative">
                                <Icon icon="solar:magnifer-bold" width={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter by group name..."
                                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <Icon icon="solar:close-circle-bold" width={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Categories List */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-2">
                            <label className="text-xs font-bold text-gray-700 block mb-2">Category Filter</label>
                            <div className="flex flex-wrap gap-1.5">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            selectedCategory === cat
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Middle Column: Groups Grid */}
                    <main className="lg:col-span-9 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                                <Icon icon="solar:users-group-rounded-bold" className="text-blue-600" width={20} />
                                <span>{activeTab === 'discover' ? 'All Community Groups' : activeTab.toUpperCase() + ' Groups'}</span>
                            </h2>
                            <span className="text-xs font-bold text-gray-500">
                                {groups.length} Group{groups.length !== 1 ? 's' : ''} found
                            </span>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/80 animate-pulse space-y-4">
                                        <div className="h-36 bg-gray-200 rounded-2xl" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-xs space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                                    <Icon icon="solar:users-group-rounded-broken" width={32} />
                                </div>
                                <h3 className="text-base font-black text-gray-900">No Groups Found</h3>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    {searchQuery
                                        ? 'No groups matched your search query. Try different keywords.'
                                        : 'There are no groups available in this category yet. Be the first to create one!'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(true)}
                                    className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
                                >
                                    Create a Group
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {groups.map((group) => {
                                    const isPublic = group.privacy === 'public';
                                    const isJoined = Boolean(group.isMember);
                                    const isPending = Boolean(group.isPending);

                                    return (
                                        <div
                                            key={group._id}
                                            className="bg-white rounded-3xl overflow-hidden shadow-xs border border-gray-200/90 hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
                                        >
                                            <div>
                                                {/* Cover Banner */}
                                                <Link href={`/group/${group.slug}`} className="block relative h-36 bg-gray-900 overflow-hidden group">
                                                    <img
                                                        src={group.coverImage || DEFAULT_COVERS[0]}
                                                        alt={group.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

                                                    {/* Privacy Pill */}
                                                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5">
                                                        <Icon
                                                            icon={isPublic ? 'solar:global-bold' : 'solar:lock-bold'}
                                                            className={isPublic ? 'text-emerald-400' : 'text-amber-400'}
                                                            width={12}
                                                        />
                                                        <span className="capitalize">{group.privacy} Group</span>
                                                    </div>

                                                    {/* Category Tag */}
                                                    <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-xs text-[10px] font-bold text-white">
                                                        {group.category || 'General'}
                                                    </div>
                                                </Link>

                                                {/* Group Body */}
                                                <div className="p-5 space-y-3">
                                                    <div>
                                                        <Link
                                                            href={`/group/${group.slug}`}
                                                            className="text-base font-black text-gray-900 hover:text-blue-600 transition block truncate"
                                                        >
                                                            {group.name}
                                                        </Link>
                                                        <p className="text-xs text-gray-500 font-medium pt-0.5 flex items-center gap-2">
                                                            <span>{group.membersCount || 1} members</span>
                                                            <span>•</span>
                                                            <span>{isPublic ? 'Public posts' : 'Private discussions'}</span>
                                                        </p>
                                                    </div>

                                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                        {group.description || 'Welcome to our community group. Feel free to join the discussion and share.'}
                                                    </p>

                                                    {/* Member Avatars Stack */}
                                                    {group.members && group.members.length > 0 && (
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <div className="flex -space-x-2 overflow-hidden">
                                                                {group.members.slice(0, 4).map((m: any, i: number) => (
                                                                    <div key={i} className="inline-block ring-2 ring-white rounded-full">
                                                                        <HexAvatar image={m.image} size="sm" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="text-[11px] text-gray-400 font-medium">
                                                                {group.membersCount > 4 ? `+${group.membersCount - 4} others` : 'Active community'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
                                                <Link
                                                    href={`/group/${group.slug}`}
                                                    className="flex-1 py-2 text-center rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition"
                                                >
                                                    View Group
                                                </Link>

                                                <button
                                                    type="button"
                                                    disabled={joiningId === group._id}
                                                    onClick={() => handleJoinLeave(group)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        isJoined
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-600'
                                                            : isPending
                                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    }`}
                                                >
                                                    <Icon
                                                        icon={
                                                            isJoined
                                                                ? 'solar:check-circle-bold'
                                                                : isPending
                                                                ? 'solar:clock-circle-bold'
                                                                : 'solar:user-plus-bold'
                                                        }
                                                        width={14}
                                                    />
                                                    <span>
                                                        {isJoined
                                                            ? 'Joined'
                                                            : isPending
                                                            ? 'Requested'
                                                            : isPublic
                                                            ? 'Join Group'
                                                            : 'Request to Join'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════
                3. Facebook-Style "Create Group" Modal
               ═════════════════════════════════════════════════════════════ */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                                    <Icon icon="solar:users-group-two-rounded-bold" width={20} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Create New Group</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
                            >
                                <Icon icon="solar:close-circle-bold" width={18} />
                            </button>
                        </div>

                        {createError && (
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                                <Icon icon="solar:danger-triangle-bold" width={16} />
                                <span>{createError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            {/* Group Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">Group Name *</label>
                                <input
                                    type="text"
                                    value={createName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Photography Masters Club"
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Custom Group URL / Slug */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-700">Custom Group URL (Slug) *</label>
                                    {slugStatus.checking ? (
                                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                                            <Icon icon="solar:spinner-line" className="animate-spin" width={13} />
                                            Checking availability...
                                        </span>
                                    ) : slugStatus.available === true ? (
                                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                            <Icon icon="solar:check-circle-bold" width={13} />
                                            {slugStatus.message}
                                        </span>
                                    ) : slugStatus.available === false ? (
                                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                            <Icon icon="solar:close-circle-bold" width={13} />
                                            {slugStatus.message}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white overflow-hidden">
                                    <span className="px-3 text-xs text-gray-400 font-bold select-none bg-gray-100/80 py-2 border-r border-gray-200">
                                        /group/
                                    </span>
                                    <input
                                        type="text"
                                        value={createSlug}
                                        onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                                        placeholder="custom-slug"
                                        required
                                        className="flex-1 px-3 py-2 text-xs font-bold text-gray-900 bg-transparent outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Shareable URL: <span className="font-semibold text-gray-600">/group/{createSlug || 'slug'}</span>
                                </p>
                            </div>

                            {/* Category */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">Category</label>
                                <select
                                    value={createCategory}
                                    onChange={(e) => setCreateCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Privacy Selection (Facebook Style) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Choose Privacy *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label
                                        onClick={() => setCreatePrivacy('public')}
                                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                            createPrivacy === 'public'
                                                ? 'border-blue-600 bg-blue-50/50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon icon="solar:global-bold" width={18} className="text-emerald-500" />
                                            <span className="text-xs font-black text-gray-900">Public Group</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-tight">
                                            Anyone can see who's in the group and what they post.
                                        </p>
                                    </label>

                                    <label
                                        onClick={() => setCreatePrivacy('private')}
                                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                            createPrivacy === 'private'
                                                ? 'border-blue-600 bg-blue-50/50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon icon="solar:lock-bold" width={18} className="text-amber-500" />
                                            <span className="text-xs font-black text-gray-900">Private Group</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-tight">
                                            Only members can see who's in the group and what they post.
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">Description</label>
                                <textarea
                                    value={createDescription}
                                    onChange={(e) => setCreateDescription(e.target.value)}
                                    placeholder="Tell people what your group is all about..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                            </div>

                            {/* Group Icon / Avatar with Gallery */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Group Icon / Avatar</label>
                                <Gallery
                                    value={createAvatar}
                                    onChange={(val) => setCreateAvatar(Array.isArray(val) ? (val[0] || '') : (val || ''))}
                                    placeholder="Select or Upload Group Icon"
                                />
                            </div>

                            {/* Cover Photo with Gallery & Presets */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-700">Select Cover Photo</label>
                                    <span className="text-[11px] text-gray-400">Media library or presets below</span>
                                </div>
                                <Gallery
                                    value={createCover}
                                    onChange={(val) => setCreateCover(Array.isArray(val) ? (val[0] || '') : (val || ''))}
                                    placeholder="Select or Upload Group Cover Photo"
                                />
                                <div className="pt-1.5">
                                    <span className="text-[10px] font-bold text-gray-500 block mb-1">Preset Options:</span>
                                    <div className="grid grid-cols-5 gap-2">
                                        {DEFAULT_COVERS.map((cov, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setCreateCover(cov)}
                                                className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                                                    createCover === cov ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <img src={cov} alt="cover option" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Community Rules */}
                            <div className="space-y-2 pt-1 border-t border-gray-100">
                                <label className="text-xs font-bold text-gray-700 block">Community Rules</label>
                                <div className="space-y-1.5">
                                    {createRules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-xl text-xs text-gray-700">
                                            <span className="truncate pr-2">{idx + 1}. {rule}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRule(idx)}
                                                className="text-gray-400 hover:text-red-500 transition"
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newRuleInput}
                                        onChange={(e) => setNewRuleInput(e.target.value)}
                                        placeholder="Add custom rule..."
                                        className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddRule}
                                        className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-700"
                                    >
                                        Add Rule
                                    </button>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                                >
                                    {creating ? 'Creating Group...' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
