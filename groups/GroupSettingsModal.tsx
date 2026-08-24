'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import HexAvatar from '../ui/HexAvatar';
import Gallery from '@/components/Gallery';
import type { ISocialPostData } from '../models/SocialMedia';

const CATEGORIES = [
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

interface GroupSettingsModalProps {
    group: any;
    currentUser: any;
    isOpen: boolean;
    onClose: () => void;
    onGroupUpdated: () => void;
}

export default function GroupSettingsModal({
    group,
    currentUser,
    isOpen,
    onClose,
    onGroupUpdated,
}: GroupSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'moderation' | 'members' | 'banned' | 'rules' | 'danger'>('general');

    // General Settings State
    const [name, setName] = useState(group?.name || '');
    const [slug, setSlug] = useState(group?.slug || '');
    const [slugStatus, setSlugStatus] = useState<{
        checking: boolean;
        available: boolean | null;
        message: string;
    }>({ checking: false, available: null, message: '' });
    const [description, setDescription] = useState(group?.description || '');
    const [category, setCategory] = useState(group?.category || 'General');
    const [privacy, setPrivacy] = useState<'public' | 'private'>(group?.privacy || 'public');
    const [coverImage, setCoverImage] = useState(group?.coverImage || DEFAULT_COVERS[0]);
    const [avatarImage, setAvatarImage] = useState(group?.avatarImage || '');
    const [postApproval, setPostApproval] = useState<'auto' | 'admin_approval'>(group?.postApproval || 'auto');
    const [allowMemberInvites, setAllowMemberInvites] = useState<boolean>(group?.allowMemberInvites !== false);
    const [rules, setRules] = useState<string[]>(group?.rules || []);
    const [newRuleInput, setNewRuleInput] = useState('');

    // Live slug availability checker
    useEffect(() => {
        if (!slug || slug.trim() === '') {
            setSlugStatus({ checking: false, available: null, message: '' });
            return;
        }

        const clean = slug
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        if (clean === group?.slug) {
            setSlugStatus({ checking: false, available: true, message: 'Current group URL / slug' });
            return;
        }

        if (clean.length < 2) {
            setSlugStatus({ checking: false, available: false, message: 'Slug must be at least 2 characters (letters, numbers, hyphens)' });
            return;
        }

        setSlugStatus((prev) => ({ ...prev, checking: true }));
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/social-media/groups?check_slug=${encodeURIComponent(clean)}&excludeId=${group?._id || ''}`);
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
    }, [slug, group?.slug, group?._id]);

    // Pending Posts State
    const [pendingPosts, setPendingPosts] = useState<ISocialPostData[]>([]);
    const [loadingPendingPosts, setLoadingPendingPosts] = useState(false);
    const [processingPostId, setProcessingPostId] = useState<string | null>(null);

    // Submitting State
    const [saving, setSaving] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

    const isCreator = String(group?.creatorId?._id || group?.creatorId) === String(currentUser?._id || currentUser?.id);

    useEffect(() => {
        if (group) {
            setName(group.name || '');
            setDescription(group.description || '');
            setCategory(group.category || 'General');
            setPrivacy(group.privacy || 'public');
            setCoverImage(group.coverImage || DEFAULT_COVERS[0]);
            setAvatarImage(group.avatarImage || '');
            setPostApproval(group.postApproval || 'auto');
            setAllowMemberInvites(group.allowMemberInvites !== false);
            setRules(group.rules || []);
        }
    }, [group]);

    // Fetch Pending Posts for Moderation
    const fetchPendingPosts = useCallback(async () => {
        if (!group?._id) return;
        setLoadingPendingPosts(true);
        try {
            const res = await fetch(`/api/social-media?groupId=${group._id}&status=pending_approval&limit=50`);
            if (res.ok) {
                const data = await res.json();
                setPendingPosts(data.posts || []);
            }
        } catch (err) {
            console.error('Failed to fetch pending posts:', err);
        } finally {
            setLoadingPendingPosts(false);
        }
    }, [group?._id]);

    useEffect(() => {
        if (isOpen && activeTab === 'moderation') {
            fetchPendingPosts();
        }
    }, [isOpen, activeTab, fetchPendingPosts]);

    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFeedbackMsg(null);

        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_settings',
                    groupId: group._id,
                    name,
                    slug: slug.trim(),
                    description,
                    category,
                    privacy,
                    postApproval,
                    allowMemberInvites,
                    coverImage,
                    avatarImage,
                    rules,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setFeedbackMsg({ type: 'success', text: 'Group settings and custom slug updated successfully!' });
                onGroupUpdated();
                if (data.newSlug && data.newSlug !== group.slug) {
                    window.history.replaceState({}, '', `/group/${data.newSlug}`);
                }
            } else {
                const err = await res.json();
                setFeedbackMsg({ type: 'error', text: err.error || 'Failed to update settings' });
            }
        } catch {
            setFeedbackMsg({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePostModeration = async (action: 'approve_post' | 'decline_post', postId: string) => {
        setProcessingPostId(postId);
        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    groupId: group._id,
                    postId,
                }),
            });

            if (res.ok) {
                setPendingPosts((prev) => prev.filter((p) => String(p._id) !== postId));
                onGroupUpdated();
            }
        } catch (err) {
            console.error('Failed to moderate post:', err);
        } finally {
            setProcessingPostId(null);
        }
    };

    const handleMemberAction = async (action: string, targetUserId: string) => {
        setProcessingUserId(targetUserId);
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
                onGroupUpdated();
            }
        } catch (err) {
            console.error('Failed member action:', err);
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm('Are you sure you want to permanently delete this group? All posts and memberships will be removed.')) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/social-media/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_group',
                    groupId: group._id,
                }),
            });

            if (res.ok) {
                window.location.href = '/groups';
            }
        } catch (err) {
            console.error('Delete group failed:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const allMembers: any[] = group.members || [];
    const pendingMembers: any[] = group.pendingMembers || [];
    const bannedUsers: any[] = group.bannedUsers || [];
    const moderators: any[] = group.moderators || [];
    const admins: any[] = group.admins || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* 1. Modal Top Bar */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Icon icon="solar:settings-minimalistic-bold" width={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <span>Group Settings & Moderation</span>
                            </h2>
                            <p className="text-xs text-gray-500">Manage permissions, post approvals, branding, and members</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-gray-500 flex items-center justify-center transition border border-gray-200/80 cursor-pointer"
                    >
                        <Icon icon="solar:close-circle-bold" width={20} />
                    </button>
                </div>

                {/* Feedback Alerts */}
                {feedbackMsg && (
                    <div className={`px-6 py-3 text-xs font-bold flex items-center gap-2 ${
                        feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                        <Icon icon={feedbackMsg.type === 'success' ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'} width={16} />
                        <span>{feedbackMsg.text}</span>
                    </div>
                )}

                {/* 2. Main Body with Sidebar Tabs */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                    
                    {/* Left Sidebar Navigation */}
                    <aside className="md:col-span-4 bg-gray-50/50 p-4 border-r border-gray-100 space-y-1 overflow-y-auto">
                        {[
                            { id: 'general', label: 'General & Branding', icon: 'solar:pen-new-square-bold', count: null },
                            {
                                id: 'moderation',
                                label: 'Post Approvals',
                                icon: 'solar:shield-check-bold',
                                count: pendingPosts.length > 0 ? pendingPosts.length : (group.pendingPostsCount || null),
                            },
                            {
                                id: 'members',
                                label: 'Members & Roles',
                                icon: 'solar:users-group-rounded-bold',
                                count: pendingMembers.length > 0 ? `+${pendingMembers.length}` : null,
                            },
                            { id: 'banned', label: 'Banned & Blocked', icon: 'solar:user-block-rounded-bold', count: bannedUsers.length || null },
                            { id: 'rules', label: 'Community Rules', icon: 'solar:document-text-bold', count: rules.length || null },
                            ...(isCreator
                                ? [{ id: 'danger', label: 'Danger Zone', icon: 'solar:trash-bin-trash-bold', count: null }]
                                : []),
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center gap-2.5 truncate">
                                        <Icon icon={tab.icon} width={18} />
                                        <span>{tab.label}</span>
                                    </span>
                                    {tab.count !== null && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </aside>

                    {/* Right Content View */}
                    <div className="md:col-span-8 p-6 overflow-y-auto max-h-[70vh]">
                        
                        {/* ── 1. GENERAL & BRANDING TAB ── */}
                        {activeTab === 'general' && (
                            <form onSubmit={handleSaveGeneral} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Group Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
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
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                                            placeholder="custom-slug"
                                            required
                                            className="flex-1 px-3 py-2 text-xs font-bold text-gray-900 bg-transparent outline-none"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        Members can access your group directly at <span className="font-semibold text-gray-600">/group/{slug || 'slug'}</span>
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Privacy Setting */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Group Privacy</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            onClick={() => setPrivacy('public')}
                                            className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                                privacy === 'public' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                                <Icon icon="solar:global-bold" className="text-emerald-500" />
                                                Public
                                            </span>
                                            <span className="text-[10px] text-gray-500 pt-1">Anyone can see posts and members</span>
                                        </label>

                                        <label
                                            onClick={() => setPrivacy('private')}
                                            className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                                privacy === 'private' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                                <Icon icon="solar:lock-bold" className="text-amber-500" />
                                                Private
                                            </span>
                                            <span className="text-[10px] text-gray-500 pt-1">Only joined members can see posts</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>

                                {/* Group Icon / Avatar with Gallery */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Group Icon / Avatar</label>
                                    <Gallery
                                        value={avatarImage}
                                        onChange={(val) => setAvatarImage(Array.isArray(val) ? (val[0] || '') : (val || ''))}
                                        placeholder="Select or Upload Group Icon"
                                    />
                                </div>

                                {/* Cover Photo with Gallery & Presets */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700">Cover Photo</label>
                                        <span className="text-[11px] text-gray-400">Choose from media library or presets below</span>
                                    </div>
                                    <Gallery
                                        value={coverImage}
                                        onChange={(val) => setCoverImage(Array.isArray(val) ? (val[0] || '') : (val || ''))}
                                        placeholder="Select or Upload Group Cover Photo"
                                    />
                                    <div className="pt-2">
                                        <span className="text-[11px] font-bold text-gray-500 block mb-1.5">Or Pick a Preset Cover:</span>
                                        <div className="grid grid-cols-5 gap-2">
                                            {DEFAULT_COVERS.map((cov, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setCoverImage(cov)}
                                                    className={`aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition ${
                                                        coverImage === cov ? 'border-blue-600 scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                                                    }`}
                                                >
                                                    <img src={cov} alt="cover" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Member Invites Toggle */}
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">Allow Member Invites</span>
                                        <span className="text-[11px] text-gray-500">Enable regular members to invite their friends to this group</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={allowMemberInvites}
                                        onChange={(e) => setAllowMemberInvites(e.target.checked)}
                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </form>
                        )}

                        {/* ── 2. POST APPROVAL & MODERATION TAB ── */}
                        {activeTab === 'moderation' && (
                            <div className="space-y-6">
                                
                                {/* Post Approval Mode Toggle */}
                                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/90 space-y-3">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                        Post Approval Policy
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label
                                            onClick={() => setPostApproval('auto')}
                                            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                                postApproval === 'auto' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                                <Icon icon="solar:bolt-bold" className="text-amber-500" />
                                                Auto-Approve Posts
                                            </span>
                                            <span className="text-[11px] text-gray-500 pt-1">
                                                Any member's post is published directly to the group feed.
                                            </span>
                                        </label>

                                        <label
                                            onClick={() => setPostApproval('admin_approval')}
                                            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                                                postApproval === 'admin_approval' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                                <Icon icon="solar:shield-warning-bold" className="text-blue-600" />
                                                Require Admin Approval
                                            </span>
                                            <span className="text-[11px] text-gray-500 pt-1">
                                                Posts must be reviewed & approved by an admin or moderator before appearing.
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSaveGeneral}
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                                    >
                                        Update Policy
                                    </button>
                                </div>

                                {/* Pending Posts Review Queue */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <Icon icon="solar:clock-circle-bold" className="text-amber-500" />
                                            <span>Pending Posts Queue ({pendingPosts.length})</span>
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={fetchPendingPosts}
                                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <Icon icon="solar:refresh-bold" />
                                            <span>Refresh Queue</span>
                                        </button>
                                    </div>

                                    {loadingPendingPosts ? (
                                        <div className="p-8 text-center text-xs text-gray-400">Loading pending posts...</div>
                                    ) : pendingPosts.length === 0 ? (
                                        <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-2">
                                            <Icon icon="solar:check-circle-bold" width={32} className="text-emerald-500 mx-auto" />
                                            <p className="text-xs font-bold text-gray-700">Queue is Clear!</p>
                                            <p className="text-[11px] text-gray-500">There are no pending posts waiting for approval.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {pendingPosts.map((post) => (
                                                <div key={post._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <HexAvatar image={post.userImage} size="sm" />
                                                            <div>
                                                                <span className="text-xs font-bold text-gray-900 block">{post.userName}</span>
                                                                <span className="text-[10px] text-gray-400">{new Date(post.createdAt).toLocaleString()}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={processingPostId === post._id}
                                                                onClick={() => handlePostModeration('approve_post', post._id)}
                                                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                                                            >
                                                                <Icon icon="solar:check-circle-bold" />
                                                                <span>Approve & Publish</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={processingPostId === post._id}
                                                                onClick={() => handlePostModeration('decline_post', post._id)}
                                                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                                            >
                                                                <Icon icon="solar:close-circle-bold" />
                                                                <span>Decline</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-gray-800 leading-relaxed">{post.content}</p>

                                                    {post.images && post.images.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto py-1">
                                                            {post.images.map((img, i) => (
                                                                <img key={i} src={img} alt="attached" className="h-20 w-28 rounded-lg object-cover" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── 3. MEMBERS & ROLES TAB ── */}
                        {activeTab === 'members' && (
                            <div className="space-y-6">
                                
                                {/* Pending Join Requests */}
                                {pendingMembers.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                                        <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                                            Pending Member Requests ({pendingMembers.length})
                                        </h3>
                                        <div className="divide-y divide-amber-200/60">
                                            {pendingMembers.map((user: any) => (
                                                <div key={user._id} className="py-2.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <HexAvatar image={user.image} size="sm" />
                                                        <span className="text-xs font-bold text-gray-900">{user.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={processingUserId === user._id}
                                                            onClick={() => handleMemberAction('approve_member', user._id)}
                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={processingUserId === user._id}
                                                            onClick={() => handleMemberAction('reject_member', user._id)}
                                                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Member Management Directory */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                            All Members ({allMembers.length})
                                        </h3>
                                        <input
                                            type="text"
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            placeholder="Search member..."
                                            className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        {allMembers
                                            .filter((m: any) => !memberSearch || m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                                            .map((member: any) => {
                                                const isMemCreator = String(group.creatorId?._id || group.creatorId) === String(member._id);
                                                const isMemAdmin = admins.some((a: any) => String(a._id || a) === String(member._id));
                                                const isMemMod = moderators.some((m: any) => String(m._id || m) === String(member._id));

                                                return (
                                                    <div key={member._id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <HexAvatar image={member.image} size="sm" />
                                                            <div>
                                                                <span className="text-xs font-bold text-gray-900 block">{member.name}</span>
                                                                <span className="text-[10px] text-gray-500 font-medium">
                                                                    {isMemCreator ? 'Group Creator' : isMemAdmin ? 'Admin' : isMemMod ? 'Moderator' : 'Member'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {!isMemCreator && (
                                                            <div className="flex items-center gap-1.5">
                                                                {isMemMod ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMemberAction('remove_moderator', member._id)}
                                                                        className="px-2.5 py-1 rounded-lg bg-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-300"
                                                                    >
                                                                        Demote Mod
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMemberAction('make_moderator', member._id)}
                                                                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                                                                    >
                                                                        Make Mod
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMemberAction('ban_user', member._id)}
                                                                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                                                                >
                                                                    Ban
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 4. BANNED & BLOCKED TAB ── */}
                        {activeTab === 'banned' && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                    Banned Users ({bannedUsers.length})
                                </h3>

                                {bannedUsers.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No users are currently banned from this group.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {bannedUsers.map((bUser: any) => (
                                            <div key={bUser._id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <HexAvatar image={bUser.image} size="sm" />
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-900 block">{bUser.name}</span>
                                                        <span className="text-[10px] text-rose-500 font-bold">Banned from group</span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={processingUserId === bUser._id}
                                                    onClick={() => handleMemberAction('unban_user', bUser._id)}
                                                    className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold cursor-pointer"
                                                >
                                                    Unban User
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 5. COMMUNITY RULES TAB ── */}
                        {activeTab === 'rules' && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                    Community Rules Builder
                                </h3>

                                <div className="space-y-2">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs text-gray-800 font-medium truncate">{rule}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                                                className="text-gray-400 hover:text-rose-600 transition"
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newRuleInput}
                                        onChange={(e) => setNewRuleInput(e.target.value)}
                                        placeholder="Add community rule..."
                                        className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newRuleInput.trim()) return;
                                            setRules([...rules, newRuleInput.trim()]);
                                            setNewRuleInput('');
                                        }}
                                        className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-700"
                                    >
                                        Add
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSaveGeneral}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                                >
                                    Save Rules
                                </button>
                            </div>
                        )}

                        {/* ── 6. DANGER ZONE TAB ── */}
                        {activeTab === 'danger' && isCreator && (
                            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 space-y-4">
                                <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                                    <Icon icon="solar:danger-triangle-bold" />
                                    <span>Delete Group Permanently</span>
                                </h3>
                                <p className="text-xs text-rose-700 leading-relaxed">
                                    Once deleted, all group information, member affiliations, and discussion posts associated with this group will be permanently erased. This action cannot be undone.
                                </p>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleDeleteGroup}
                                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                                >
                                    {saving ? 'Deleting...' : 'Delete this Group'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
