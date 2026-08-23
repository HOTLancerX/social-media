'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { io, Socket } from 'socket.io-client';
import { EXPRESS_API, LICENSE_KEY, xFetch } from '@/lib/express';
import { GalleryModal } from '@/components/Gallery';
import HexAvatar from './HexAvatar';
import FacebookEmoji from './FacebookEmoji';

interface ChatFriend {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    level?: number;
    status?: 'online' | 'offline' | 'away';
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
}

interface MessageItem {
    _id: string;
    senderId: string;
    receiverId: string;
    message?: string;
    mediaUrl?: string;
    read?: boolean;
    createdAt: string;
}

interface SocialChatSidebarProps {
    currentUser?: {
        _id: string;
        name: string;
        slug: string;
        image?: string;
    } | null;
}

const FB_REACTIONS = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];
const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '😍', '🥳', '👏', '🎉', '💯', '😮', '😢', '🚀', '⚡'];

// Web Audio API subtle chime sound for sent/received messages
function playChatChime(type: 'send' | 'receive') {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        if (type === 'send') {
            osc.frequency.setValueAtTime(580, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else {
            osc.frequency.setValueAtTime(740, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        }
    } catch {
        // AudioContext autoplay restrictions are handled gracefully
    }
}

export default function SocialChatSidebar({ currentUser }: SocialChatSidebarProps) {
    const currentUserId = currentUser?._id || '';

    const [isExpanded, setIsExpanded] = useState(false);
    const [friends, setFriends] = useState<ChatFriend[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTargetUser, setActiveTargetUser] = useState<ChatFriend | null>(null);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [hoveredFriend, setHoveredFriend] = useState<{ friend: ChatFriend; top: number } | null>(null);
    const [onlineUserMap, setOnlineUserMap] = useState<Record<string, boolean>>({});

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom of message thread
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isPartnerTyping, selectedMediaUrl]);

    // ── 1. Fetch Dynamic Friends & Conversations List ──
    const loadFriendsData = async () => {
        if (!currentUserId) return;
        setLoadingFriends(true);

        try {
            const [friendRes, chatRes] = await Promise.all([
                fetch('/api/social-media/friends?list=friends').then((r) => r.json()).catch(() => null),
                xFetch(`/chat/conversations?userId=${currentUserId}`).then((r) => r.json()).catch(() => null),
            ]);

            const map = new Map<string, ChatFriend>();

            // Add active conversations from express chat
            if (chatRes?.conversations?.length) {
                for (const c of chatRes.conversations) {
                    if (c.user && c.user._id) {
                        const uid = String(c.user._id);
                        let lastMsgText = c.lastMessage?.message || '';
                        if (lastMsgText.startsWith('[reaction:')) {
                            lastMsgText = 'Reacted with ' + lastMsgText.replace('[reaction:', '').replace(']', '');
                        } else if (!lastMsgText && c.lastMessage?.mediaUrl) {
                            lastMsgText = '📷 Photo';
                        } else if (!lastMsgText) {
                            lastMsgText = 'Chat started';
                        }

                        map.set(uid, {
                            _id: uid,
                            name: c.user.name || 'Friend',
                            slug: c.user.slug || uid,
                            image: c.user.image,
                            level: 16,
                            status: 'online',
                            lastMessage: lastMsgText,
                            lastMessageTime: c.lastMessage?.createdAt
                                ? new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'recently',
                            unreadCount: c.unreadCount || 0,
                        });
                    }
                }
            }

            // Add accepted friends from social media plugin
            if (friendRes?.friends?.length) {
                for (const f of friendRes.friends) {
                    const fid = String(f._id);
                    if (!map.has(fid)) {
                        map.set(fid, {
                            _id: fid,
                            name: f.name || 'Friend',
                            slug: f.slug || fid,
                            image: f.image,
                            level: 24,
                            status: f.status === 'online' ? 'online' : 'offline',
                            lastMessage: 'Tap to start chatting',
                            lastMessageTime: '',
                            unreadCount: 0,
                        });
                    }
                }
            }

            const loadedList = Array.from(map.values());
            setFriends(loadedList);
        } catch (err) {
            console.error('Failed to load friends/chat list:', err);
        } finally {
            setLoadingFriends(false);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            loadFriendsData();
        }
    }, [currentUserId]);

    // ── 2. Socket.io Real-Time Integration ──
    useEffect(() => {
        if (!currentUserId) return;

        try {
            const socket: Socket = io(EXPRESS_API, {
                path: '/socket.io/',
                auth: { licenseKey: LICENSE_KEY },
                extraHeaders: { 'x-license-key': LICENSE_KEY },
                reconnectionAttempts: 5,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                socket.emit('register_user', { userId: currentUserId });
                if (activeTargetUser?._id) {
                    socket.emit('check_user_status', { userId: activeTargetUser._id });
                    socket.emit('mark_seen', { senderId: activeTargetUser._id, receiverId: currentUserId });
                }
            });

            // Incoming Message Handler with Sound & Deduping
            socket.on('receive_message', (newMsg: MessageItem) => {
                const isFromOther = String(newMsg.senderId) !== String(currentUserId);
                if (isFromOther) {
                    playChatChime('receive');
                    // If we're actively chatting with this user, mark as seen immediately!
                    if (activeTargetUser && String(newMsg.senderId) === String(activeTargetUser._id)) {
                        socket.emit('mark_seen', { senderId: activeTargetUser._id, receiverId: currentUserId });
                    }
                }

                setMessages((prev) => {
                    if (prev.some((m) => m._id === newMsg._id)) return prev;

                    // Replace matching optimistic temp message
                    const hasTempMatch = prev.some(
                        (m) =>
                            m._id?.startsWith('temp_') &&
                            m.senderId === newMsg.senderId &&
                            (m.message === newMsg.message || m.mediaUrl === newMsg.mediaUrl)
                    );

                    if (hasTempMatch) {
                        return prev.map((m) =>
                            m._id?.startsWith('temp_') &&
                            m.senderId === newMsg.senderId &&
                            (m.message === newMsg.message || m.mediaUrl === newMsg.mediaUrl)
                                ? newMsg
                                : m
                        );
                    }

                    if (
                        activeTargetUser &&
                        (newMsg.senderId === activeTargetUser._id || newMsg.receiverId === activeTargetUser._id)
                    ) {
                        return [...prev, newMsg];
                    }
                    return prev;
                });
                loadFriendsData();
            });

            // Real-time Read Receipts
            socket.on('messages_seen', (data: { seenBy: string }) => {
                if (activeTargetUser && String(data?.seenBy) === String(activeTargetUser._id)) {
                    setMessages((prev) =>
                        prev.map((m) => (String(m.senderId) === String(currentUserId) ? { ...m, read: true } : m))
                    );
                }
            });

            // Real-time Typing Indicators
            socket.on('user_typing', (data: { senderId: string }) => {
                if (activeTargetUser && String(data?.senderId) === String(activeTargetUser._id)) {
                    setIsPartnerTyping(true);
                }
            });

            socket.on('user_stop_typing', (data: { senderId: string }) => {
                if (activeTargetUser && String(data?.senderId) === String(activeTargetUser._id)) {
                    setIsPartnerTyping(false);
                }
            });

            // Real-time Presence
            socket.on('user_status_result', (data: { userId: string; online: boolean }) => {
                if (data?.userId) {
                    setOnlineUserMap((prev) => ({ ...prev, [data.userId]: data.online }));
                }
            });

            socket.on('user_status_change', (data: { userId: string; online: boolean }) => {
                if (data?.userId) {
                    setOnlineUserMap((prev) => ({ ...prev, [data.userId]: data.online }));
                }
            });

            return () => {
                socket.disconnect();
            };
        } catch (err) {
            console.error('Socket init error:', err);
        }
    }, [currentUserId, activeTargetUser?._id]);

    // ── 2b. Resilient Polling Fallback (Works when Socket is disconnected) ──
    useEffect(() => {
        if (!currentUserId) return;

        const interval = setInterval(() => {
            if (!socketRef.current?.connected) {
                loadFriendsData();
                if (activeTargetUser) {
                    xFetch(`/chat/history/${activeTargetUser.slug || activeTargetUser._id}?userId=${currentUserId}`)
                        .then((r) => r.json())
                        .then((data) => {
                            if (data?.messages) {
                                setMessages((prev) => {
                                    if (data.messages.length !== prev.length) return data.messages;
                                    return prev;
                                });
                            }
                        })
                        .catch(() => {});
                }
            }
        }, 6000);

        return () => clearInterval(interval);
    }, [currentUserId, activeTargetUser]);

    // ── 3. Open Chat with Selected Friend ──
    const handleSelectUser = (friend: ChatFriend) => {
        setActiveTargetUser(friend);
        setIsExpanded(true);
        setHoveredFriend(null);
        setLoadingHistory(true);
        setMessages([]);
        setIsPartnerTyping(false);
        setShowReactionPicker(false);
        setShowEmojiPicker(false);

        if (socketRef.current?.connected) {
            socketRef.current.emit('check_user_status', { userId: friend._id });
            socketRef.current.emit('mark_seen', { senderId: friend._id, receiverId: currentUserId });
        }

        // Fetch real chat history from express chat API
        xFetch(`/chat/history/${friend.slug || friend._id}?userId=${currentUserId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data?.messages) {
                    setMessages(data.messages);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    };

    // ── 3b. Global Event Listener (e.g. Profile Page "Message" Button) ──
    useEffect(() => {
        const handleOpenChat = (e: any) => {
            const target = e.detail?.user;
            if (target) {
                handleSelectUser({
                    _id: target._id,
                    name: target.name,
                    slug: target.slug || target._id,
                    image: target.image,
                    status: 'online',
                    level: 24,
                });
            } else {
                setIsExpanded(true);
            }
        };

        window.addEventListener('open_chat_sidebar', handleOpenChat);
        return () => window.removeEventListener('open_chat_sidebar', handleOpenChat);
    }, [currentUserId]);

    // ── 4. Typing Input Change Handler with Debounce ──
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);

        if (socketRef.current?.connected && activeTargetUser && currentUserId) {
            socketRef.current.emit('typing', {
                senderId: currentUserId,
                receiverId: activeTargetUser._id,
            });

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('stop_typing', {
                    senderId: currentUserId,
                    receiverId: activeTargetUser._id,
                });
            }, 1500);
        }
    };

    // ── 5. Send Message Handler (Text, Reaction, or Image) ──
    const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        const text = (customText !== undefined ? customText : inputMessage).trim();
        const mediaUrl = selectedMediaUrl || '';

        if ((!text && !mediaUrl) || !activeTargetUser || !currentUserId) return;

        setInputMessage('');
        setSelectedMediaUrl(null);
        setShowEmojiPicker(false);
        setShowReactionPicker(false);
        playChatChime('send');

        if (socketRef.current?.connected && activeTargetUser) {
            socketRef.current.emit('stop_typing', {
                senderId: currentUserId,
                receiverId: activeTargetUser._id,
            });
        }

        const optimisticMsg: MessageItem = {
            _id: `temp_${Date.now()}`,
            senderId: currentUserId,
            receiverId: activeTargetUser._id,
            message: text,
            mediaUrl: mediaUrl,
            read: false,
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        // Send via Socket if connected, otherwise fallback to REST API
        if (socketRef.current?.connected) {
            socketRef.current.emit('send_message', {
                senderId: currentUserId,
                receiverId: activeTargetUser._id,
                message: text,
                mediaUrl: mediaUrl,
            });
        } else {
            try {
                const res = await xFetch('/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: currentUserId,
                        receiverId: activeTargetUser._id,
                        message: text,
                        mediaUrl: mediaUrl,
                    }),
                });
                const data = await res.json();
                if (data?.message) {
                    setMessages((prev) =>
                        prev.map((m) => (m._id === optimisticMsg._id ? data.message : m))
                    );
                }
                loadFriendsData();
            } catch (err) {
                console.error('Failed to send message:', err);
            }
        }
    };

    // Send Facebook Emoji Reaction (like, love, care, etc.)
    const handleSendReaction = (type: string) => {
        handleSendMessage(undefined, `[reaction:${type}]`);
    };

    const hasInputContent = Boolean(inputMessage.trim() || selectedMediaUrl);

    const filteredFriends = friends.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* ── Fixed Desktop Chat Sidebar Container (Vikinger Style) ── */}
            <aside
                className={`fixed right-0 top-16 bottom-0 z-40 bg-white border-l border-slate-200/90 hidden lg:flex flex-col transition-all duration-300 ease-in-out select-none shadow-[-2px_0_12px_rgba(0,0,0,0.02)] ${
                    isExpanded ? 'w-80 sm:w-88' : 'w-20'
                }`}
            >
                {!isExpanded ? (
                    /* ════════════ 1. COLLAPSED MINI-SIDEBAR (Screenshot 1) ════════════ */
                    <div className="flex flex-col h-full overflow-hidden w-full items-center">
                        {/* Vertical Friends Hexagonal Avatar List */}
                        <div className="w-full flex-1 overflow-y-auto overflow-x-hidden scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center space-y-3 py-4 px-2">
                            {loadingFriends ? (
                                <div className="space-y-3 pt-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                                    ))}
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-6">
                                    <Icon icon="solar:users-group-rounded-linear" width={22} className="text-slate-300 mx-auto" />
                                </div>
                            ) : (
                                friends.map((friend) => {
                                    const isOnline = onlineUserMap[friend._id] ?? (friend.status === 'online');

                                    return (
                                        <button
                                            key={friend._id}
                                            type="button"
                                            onClick={() => handleSelectUser(friend)}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredFriend({ friend, top: rect.top + 8 });
                                            }}
                                            onMouseLeave={() => setHoveredFriend(null)}
                                            className="relative transition-transform transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 focus:outline-none"
                                        >
                                            <HexAvatar
                                                image={friend.image}
                                                name={friend.name}
                                                size="sm"
                                                isOnline={isOnline}
                                                showLiveDot={false}
                                                showStatusOrLevel={true}
                                                level={friend.level || 24}
                                            />

                                            {/* Unread badge dot */}
                                            {friend.unreadCount && friend.unreadCount > 0 ? (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white font-black text-[9px] rounded-full border border-white flex items-center justify-center shadow-xs">
                                                    {friend.unreadCount}
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Fixed Bottom Cyan/Teal Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="w-full h-16 bg-[#00c7d9] hover:bg-[#00b2c4] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-inner group"
                            title="Open Chat Panel"
                        >
                            <Icon
                                icon="solar:hamburger-menu-bold"
                                width={24}
                                className="group-hover:scale-110 transition-transform"
                            />
                        </button>
                    </div>
                ) : !activeTargetUser ? (
                    /* ════════════ 2. EXPANDED CONVERSATION LIST (Screenshot 2) ════════════ */
                    <div className="flex flex-col h-full overflow-hidden w-full animate-in fade-in duration-200">
                        {/* Header Title */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <h3 className="font-black text-slate-900 text-sm tracking-wide uppercase flex items-center gap-2">
                                <Icon icon="solar:chat-round-dots-bold" className="text-indigo-600" width={18} />
                                Active Chats
                            </h3>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
                                {friends.length}
                            </span>
                        </div>

                        {/* Friends / Conversation Items List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
                            {filteredFriends.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400">
                                    No conversations found
                                </div>
                            ) : (
                                filteredFriends.map((friend) => {
                                    const isOnline = onlineUserMap[friend._id] ?? (friend.status === 'online');

                                    return (
                                        <div
                                            key={friend._id}
                                            onClick={() => handleSelectUser(friend)}
                                            className="p-2 rounded-2xl hover:bg-slate-50 transition duration-150 flex items-center gap-3 cursor-pointer group"
                                        >
                                            <HexAvatar
                                                image={friend.image}
                                                name={friend.name}
                                                size="sm"
                                                isOnline={isOnline}
                                                showLiveDot={false}
                                                showStatusOrLevel={true}
                                                level={friend.level || 24}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 truncate transition">
                                                        {friend.name}
                                                    </h4>
                                                    {friend.lastMessageTime && (
                                                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                                            {friend.lastMessageTime}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate font-medium">
                                                    {friend.lastMessage || 'Tap to chat'}
                                                </p>
                                            </div>

                                            {friend.unreadCount && friend.unreadCount > 0 ? (
                                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-full shadow-xs">
                                                    {friend.unreadCount}
                                                </span>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Search Bar Input (Matching Screenshot 2) */}
                        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search Messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-full pl-4 pr-9 py-2.5 border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition outline-none"
                                />
                                <Icon
                                    icon="solar:magnifer-linear"
                                    width={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                            </div>
                        </div>

                        {/* Fixed Bottom Cyan/Teal Bar */}
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="w-full h-16 bg-[#00c7d9] hover:bg-[#00b2c4] text-white font-black text-sm tracking-wide flex items-center justify-center gap-3 transition-colors cursor-pointer shrink-0 shadow-inner"
                        >
                            <Icon icon="solar:hamburger-menu-bold" width={22} />
                            <span>Messages / Chat</span>
                        </button>
                    </div>
                ) : (
                    /* ════════════ 3. ACTIVE CONVERSATION THREAD VIEW (Advanced Messenger) ════════════ */
                    <div className="flex flex-col h-full overflow-hidden w-full animate-in fade-in duration-200">
                        {/* Chat Top Header */}
                        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-white shadow-2xs z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {/* Hexagonal Avatar */}
                                <HexAvatar
                                    image={activeTargetUser.image}
                                    name={activeTargetUser.name}
                                    size="sm"
                                    isOnline={Boolean(onlineUserMap[activeTargetUser._id])}
                                    level={activeTargetUser.level || 24}
                                />

                                <div className="min-w-0">
                                    <h4 className="font-black text-slate-900 text-xs truncate leading-snug">
                                        {activeTargetUser.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-block w-2 h-2 rounded-full ${
                                                onlineUserMap[activeTargetUser._id] ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                            }`}
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            {onlineUserMap[activeTargetUser._id] ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Back Arrow to Conversation List */}
                            <button
                                type="button"
                                onClick={() => setActiveTargetUser(null)}
                                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                                title="Back to messages"
                            >
                                <Icon icon="solar:alt-arrow-left-bold" width={18} />
                            </button>
                        </div>

                        {/* Message Feed Bubbles */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
                            {loadingHistory ? (
                                <div className="py-8 text-center text-xs font-semibold text-slate-400">
                                    Loading conversation...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                                    <Icon icon="solar:chat-line-linear" width={32} className="mx-auto text-slate-300" />
                                    <p className="font-bold text-slate-700">No messages yet</p>
                                    <p className="text-[11px]">Say hi or send a reaction!</p>
                                    <button
                                        type="button"
                                        onClick={() => handleSendMessage(undefined, '👋 Hi there!')}
                                        className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-full text-xs transition"
                                    >
                                        👋 Say Hi
                                    </button>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = String(msg.senderId) === String(currentUserId);
                                    const showTime =
                                        index === 0 ||
                                        new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 10 * 60 * 1000;

                                    const isReaction = msg.message?.startsWith('[reaction:') && msg.message.endsWith(']');
                                    const reactionType = isReaction
                                        ? msg.message?.replace('[reaction:', '').replace(']', '') || 'like'
                                        : null;

                                    return (
                                        <div key={msg._id || index} className="space-y-1">
                                            {/* Time Divider */}
                                            {showTime && (
                                                <div className="text-center my-2">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200/60 text-slate-500 font-medium text-[10px]">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {!isMe && (
                                                    <HexAvatar
                                                        image={activeTargetUser.image}
                                                        name={activeTargetUser.name}
                                                        size="sm"
                                                        isOnline={false}
                                                        showStatusOrLevel={false}
                                                        showLiveDot={false}
                                                        className="w-7 h-7 mb-1"
                                                    />
                                                )}

                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                    {/* Media Attachment Bubble */}
                                                    {msg.mediaUrl && (
                                                        <div
                                                            onClick={() => setLightboxImage(msg.mediaUrl || null)}
                                                            className="mb-1 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:opacity-95 transition border border-slate-200/80 bg-slate-900 max-w-56 max-h-56"
                                                        >
                                                            <img
                                                                src={msg.mediaUrl}
                                                                alt="Attachment"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Animated Facebook Reaction Emoji Bubble */}
                                                    {isReaction && reactionType ? (
                                                        <div className="p-1 transform hover:scale-110 transition-transform animate-in zoom-in-75 duration-200">
                                                            <FacebookEmoji type={reactionType} size="md" />
                                                        </div>
                                                    ) : msg.message ? (
                                                        /* Text Bubble */
                                                        <div
                                                            className={`px-3.5 py-2.5 text-xs leading-relaxed font-semibold ${
                                                                isMe
                                                                    ? 'bg-[#5b52ff] text-white rounded-2xl rounded-tr-xs shadow-md shadow-indigo-600/15'
                                                                    : 'bg-[#f4f5f8] text-slate-800 rounded-2xl rounded-tl-xs shadow-2xs'
                                                            }`}
                                                        >
                                                            {msg.message}
                                                        </div>
                                                    ) : null}

                                                    {/* Delivery & Seen Status Receipts */}
                                                    {isMe && (
                                                        <div className="flex items-center gap-1 mt-0.5 mr-1 text-[10px] text-slate-400 font-medium">
                                                            {msg._id?.startsWith('temp_') ? (
                                                                <Icon icon="solar:clock-circle-linear" width={11} className="text-slate-400" />
                                                            ) : msg.read ? (
                                                                <div className="flex items-center gap-0.5 text-sky-500 font-bold" title="Seen">
                                                                    <span>Seen</span>
                                                                    <Icon icon="solar:check-read-bold" width={13} />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-0.5 text-slate-400" title="Delivered">
                                                                    <Icon icon="solar:check-read-linear" width={13} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Live Partner Typing Indicator Bubble */}
                            {isPartnerTyping && (
                                <div className="flex items-end gap-2 animate-in fade-in duration-200">
                                    <HexAvatar
                                        image={activeTargetUser.image}
                                        name={activeTargetUser.name}
                                        size="sm"
                                        isOnline={false}
                                        showStatusOrLevel={false}
                                        showLiveDot={false}
                                        className="w-7 h-7 mb-1"
                                    />
                                    <div className="bg-slate-100 rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Floating Facebook Reactions Bar (Like, Love, Care, Haha, Wow, Sad, Angry) */}
                        {showReactionPicker && (
                            <div
                                onMouseLeave={() => setShowReactionPicker(false)}
                                className="px-3 py-1.5 bg-white border border-slate-200/90 shadow-2xl rounded-full flex items-center gap-1 mx-3 mb-1 animate-in zoom-in-90 slide-in-from-bottom-2 duration-150 z-20 w-fit"
                            >
                                {FB_REACTIONS.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleSendReaction(type)}
                                        className="p-1 hover:scale-135 transition-transform cursor-pointer rounded-full"
                                        title={type}
                                    >
                                        <FacebookEmoji type={type} size="sm" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick Emoji Bar Popup */}
                        {showEmojiPicker && (
                            <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-in slide-in-from-bottom-2 duration-150">
                                {QUICK_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            setInputMessage((prev) => prev + emoji);
                                        }}
                                        className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer shrink-0"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Media Preview Bar */}
                        {selectedMediaUrl && (
                            <div className="p-2.5 bg-indigo-50/80 border-t border-indigo-100 flex items-center justify-between gap-2 animate-in fade-in">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img
                                        src={selectedMediaUrl}
                                        alt="Preview"
                                        className="w-10 h-10 rounded-xl object-cover border border-indigo-200 shadow-2xs shrink-0"
                                    />
                                    <span className="text-xs text-indigo-900 font-bold truncate">Photo Attached</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMediaUrl(null)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-bold" width={18} />
                                </button>
                            </div>
                        )}

                        {/* Message Composer Bar with Dynamic Like vs Submit Plane Toggle */}
                        <form
                            onSubmit={(e) => handleSendMessage(e)}
                            className="p-2.5 bg-white border-t border-slate-100 shrink-0 flex items-center gap-1.5"
                        >
                            {/* Emoji Toggle Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEmojiPicker(!showEmojiPicker);
                                    setShowReactionPicker(false);
                                }}
                                className={`p-2 rounded-xl transition cursor-pointer ${
                                    showEmojiPicker ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Add Emoji"
                            >
                                <Icon icon="solar:smile-circle-bold" width={20} />
                            </button>

                            {/* Image Attachment Button */}
                            <button
                                type="button"
                                onClick={() => setShowGallery(true)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                                title="Attach Photo"
                            >
                                <Icon icon="solar:camera-bold" width={20} />
                            </button>

                            {/* Text Input */}
                            <div className="relative flex-1 flex items-center">
                                <input
                                    type="text"
                                    placeholder="Write a message..."
                                    value={inputMessage}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 rounded-full pl-3.5 pr-10 py-2.5 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
                                />

                                {/* DYNAMIC SUBMIT BUTTON:
                                    If user is typing or has photo attached -> Blue Send Airplane Button
                                    If input is empty -> Facebook Like Button with hover/click Reaction Popover! */}
                                {hasInputContent ? (
                                    <button
                                        type="submit"
                                        className="absolute right-1.5 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs animate-in zoom-in-75 duration-150"
                                        title="Send message"
                                    >
                                        <Icon icon="solar:plain-bold" width={14} />
                                    </button>
                                ) : (
                                    <div
                                        className="absolute right-1.5"
                                        onMouseEnter={() => setShowReactionPicker(true)}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleSendReaction('like')}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                setShowReactionPicker(!showReactionPicker);
                                            }}
                                            className="w-7 h-7 rounded-full hover:bg-blue-50 text-blue-600 flex items-center justify-center transition cursor-pointer hover:scale-110 animate-in zoom-in-75 duration-150"
                                            title="Send Like (Hover for reactions)"
                                        >
                                            <Icon icon="solar:like-bold" width={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Fixed Bottom Cyan/Teal Bar */}
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTargetUser(null);
                                setIsExpanded(false);
                            }}
                            className="w-full h-16 bg-[#00c7d9] hover:bg-[#00b2c4] text-white font-black text-sm tracking-wide flex items-center justify-center gap-3 transition-colors cursor-pointer shrink-0 shadow-inner"
                        >
                            <Icon icon="solar:hamburger-menu-bold" width={22} />
                            <span>Messages / Chat</span>
                        </button>
                    </div>
                )}
            </aside>

            {/* Lightbox Modal for Photo Attachments */}
            {lightboxImage && (
                <div
                    onClick={() => setLightboxImage(null)}
                    className="fixed inset-0 z-99999 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
                >
                    <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
                        <img src={lightboxImage} alt="Enlarged" className="w-full h-full object-contain" />
                        <button
                            type="button"
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                        >
                            <Icon icon="solar:close-circle-bold" width={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Gallery Media Modal for Photo Attachment Selection */}
            {showGallery && (
                <GalleryModal
                    isOpen={showGallery}
                    onClose={() => setShowGallery(false)}
                    multiple={false}
                    selectedImages={selectedMediaUrl ? [selectedMediaUrl] : []}
                    onSelect={(images) => {
                        const url = Array.isArray(images) ? images[0] : images;
                        if (url) {
                            setSelectedMediaUrl(url);
                        }
                        setShowGallery(false);
                    }}
                />
            )}

            {/* Floating Tooltip on Hover for Mini Avatar (Unclipped Global Tooltip) */}
            {hoveredFriend && !isExpanded && (
                <div
                    className="fixed right-22 z-99999 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-bold rounded-xl shadow-2xl pointer-events-none transition-all duration-150 backdrop-blur-xs flex items-center gap-2 border border-slate-700/50"
                    style={{ top: `${hoveredFriend.top}px` }}
                >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            (onlineUserMap[hoveredFriend.friend._id] ?? (hoveredFriend.friend.status === 'online'))
                                ? 'bg-emerald-400'
                                : 'bg-slate-400'
                        }`}
                    />
                    <span>{hoveredFriend.friend.name}</span>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900/95" />
                </div>
            )}
        </>
    );
}
