'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Icon } from '@iconify/react';
import PostForm from '../ui/PostForm';
import PostCard from '../ui/PostCard';
import HexAvatar from '../ui/HexAvatar';
import GroupSettingsModal from './GroupSettingsModal';
import type { ISocialPostData } from '../models/SocialMedia';

interface GroupDetailsPageProps {
    groupSlug?: string;
    currentUser?: any;
}

export default function GroupDetailsPage({ groupSlug: initialGroupSlug, currentUser: propCurrentUser }: GroupDetailsPageProps) {
    const { data: session } = useSession();
    const sessionUser = (session?.user as any) || null;
    const currentUser = propCurrentUser || sessionUser;

    const pathname = usePathname() || '';
    const params = useParams();

    // Safely extract group slug from props, array params, or pathname
    const groupSlug = useMemo(() => {
        if (initialGroupSlug && typeof initialGroupSlug === 'string') return initialGroupSlug.trim();
        if (params?.slug) {
            if (Array.isArray(params.slug)) {
                return params.slug[params.slug.length - 1] || '';
            }
            return String(params.slug).split(',').pop()?.trim() || '';
        }
        if (pathname) {
            const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
            return segments[segments.length - 1] || '';
        }
        return '';
    }, [initialGroupSlug, params?.slug, pathname]);

    const [group, setGroup] = useState<any>(null);
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [posts, setPosts] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [activeTab, setActiveTab] = useState<'discussion' | 'members' | 'rules' | 'media'>('discussion');

    // Admin Member Approval State
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [membersSearch, setMembersSearch] = useState('');

    // Load Group Info
    const loadGroup = useCallback(async () => {
        if (!groupSlug) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/social-media/groups?slug=${groupSlug}`);
            if (res.ok) {
                const data = await res.json();
                if (data.group) {
                    setGroup(data.group);
                    setIsMember(Boolean(data.isMember));
                    setIsAdmin(Boolean(data.isAdmin));
                    setIsModerator(Boolean(data.isModerator));
                    setIsPending(Boolean(data.isPending));
                }
            }
        } catch (err) {
            console.error('Failed to load group:', err);
        } finally {
            setLoading(false);
        }
    }, [groupSlug]);

    // Load Group Posts
    const loadPosts = useCallback(async (groupId: string) => {
        setPostsLoading(true);
        try {
            const res = await fetch(`/api/social-media?groupId=${groupId}&limit=30`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Failed to load group posts:', err);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGroup();
    }, [loadGroup]);

    useEffect(() => {
        if (group?._id) {
            loadPosts(group._id);
        }
    }, [group?._id, loadPosts]);

    const handleJoinLeave = async () => {
        if (!currentUser?._id && !currentUser?.id) {
            window.location.href = '/login';
            return;
        }

        setJoining(true);
        let action = 'join';
        if (isMember) action = 'leave';
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
                await loadGroup();
                if (group._id) {
                    loadPosts(group._id);
                }
            }
        } catch (err) {
            console.error('Failed to join/leave group:', err);
        } finally {
            setJoining(false);
        }
    };

    const handleMemberAction = async (action: 'approve_member' | 'reject_member' | 'remove_member', targetUserId: string) => {
        setApprovingId(targetUserId);
        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    groupId: group._id,
                    targetUserId,
                }),
            });

            if (res.ok) {
                loadGroup();
            }
        } catch (err) {
            console.error('Member action failed:', err);
        } finally {
            setApprovingId(null);
        }
    };

    const handlePostCreated = (newPost: any) => {
        setPosts((prev) => [newPost, ...prev]);
    };

    const handlePostDeleted = (postId: string) => {
        setPosts((prev) => prev.filter((p) => String(p._id) !== postId));
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6 animate-pulse">
                <div className="h-64 sm:h-80 bg-gray-200 rounded-3xl" />
                <div className="h-28 bg-white rounded-3xl" />
                <div className="h-96 bg-white rounded-3xl" />
            </div>
        );
    }

    if (!group) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                    <Icon icon="solar:users-group-rounded-broken" width={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Group Not Found</h3>
                <p className="text-xs text-gray-500">
                    The group you are looking for does not exist or may have been removed.
                </p>
                <Link
                    href="/groups"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                >
                    <Icon icon="solar:arrow-left-bold" width={16} />
                    <span>Back to Groups Hub</span>
                </Link>
            </div>
        );
    }

    const isPublic = group.privacy === 'public';
    const canViewContent = isPublic || isMember || isAdmin;
    const allMembersList: any[] = group.members || [];
    const pendingMembersList: any[] = group.pendingMembers || [];

    return (
        <div className="min-h-screen text-gray-900 pb-20 pt-4">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-6">

                {/* ═════════════════════════════════════════════════════════════
                    1. Facebook-Style Group Header & Cover
                   ═════════════════════════════════════════════════════════════ */}
                <div className="bg-white rounded-3xl shadow-xs border border-gray-200/90 overflow-hidden">
                    {/* Cover Banner */}
                    <div className="relative w-full h-56 sm:h-72 md:h-80 bg-gray-900 overflow-hidden">
                        <img
                            src={group.coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600'}
                            alt={group.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Back to Hub Floating Link */}
                        <Link
                            href="/groups"
                            className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-bold transition"
                        >
                            <Icon icon="solar:arrow-left-bold" width={14} />
                            <span>All Groups</span>
                        </Link>

                        {/* Privacy Pill */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                            <Icon
                                icon={isPublic ? 'solar:global-bold' : 'solar:lock-bold'}
                                className={isPublic ? 'text-emerald-400' : 'text-amber-400'}
                                width={14}
                            />
                            <span className="capitalize">{group.privacy} Group</span>
                        </div>
                    </div>

                    {/* Group Title, Metrics & Action Bar */}
                    <div className="p-6 sm:p-8 space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                        {group.name}
                                    </h1>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                        isPublic ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                        {group.privacy}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Icon icon="solar:tag-bold" className="text-gray-400" />
                                        {group.category || 'General'}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-gray-400" />
                                        {group.membersCount || allMembersList.length || 1} members
                                    </span>
                                    <span>•</span>
                                    <span>{isPublic ? 'Public group' : 'Private community'}</span>
                                </div>
                            </div>

                            {/* Main Join / Leave Actions */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleJoinLeave}
                                    disabled={joining}
                                    className={`px-6 py-2.5 rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2 ${
                                        isMember
                                            ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600'
                                            : isPending
                                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                    }`}
                                >
                                    <Icon
                                        icon={
                                            isMember
                                                ? 'solar:check-circle-bold'
                                                : isPending
                                                ? 'solar:clock-circle-bold'
                                                : 'solar:user-plus-bold'
                                        }
                                        width={16}
                                    />
                                    <span>
                                        {isMember
                                            ? 'Joined (Leave)'
                                            : isPending
                                            ? 'Request Pending (Cancel)'
                                            : isPublic
                                            ? 'Join Group'
                                            : 'Request to Join'}
                                    </span>
                                </button>

                                {isAdmin && (
                                    <span className="px-3.5 py-2 rounded-2xl bg-purple-50 text-purple-700 text-xs font-bold flex items-center gap-1.5 border border-purple-200">
                                        <Icon icon="solar:shield-star-bold" width={16} />
                                        <span>Admin</span>
                                    </span>
                                )}

                                {(isAdmin || isModerator) && (
                                    <button
                                        type="button"
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        <Icon icon="solar:settings-minimalistic-bold" width={16} className="text-gray-600" />
                                        <span>Group Settings</span>
                                        {((group.pendingPostsCount || 0) > 0 || (pendingMembersList.length || 0) > 0) && (
                                            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
                                                {(group.pendingPostsCount || 0) + (pendingMembersList.length || 0)}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Navigation Tabs (Facebook Style) */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'discussion', label: 'Discussion', icon: 'solar:chat-round-dots-bold' },
                                {
                                    id: 'members',
                                    label: `Members (${allMembersList.length || group.membersCount || 1})`,
                                    icon: 'solar:users-group-rounded-bold',
                                },
                                { id: 'rules', label: 'About & Rules', icon: 'solar:document-text-bold' },
                                ...(isAdmin || isModerator
                                    ? [
                                          {
                                              id: 'settings',
                                              label: 'Manage & Settings',
                                              icon: 'solar:settings-minimalistic-bold',
                                          },
                                      ]
                                    : []),
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            if (tab.id === 'settings') {
                                                setIsSettingsOpen(true);
                                            } else {
                                                setActiveTab(tab.id as any);
                                            }
                                        }}
                                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-50 text-blue-600 shadow-2xs'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon icon={tab.icon} width={16} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════
                    2. Main Content Grid (Discussion / Members / Rules)
                   ═════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left 8-Cols: Active Tab Content */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* ── TAB 1: DISCUSSION ── */}
                        {activeTab === 'discussion' && (
                            <>
                                {/* Privacy Guard Lock for Private Groups */}
                                {!canViewContent ? (
                                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-xs space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                                            <Icon icon="solar:lock-bold" width={32} />
                                        </div>
                                        <h2 className="text-xl font-black text-gray-900">This Group is Private</h2>
                                        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                                            Only members of this group can see who is in the group and view or participate in posts and discussions.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleJoinLeave}
                                            disabled={joining}
                                            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                                        >
                                            {isPending ? 'Request Pending' : 'Request to Join Group'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Post Creation Form (Scoped to Group) */}
                                        {currentUser && (isMember || isAdmin) && (
                                            <PostForm
                                                currentUser={currentUser}
                                                groupId={group._id}
                                                groupName={group.name}
                                                onPostCreated={handlePostCreated}
                                            />
                                        )}

                                        {/* Group Feed Stream */}
                                        {postsLoading ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3].map((n) => (
                                                    <div key={n} className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 animate-pulse space-y-4">
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gray-200" />
                                                            <div className="space-y-2 flex-1">
                                                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                                                <div className="h-3 bg-gray-100 rounded w-1/5" />
                                                            </div>
                                                        </div>
                                                        <div className="h-20 bg-gray-100 rounded-xl" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : posts.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-xs space-y-3">
                                                <Icon icon="solar:chat-line-broken" width={40} className="text-gray-400 mx-auto" />
                                                <h3 className="text-base font-black text-gray-900">No Posts in this Group Yet</h3>
                                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                                    {isMember || isAdmin
                                                        ? 'Start the conversation! Share an update, image, or poll with group members.'
                                                        : 'Join this group to participate and share posts.'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {posts.map((post) => (
                                                    <PostCard
                                                        key={post._id}
                                                        post={post}
                                                        currentUser={currentUser}
                                                        onPostDeleted={handlePostDeleted}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* ── TAB 2: MEMBERS & PENDING REQUESTS ── */}
                        {activeTab === 'members' && (
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200/90 space-y-6">
                                
                                {/* Admin Pending Requests Shelf */}
                                {isAdmin && pendingMembersList.length > 0 && (
                                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                                <Icon icon="solar:clock-circle-bold" width={16} />
                                                <span>Pending Member Requests ({pendingMembersList.length})</span>
                                            </h3>
                                        </div>

                                        <div className="divide-y divide-amber-200/50">
                                            {pendingMembersList.map((pendingUser: any) => (
                                                <div key={pendingUser._id} className="py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <HexAvatar image={pendingUser.image} size="sm" />
                                                        <div>
                                                            <span className="text-xs font-bold text-gray-900 block">{pendingUser.name}</span>
                                                            <span className="text-[11px] text-gray-500">Wants to join</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={approvingId === pendingUser._id}
                                                            onClick={() => handleMemberAction('approve_member', pendingUser._id)}
                                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={approvingId === pendingUser._id}
                                                            onClick={() => handleMemberAction('reject_member', pendingUser._id)}
                                                            className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search Members */}
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-black text-gray-900">
                                        All Members ({allMembersList.length})
                                    </h3>
                                    <div className="relative w-48 sm:w-64">
                                        <Icon icon="solar:magnifer-bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={14} />
                                        <input
                                            type="text"
                                            value={membersSearch}
                                            onChange={(e) => setMembersSearch(e.target.value)}
                                            placeholder="Find member..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Members Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {allMembersList
                                        .filter((m: any) => !membersSearch || m.name?.toLowerCase().includes(membersSearch.toLowerCase()))
                                        .map((member: any) => {
                                            const isMemberAdmin =
                                                String(group.creatorId?._id || group.creatorId) === String(member._id) ||
                                                (group.admins || []).some((a: any) => String(a._id || a) === String(member._id));

                                            return (
                                                <div
                                                    key={member._id}
                                                    className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <HexAvatar image={member.image} size="sm" />
                                                        <div>
                                                            <Link
                                                                href={`/${member.slug || 'user'}`}
                                                                className="text-xs font-bold text-gray-900 hover:text-blue-600 transition block truncate"
                                                            >
                                                                {member.name}
                                                            </Link>
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {isMemberAdmin ? 'Group Admin' : 'Member'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isMemberAdmin && (
                                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* ── TAB 3: ABOUT & RULES ── */}
                        {activeTab === 'rules' && (
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200/90 space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Group Overview</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {group.description || 'Welcome to our group community.'}
                                    </p>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <Icon icon="solar:shield-check-bold" className="text-blue-600" />
                                        <span>Community Rules from Admins</span>
                                    </h3>
                                    <div className="space-y-2.5">
                                        {(group.rules && group.rules.length > 0
                                            ? group.rules
                                            : [
                                                  'Be respectful and kind to all members',
                                                  'No hate speech, bullying, or harassment',
                                                  'No unauthorized spam or promotional links',
                                                  'Respect member privacy and keep discussions constructive',
                                              ]
                                        ).map((rule: string, idx: number) => (
                                            <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                                                    {rule}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right 4-Cols: Sidebar Widgets */}
                    <aside className="lg:col-span-4 space-y-5 sticky top-20">
                        
                        {/* 1. About Group Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-200/90 space-y-4">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                About this group
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {group.description || 'Welcome to our group. Connect and collaborate with members.'}
                            </p>

                            <div className="space-y-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                                <div className="flex items-start gap-2.5">
                                    <Icon
                                        icon={isPublic ? 'solar:global-bold' : 'solar:lock-bold'}
                                        width={18}
                                        className={isPublic ? 'text-emerald-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'}
                                    />
                                    <div>
                                        <span className="font-bold text-gray-900 block">{isPublic ? 'Public' : 'Private'}</span>
                                        <span className="text-[11px] text-gray-500">
                                            {isPublic
                                                ? "Anyone can see who's in the group and what they post."
                                                : "Only members can see who's in the group and what they post."}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <Icon icon="solar:eye-bold" width={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-gray-900 block">Visible</span>
                                        <span className="text-[11px] text-gray-500">Anyone can find this group.</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <Icon icon="solar:history-bold" width={18} className="text-purple-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-gray-900 block">History</span>
                                        <span className="text-[11px] text-gray-500">Group created recently</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Group Admins Card */}
                        {group.creatorId && (
                            <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-200/90 space-y-3">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                    Group Admin Team
                                </h3>
                                <div className="flex items-center gap-3 pt-1">
                                    <HexAvatar image={group.creatorId.image} size="sm" />
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">
                                            {group.creatorId.name || 'Group Creator'}
                                        </span>
                                        <span className="text-[10px] text-purple-600 font-bold">Group Creator & Admin</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* Group Settings & Moderation Modal */}
            {isSettingsOpen && (
                <GroupSettingsModal
                    group={group}
                    currentUser={currentUser}
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onGroupUpdated={() => {
                        loadGroup();
                        if (group?._id) loadPosts(group._id);
                    }}
                />
            )}
        </div>
    );
}
