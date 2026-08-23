'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import FacebookEmoji from './FacebookEmoji';
import AuthForm from '@/components/Auth';
import AuthAc from '@/components/AuthAc';
import HexAvatar from './HexAvatar';
import SocialChatSidebar from './SocialChatSidebar';
import type { MenuItem } from '@/models/Menu';
import MobileDrawer from '@/components/page/header/MobileDrawer';

interface SocialHeaderProps {
    currentUser?: {
        _id: string;
        name: string;
        slug: string;
        email?: string;
        image?: string;
        type?: string;
    } | null;
    searchQuery?: string;
    onSearchChange?: (val: string) => void;
    settings?: Record<string, any>;
    topItems?: MenuItem[];
    mainItems?: MenuItem[];
    rightItems?: MenuItem[];
    mobileItems?: MenuItem[];
    builderContent?: Record<string, any[]>;
}

export default function SocialHeader({
    currentUser: propUser,
    searchQuery = '',
    onSearchChange,
    settings = {},
    mobileItems = [],
}: SocialHeaderProps) {
    const pathname = usePathname() || '';
    const router = useRouter();
    const { data: session } = useSession();

    // Determine current active user
    const sessionUser = (session?.user as any) || null;
    const user = propUser !== undefined ? propUser : sessionUser;
    const isLoggedIn = Boolean(user?._id || user?.email);

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [userCoverPhoto, setUserCoverPhoto] = useState<string | null>(null);
    const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number } | null>(null);
    const [notifTab, setNotifTab] = useState<'all' | 'requests'>('all');
    const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
    const [mobileMenuDrawer, setMobileMenuDrawer] = useState(false);

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifs, setLoadingNotifs] = useState(false);

    const userDropdownRef = useRef<HTMLDivElement>(null);
    const createDropdownRef = useRef<HTMLDivElement>(null);
    const notifDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications and pending requests
    const fetchNotificationsData = () => {
        if (!isLoggedIn || !user?._id) return;

        setLoadingNotifs(true);
        Promise.all([
            fetch('/api/social-media/notifications').then((r) => r.json()),
            fetch('/api/social-media/friends?list=pending').then((r) => r.json()),
        ])
            .then(([notifRes, friendRes]) => {
                setNotifications(notifRes.notifications || []);
                setUnreadCount(notifRes.unreadCount || 0);
                setPendingRequests(friendRes.pending || []);
            })
            .catch(() => {})
            .finally(() => setLoadingNotifs(false));
    };

    useEffect(() => {
        if (!isLoggedIn || !user?._id) return;
        fetchNotificationsData();

        // Fetch user's cover photo dynamically
        fetch(`/api/social-media/profile?userId=${user._id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res?.info?.cover_photo) {
                    setUserCoverPhoto(res.info.cover_photo);
                }
            })
            .catch(() => {});

        const interval = setInterval(fetchNotificationsData, 20000); // 20s live sync
        const onFocus = () => fetchNotificationsData();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [isLoggedIn, user?._id]);

    // Close popups on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
                setUserDropdownOpen(false);
            }
            if (createDropdownRef.current && !createDropdownRef.current.contains(target)) {
                setCreateDropdownOpen(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const userSlug = user?.slug || 'user';
    const profileUrl = `/${userSlug}`;

    const handleAcceptFriend = async (friendshipId: string) => {
        try {
            await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', friendshipId }),
            });
            fetchNotificationsData();
        } catch (err) {
            console.error('Failed to accept:', err);
        }
    };

    const handleDeclineFriend = async (friendshipId: string) => {
        try {
            await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline', friendshipId }),
            });
            fetchNotificationsData();
        } catch (err) {
            console.error('Failed to decline:', err);
        }
    };

    const handleNotificationClick = async (notif: any) => {
        try {
            if (!notif.isRead) {
                await fetch('/api/social-media/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark_read', notificationId: notif._id }),
                });
                setNotifications((prev) =>
                    prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
                );
                setUnreadCount((c) => Math.max(0, c - 1));
            }
        } catch {}

        setNotificationsOpen(false);

        if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
            router.push(`/${notif.senderSlug}`);
        } else if (notif.postSlug) {
            router.push(`/post/${notif.postSlug}`);
        } else if (notif.targetId) {
            router.push(`/post/${notif.targetId}`);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch('/api/social-media/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_all_read' }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch {}
    };

    // Navigation links for Logged In vs Logged Out users
    const loggedInTabs = [
        { id: 'home', label: 'Website Home', href: '/', icon: 'solar:home-2-bold', active: pathname === '/' },
        { id: 'friends', label: 'Friends', href: `${profileUrl}/friends`, icon: 'solar:users-group-rounded-bold', active: pathname.endsWith('/friends') },
        { id: 'saves', label: 'Saved', href: '/saves', icon: 'solar:bookmark-bold', active: pathname === '/saves' },
        { id: 'photos', label: 'Photos', href: `${profileUrl}/photos`, icon: 'solar:gallery-wide-bold', active: pathname.endsWith('/photos') },
        { id: 'videos', label: 'Videos & Reels', href: `${profileUrl}/videos`, icon: 'solar:videocamera-record-bold', active: pathname.endsWith('/videos') },
    ];

    const loggedOutTabs = [
        { id: 'home', label: 'Website Home', href: '/', icon: 'solar:home-2-bold', active: pathname === '/' },
        { id: 'feeds', label: 'Explore Feeds', href: '/feeds', icon: 'solar:feed-bold', active: pathname === '/feeds' || pathname.startsWith('/post') },
        { id: 'popular', label: 'Trending Posts', href: '/feeds?type=popular', icon: 'solar:fire-bold', active: pathname.includes('type=popular') },
    ];

    const currentTabs = isLoggedIn ? loggedInTabs : loggedOutTabs;
    const totalBadgeCount = unreadCount + pendingRequests.length;

    const renderNotifIcon = (notif: any) => {
        if (notif.type === 'reaction' || notif.type === 'like' || notif.type === 'story_reaction') {
            return <FacebookEmoji type={notif.reactionType || 'like'} size="xxs" />;
        }
        if (notif.type === 'comment' || notif.type === 'reply' || notif.type === 'story_reply') {
            return <Icon icon="solar:chat-round-dots-bold" className="text-emerald-500" width={15} />;
        }
        if (notif.type === 'share') {
            return <Icon icon="solar:share-bold" className="text-indigo-500" width={15} />;
        }
        if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
            return <Icon icon="solar:user-plus-bold" className="text-purple-500" width={15} />;
        }
        return <Icon icon="solar:bell-bold" className="text-indigo-500" width={15} />;
    };

    const sidebarMenuItems = [
        { label: 'Newsfeed', href: '/', icon: 'solar:tv-linear', active: pathname === '/' },
        { label: 'Overview', href: user?.slug ? `/${user.slug}` : '/feeds', icon: 'solar:graph-bold', active: pathname === `/${user?.slug}` },
        { label: 'Groups', href: '/feeds/groups', icon: 'solar:users-group-two-rounded-linear', active: pathname.includes('/groups') },
        { label: 'Members', href: user?.slug ? `/${user.slug}/friends` : '/feeds', icon: 'solar:user-linear', active: pathname.includes('/friends') },
        { label: 'Badges', href: '/badges', icon: 'solar:medal-ribbon-linear', active: pathname === '/badges' },
        { label: 'Quests', href: '/quests', icon: 'solar:star-linear', active: pathname === '/quests' },
        { label: 'Streams', href: '/feeds?type=video', icon: 'solar:play-circle-linear', active: pathname.includes('type=video') },
        { label: 'Events', href: '/events', icon: 'solar:calendar-linear', active: pathname === '/events' },
        { label: 'Forums', href: '/forums', icon: 'solar:chat-round-line-linear', active: pathname === '/forums' },
        { label: 'Marketplace', href: '/shop', icon: 'solar:bag-3-linear', active: pathname === '/shop' || pathname.startsWith('/product') },
    ];

    return (
        <header className="nxlogin sticky top-0 z-50 bg-white/95 border-b border-gray-200/90 shadow-xs select-none">
            <div className="container h-16 flex items-center justify-between gap-2 sm:gap-4">
                {/* ── 1. LEFT: Logo Branding & Search ── */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/feeds" className="flex items-center gap-2.5 group">
                        {settings.logo ? (
                            <img
                                src={settings.logo}
                                alt="Logo"
                                className={settings.header_logo_height ? 'w-auto object-contain' : 'h-9 w-auto object-contain'}
                                style={{
                                    height: settings.header_logo_height ? `${settings.header_logo_height}px` : undefined,
                                }}
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                                <Icon icon="solar:chat-round-line-bold" width={22} />
                            </div>
                        )}
                        <span className="text-base font-black text-gray-900 hidden lg:inline tracking-tight">
                            {settings.siteName || 'SocialHub'}
                        </span>
                    </Link>

                    {/* Universal Live Search Bar */}
                    <div className="relative hidden md:block w-52 lg:w-64">
                        <Icon
                            icon="solar:magnifer-linear"
                            width={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search feeds, @people, #topics..."
                            value={searchQuery}
                            onChange={(e) => (onSearchChange ? onSearchChange(e.target.value) : undefined)}
                            className="w-full bg-gray-100/90 focus:bg-white text-xs font-medium rounded-full pl-9 pr-8 py-2 border border-transparent focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                        />
                        {searchQuery && onSearchChange && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <Icon icon="solar:close-circle-bold" width={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 2. CENTER: Navigation Pills (Facebook Style) ── */}
                <nav className="hidden sm:flex items-center justify-center flex-1 max-w-lg h-full gap-1">
                    {currentTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            title={tab.label}
                            className={`flex-1 h-full flex items-center justify-center relative group transition cursor-pointer ${
                                tab.active
                                    ? 'text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 rounded-xl my-1.5'
                            }`}
                        >
                            <Icon
                                icon={tab.icon}
                                width={24}
                                className={`transition-transform duration-200 ${
                                    tab.active ? 'scale-110' : 'group-hover:scale-105'
                                }`}
                            />
                            {tab.active && (
                                <span className="absolute bottom-0 inset-x-2 h-1 bg-indigo-600 rounded-t-full shadow-xs" />
                            )}
                        </Link>
                    ))}
                </nav>

                {/* ── 3. RIGHT: Logged In vs Logged Out State ── */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {isLoggedIn ? (
                        /* ── LOGGED IN VIEW ── */
                        <>
                            {/* Quick Create Button (+) */}
                            <div className="relative" ref={createDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setCreateDropdownOpen((v) => !v)}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer"
                                    title="Create Post or Story"
                                >
                                    <Icon icon="solar:add-circle-bold" width={20} />
                                </button>

                                {createDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                                            Create
                                        </p>
                                        <Link
                                            href="/feeds"
                                            onClick={() => setCreateDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                        >
                                            <Icon icon="solar:notes-bold" width={18} className="text-indigo-500" />
                                            <span>New Feed Post</span>
                                        </Link>
                                        <Link
                                            href="/feeds"
                                            onClick={() => setCreateDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                        >
                                            <Icon icon="solar:camera-bold" width={18} className="text-amber-500" />
                                            <span>24h Ephemeral Story</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Notifications & Friend Requests Bell */}
                            <div className="relative" ref={notifDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNotificationsOpen((v) => !v);
                                        if (!notificationsOpen) fetchNotificationsData();
                                    }}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer relative"
                                    title="Notifications & Friend Requests"
                                >
                                    <Icon icon="solar:bell-bold" width={20} />
                                    {totalBadgeCount > 0 && (
                                        <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono ring-2 ring-white animate-pulse">
                                            {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                                        </span>
                                    )}
                                </button>

                                {notificationsOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 space-y-3 animate-in fade-in max-h-[85vh] flex flex-col">
                                        {/* Header with Switcher */}
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNotifTab('all')}
                                                    className={`text-xs font-black transition ${
                                                        notifTab === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    Notifications ({unreadCount})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNotifTab('requests')}
                                                    className={`text-xs font-black transition ${
                                                        notifTab === 'requests' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    Requests ({pendingRequests.length})
                                                </button>
                                            </div>

                                            {unreadCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllRead}
                                                    className="text-[11px] font-bold text-gray-500 hover:text-indigo-600 transition cursor-pointer"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        {/* Content List */}
                                        <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                                            {notifTab === 'all' ? (
                                                notifications.length > 0 ? (
                                                    notifications.map((notif) => (
                                                        <div
                                                            key={notif._id}
                                                            onClick={() => handleNotificationClick(notif)}
                                                            className={`p-3 rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                                                                notif.isRead ? 'hover:bg-gray-50' : 'bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50'
                                                            }`}
                                                        >
                                                            <div className="relative shrink-0">
                                                                {notif.senderImage ? (
                                                                    <img
                                                                        src={notif.senderImage}
                                                                        alt={notif.senderName}
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                                                        {notif.senderName?.charAt(0)?.toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center">
                                                                    {renderNotifIcon(notif)}
                                                                </div>
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs text-gray-800 leading-snug">
                                                                    <strong className="text-gray-900 font-bold">{notif.senderName}</strong>{' '}
                                                                    {notif.content || 'interacted with your post'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>

                                                            {!notif.isRead && (
                                                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-2" />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-400 text-center py-6">No notifications yet</p>
                                                )
                                            ) : pendingRequests.length > 0 ? (
                                                pendingRequests.map((item) => (
                                                    <div
                                                        key={item.friendshipId}
                                                        className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between gap-2"
                                                    >
                                                        <Link
                                                            href={`/${item.user.slug}`}
                                                            onClick={() => setNotificationsOpen(false)}
                                                            className="flex items-center gap-2.5 min-w-0"
                                                        >
                                                            {item.user.image ? (
                                                                <img
                                                                    src={item.user.image}
                                                                    alt={item.user.name}
                                                                    className="w-10 h-10 rounded-full object-cover shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                                    {item.user.name?.charAt(0)?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                                    {item.user.name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400">@{item.user.slug}</p>
                                                            </div>
                                                        </Link>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAcceptFriend(item.friendshipId)}
                                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeclineFriend(item.friendshipId)}
                                                                className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-rose-100 hover:text-rose-600 cursor-pointer"
                                                            >
                                                                Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-400 text-center py-6">No pending friend requests</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Avatar + Profile Dropdown Menu */}
                            <div className="relative" ref={userDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserDropdownOpen((v) => !v)}
                                    className="flex items-center gap-2 p-0.5 rounded-full hover:bg-gray-100 transition cursor-pointer group"
                                >
                                    <HexAvatar
                                        image={user.image}
                                        name={user.name}
                                        size="sm"
                                        isOnline={true}
                                        showLiveDot={false}
                                        showStatusOrLevel={false}
                                    />
                                </button>

                                {userDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in">
                                        {/* User Header Profile Link Card */}
                                        <Link
                                            href={profileUrl}
                                            onClick={() => setUserDropdownOpen(false)}
                                            className="p-4 bg-linear-to-r from-indigo-50/80 to-purple-50/80 flex items-center gap-3.5 hover:from-indigo-100 hover:to-purple-100 transition border-b border-gray-100"
                                        >
                                            <HexAvatar
                                                image={user.image}
                                                name={user.name}
                                                size="md"
                                                isOnline={true}
                                                showLiveDot={true}
                                                showStatusOrLevel={false}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 truncate">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-indigo-600 font-bold">
                                                    View your profile
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate">
                                                    @{userSlug}
                                                </p>
                                            </div>
                                        </Link>

                                        {/* Profile Navigation Links */}
                                        <div className="p-2 space-y-1">
                                            <Link
                                                href={profileUrl}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:user-id-bold" width={18} className="text-indigo-600" />
                                                <span>My Timeline</span>
                                            </Link>

                                            <Link
                                                href={`${profileUrl}/about`}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:notes-bold" width={18} className="text-blue-500" />
                                                <span>About & Details</span>
                                            </Link>

                                            <Link
                                                href={`${profileUrl}/friends`}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:users-group-rounded-bold" width={18} className="text-emerald-500" />
                                                <span>Friends List</span>
                                            </Link>

                                            <Link
                                                href={`${profileUrl}/photos`}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:gallery-wide-bold" width={18} className="text-rose-500" />
                                                <span>Photos Gallery</span>
                                            </Link>

                                            <Link
                                                href={`${profileUrl}/videos`}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:videocamera-record-bold" width={18} className="text-purple-500" />
                                                <span>Videos & Reels</span>
                                            </Link>

                                            <Link
                                                href={`${profileUrl}/settings`}
                                                onClick={() => setUserDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <Icon icon="solar:settings-bold" width={18} className="text-gray-500" />
                                                <span>Profile Settings</span>
                                            </Link>

                                            {user.type === 'admin' && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-violet-700 hover:bg-violet-50 transition"
                                                >
                                                    <Icon icon="solar:shield-bold" width={18} className="text-violet-600" />
                                                    <span>Admin Panel</span>
                                                </Link>
                                            )}
                                        </div>

                                        {/* Sign Out Button */}
                                        <div className="p-2 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setUserDropdownOpen(false);
                                                    await signOut({ redirect: false });
                                                    router.replace('/');
                                                }}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            >
                                                <Icon icon="solar:logout-bold" width={18} />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── LOGGED OUT (GUEST) VIEW ── */
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setAuthModal('login')}
                                className="px-4 py-2 text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Sign In
                            </button>

                            <button
                                type="button"
                                onClick={() => setAuthModal('signup')}
                                className="px-4 py-2 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                            >
                                Create Account
                            </button>
                        </div>
                    )}

                    {mobileItems.length > 0 && (
                        <MobileDrawer items={mobileItems} settings={settings} iconColor="#374151" />
                    )}
                </div>
            </div>

            {/* Auth Modal Overlay */}
            {authModal && (
                <div
                    className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setAuthModal(null)}
                >
                    <div
                        className="w-full max-w-md relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setAuthModal(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                            <Icon icon="solar:close-circle-bold" width={24} />
                        </button>

                        <AuthForm mode={authModal} />
                    </div>
                </div>
            )}

            {/* Permanent Desktop Expandable Fixed Sidebar (Matching Screenshots 1 & 2) */}
            <aside
                className={`fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-slate-200/90 hidden lg:flex flex-col transition-all duration-300 ease-in-out select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)] ${
                    sidebarExpanded ? 'w-72 sm:w-80' : 'w-20'
                }`}
            >
                {!sidebarExpanded ? (
                    /* ── 1. COLLAPSED VIEW (Screenshot 1) ── */
                    <div className="flex flex-col h-full overflow-hidden w-full items-center">
                        {/* Hexagonal Mini Avatar at Top */}
                        <div className="pt-3.5 pb-2 px-2 flex justify-center shrink-0">
                            <Link
                                href={user?.slug ? `/${user.slug}` : '/feeds'}
                                title={user?.name || 'Profile'}
                                className="block transition-transform hover:scale-105 active:scale-95"
                            >
                                <HexAvatar
                                    image={user?.image}
                                    name={user?.name}
                                    size="md"
                                    isOnline={isLoggedIn}
                                    level={24}
                                />
                            </Link>
                        </div>

                        {/* Vertical Icon List with Floating Tooltips (No Scrollbar) */}
                        <div className="w-full flex-1 overflow-y-auto overflow-x-hidden scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center space-y-1 py-1 px-2">
                            {sidebarMenuItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredTooltip({ label: item.label, top: rect.top + rect.height / 2 - 14 });
                                    }}
                                    onMouseLeave={() => setHoveredTooltip(null)}
                                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${
                                        item.active
                                            ? 'bg-indigo-50 text-indigo-600 shadow-2xs ring-1 ring-indigo-200/70'
                                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/80'
                                    }`}
                                >
                                    <Icon
                                        icon={item.icon}
                                        width={21}
                                        className={`transition-transform duration-200 ${
                                            item.active ? 'scale-105 text-indigo-600' : 'hover:scale-105'
                                        }`}
                                    />
                                </Link>
                            ))}
                        </div>

                        {/* Fixed Bottom Open/Expand Button */}
                        <div className="py-2.5 px-2 w-full flex justify-center mt-auto shrink-0 bg-white border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setHoveredTooltip(null);
                                    setSidebarExpanded(true);
                                }}
                                onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredTooltip({ label: 'Expand Sidebar', top: rect.top + rect.height / 2 - 14 });
                                }}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                className="w-11 h-11 rounded-xl bg-slate-100/90 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs"
                                title="Expand Sidebar"
                                aria-label="Expand Sidebar"
                            >
                                <Icon
                                    icon="solar:alt-arrow-right-bold"
                                    width={18}
                                    className="transition-transform"
                                />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── 2. EXPANDED VIEW (Screenshot 2) ── */
                    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-200">
                        {/* Top Dynamic Cover Banner */}
                        <div className="relative h-28 bg-slate-900 overflow-hidden shrink-0">
                            {userCoverPhoto ? (
                                <img
                                    src={userCoverPhoto}
                                    alt="Cover"
                                    className="w-full h-full object-cover opacity-95"
                                />
                            ) : (
                                <div className="w-full h-full bg-linear-to-r from-blue-600 via-indigo-600 to-purple-700 relative">
                                    <img
                                        src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80"
                                        alt="Cover Illustration"
                                        className="w-full h-full object-cover mix-blend-overlay opacity-60"
                                    />
                                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[12px_12px]" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-black/30" />

                            {/* Collapse Button in Cover Corner */}
                            <button
                                type="button"
                                onClick={() => setSidebarExpanded(false)}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-md shadow-lg border border-white/20 active:scale-90 z-20"
                                title="Collapse Sidebar"
                            >
                                <Icon icon="solar:alt-arrow-left-bold" width={18} />
                            </button>
                        </div>

                        {/* Hexagonal Avatar Profile Header */}
                        <div className="px-5 pt-0 pb-3 text-center border-b border-slate-100 shrink-0">
                            <div className="flex justify-center -mt-10 mb-2">
                                <HexAvatar
                                    image={user?.image}
                                    name={user?.name}
                                    size="xl"
                                    isOnline={isLoggedIn}
                                    level={24}
                                />
                            </div>

                            {isLoggedIn ? (
                                <>
                                    <h3 className="font-black text-slate-900 text-sm leading-snug truncate">
                                        {user?.name || 'Community Member'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                        {user?.slug ? `@${user.slug}` : user?.email || 'MEMBER'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-black text-slate-900 text-sm leading-snug">
                                        Welcome, Guest
                                    </h3>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal('login')}
                                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                                        >
                                            Sign In
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAuthModal('signup')}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                        >
                                            Join Now
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Menu Item List with Labels (Matching Screenshot 2) */}
                        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
                            {sidebarMenuItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 group ${
                                        item.active
                                            ? 'bg-indigo-50 text-indigo-600 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon
                                        icon={item.icon}
                                        width={20}
                                        className={`transition-colors duration-200 ${
                                            item.active
                                                ? 'text-indigo-600'
                                                : 'text-slate-400 group-hover:text-indigo-600'
                                        }`}
                                    />
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {item.active && (
                                        <span className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                    )}
                                </Link>
                            ))}
                        </div>

                        {/* Fixed Bottom Collapse Action */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSidebarExpanded(false)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold border border-slate-200/80 transition shadow-2xs cursor-pointer"
                            >
                                <Icon icon="solar:alt-arrow-left-bold" width={16} />
                                <span>Collapse Sidebar</span>
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Global Floating Tooltip for Mini Sidebar (Never Clipped by Overflow) */}
            {hoveredTooltip && !sidebarExpanded && (
                <div
                    className="fixed left-22 z-99999 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-bold rounded-xl shadow-2xl pointer-events-none transition-all duration-150 backdrop-blur-xs flex items-center border border-slate-700/50"
                    style={{ top: `${hoveredTooltip.top}px` }}
                >
                    <span>{hoveredTooltip.label}</span>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95" />
                </div>
            )}

            {/* Right Chat Sidebar (Vikinger Style, Logged-in Only) */}
            {isLoggedIn && <SocialChatSidebar currentUser={user} />}

            {/* ── 4. Mobile Fixed Bottom Footer Navigation Bar (Visible ONLY on Mobile: lg:hidden) ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden select-none">
                <div className="flex items-center justify-around h-14 px-1 sm:px-2">
                    {/* Primary top 4 items from sidebarMenuItems */}
                    {sidebarMenuItems.slice(0, 4).map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-all ${
                                item.active
                                    ? 'text-indigo-600 font-bold'
                                    : 'text-slate-500 hover:text-slate-900 font-medium'
                            }`}
                        >
                            <div className={`p-1 rounded-xl transition-all ${item.active ? 'bg-indigo-50 shadow-2xs' : ''}`}>
                                <Icon icon={item.icon} width={20} className={item.active ? 'scale-110' : ''} />
                            </div>
                            <span className="text-[10px] leading-none truncate max-w-[62px]">{item.label}</span>
                        </Link>
                    ))}

                    {/* 5th Action: "More" Menu Toggle Button that opens the drawer */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuDrawer(!mobileMenuDrawer)}
                        className={`flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-all cursor-pointer ${
                            mobileMenuDrawer || sidebarMenuItems.slice(4).some((i) => i.active)
                                ? 'text-indigo-600 font-bold'
                                : 'text-slate-500 hover:text-slate-900 font-medium'
                        }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${mobileMenuDrawer || sidebarMenuItems.slice(4).some((i) => i.active) ? 'bg-indigo-50 shadow-2xs' : ''}`}>
                            <Icon
                                icon={mobileMenuDrawer ? 'solar:close-circle-bold' : 'solar:widget-add-linear'}
                                width={20}
                            />
                        </div>
                        <span className="text-[10px] leading-none">More</span>
                    </button>
                </div>
            </nav>

            {/* ── 5. Mobile Menu Full Bottom Sheet Drawer ── */}
            {mobileMenuDrawer && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileMenuDrawer(false)}
                >
                    <div
                        className="bg-white rounded-t-3xl p-5 max-h-[82vh] overflow-y-auto space-y-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-250 pb-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <Icon icon="solar:widget-bold" className="text-indigo-600" width={18} />
                                Menu & Navigation
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMobileMenuDrawer(false)}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
                            >
                                <Icon icon="solar:close-circle-bold" width={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {sidebarMenuItems.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileMenuDrawer(false)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all ${
                                        item.active
                                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-xl ${item.active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 shadow-2xs'}`}>
                                        <Icon icon={item.icon} width={18} />
                                    </div>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
