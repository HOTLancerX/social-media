'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import QuotePostCard from './QuotePostCard';
import HexAvatar from './HexAvatar';
import type { ISocialPostData, ISharedPostSnapshot } from '../models/SocialMedia';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: ISocialPostData;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
    onPostShared?: (newSharedPost: any) => void;
}

type ShareTab = 'networks' | 'feed' | 'link' | 'embed';

export default function ShareModal({
    isOpen,
    onClose,
    post,
    currentUser,
    onPostShared,
}: ShareModalProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<ShareTab>('networks');
    const [caption, setCaption] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedEmbed, setCopiedEmbed] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const postSlug = post.shortId || post._id;
    const postUrl = `${origin}/#post-${postSlug}`;
    const shareText = `Check out this post by ${post.userName}: "${post.content?.slice(0, 100) || 'Social Post'}"`;

    const socialNetworks = [
        {
            name: 'Facebook',
            icon: 'logos:facebook',
            color: '#1877F2',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
        },
        {
            name: 'X (Twitter)',
            icon: 'logos:twitter',
            color: '#000000',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`,
        },
        {
            name: 'WhatsApp',
            icon: 'logos:whatsapp-icon',
            color: '#25D366',
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`,
        },
        {
            name: 'Telegram',
            icon: 'logos:telegram',
            color: '#229ED9',
            url: `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`,
        },
        {
            name: 'LinkedIn',
            icon: 'logos:linkedin-icon',
            color: '#0A66C2',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
        },
        {
            name: 'Reddit',
            icon: 'logos:reddit-icon',
            color: '#FF4500',
            url: `https://reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(shareText)}`,
        },
        {
            name: 'Pinterest',
            icon: 'logos:pinterest',
            color: '#E60023',
            url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(postUrl)}&media=${encodeURIComponent(post.images?.[0] || '')}&description=${encodeURIComponent(shareText)}`,
        },
        {
            name: 'Email',
            icon: 'solar:letter-bold',
            color: '#4B5563',
            url: `mailto:?subject=${encodeURIComponent(`Shared Post from ${post.userName}`)}&body=${encodeURIComponent(`${shareText}\n\n${postUrl}`)}`,
        },
    ];

    const handleExternalShare = async (platformName: string, url: string) => {
        // Record share event
        fetch('/api/social-media/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: post._id,
                platform: platformName.toLowerCase().replace(/\s+/g, '-'),
            }),
        }).catch(() => {});

        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Post by ${post.userName}`,
                    text: shareText,
                    url: postUrl,
                });
                fetch('/api/social-media/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId: post._id,
                        platform: 'native-share',
                    }),
                }).catch(() => {});
            } catch (err) {
                console.warn('Native share cancelled or failed:', err);
            }
        }
    };

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(postUrl);
        setCopiedLink(true);
        fetch('/api/social-media/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: post._id,
                platform: 'copy-link',
            }),
        }).catch(() => {});
        setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleShareToFeed = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/social-media/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: post._id,
                    platform: 'internal',
                    caption: caption.trim(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.newPost) {
                    onPostShared?.(data.newPost);
                    onClose();
                }
            }
        } catch (err) {
            console.error('Failed to share to feed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const embedCode = `<iframe src="${origin}/api/social-media/embed/${postSlug}" width="100%" height="450" frameborder="0" style="border:none; overflow:hidden; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.08);" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;

    const handleCopyEmbed = async () => {
        await navigator.clipboard.writeText(embedCode);
        setCopiedEmbed(true);
        fetch('/api/social-media/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: post._id,
                platform: 'embed',
            }),
        }).catch(() => {});
        setTimeout(() => setCopiedEmbed(false), 2500);
    };

    const sharedSnapshot: ISharedPostSnapshot = {
        _id: post._id,
        shortId: post.shortId,
        userId: post.userId,
        userName: post.userName,
        userImage: post.userImage,
        userRole: post.userRole,
        type: post.type,
        content: post.content,
        bgStyle: post.bgStyle,
        images: post.images,
        videos: post.videos,
        poll: post.poll,
        createdAt: post.createdAt,
    };

    return createPortal(
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:share-bold" className="text-blue-600" width={22} />
                            <h3 className="font-bold text-gray-800 text-base">Share Post</h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                        >
                            <Icon icon="solar:close-circle-bold" width={24} />
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'networks', label: 'Social Networks', icon: 'solar:global-bold' },
                            { id: 'feed', label: 'Share to My Feed', icon: 'solar:feed-bold' },
                            { id: 'link', label: 'Copy Link & QR', icon: 'solar:link-bold' },
                            { id: 'embed', label: 'Embed Widget', icon: 'solar:code-square-bold' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as ShareTab)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                    activeTab === t.id
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-gray-600 hover:bg-gray-200/70'
                                }`}
                            >
                                <Icon icon={t.icon} width={16} />
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: External Social Networks */}
                    {activeTab === 'networks' && (
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                            <p className="text-xs font-semibold text-gray-500">
                                Share directly to external platforms:
                            </p>

                            <div className="grid grid-cols-4 gap-3">
                                {socialNetworks.map((net) => (
                                    <button
                                        key={net.name}
                                        type="button"
                                        onClick={() => handleExternalShare(net.name, net.url)}
                                        className="p-3 rounded-2xl border border-gray-100 hover:border-gray-300 bg-gray-50/50 hover:bg-white hover:shadow-md transition flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <div className="p-2.5 rounded-full bg-white shadow-xs group-hover:scale-110 transition-transform">
                                            <Icon icon={net.icon} width={26} />
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-700 truncate w-full text-center">
                                            {net.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Native Share Trigger */}
                            {typeof navigator !== 'undefined' && 'share' in navigator && (
                                <button
                                    type="button"
                                    onClick={handleNativeShare}
                                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                                >
                                    <Icon icon="solar:share-bold" width={18} />
                                    <span>Open Native Mobile Share Sheet</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Quote Post / Share to My Feed */}
                    {activeTab === 'feed' && (
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[65vh]">
                            {currentUser?._id ? (
                                <>
                                    <div className="flex items-center gap-2.5">
                                        <HexAvatar
                                            image={currentUser?.image}
                                            name={currentUser?.name}
                                            size="sm"
                                            isOnline={true}
                                            showLiveDot={false}
                                            showStatusOrLevel={false}
                                        />
                                        <span className="text-xs font-bold text-gray-800">
                                            {currentUser?.name || 'My Feed'}
                                        </span>
                                    </div>

                                    <textarea
                                        rows={3}
                                        autoFocus
                                        placeholder="Say something about this post..."
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        className="w-full text-xs text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl p-3 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none resize-none"
                                    />

                                    {/* Embedded Preview */}
                                    <QuotePostCard sharedPost={sharedSnapshot} />

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleShareToFeed}
                                            disabled={submitting}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Icon icon="line-md:loading-twotone-loop" width={16} />
                                                    Sharing...
                                                </>
                                            ) : (
                                                'Share Now'
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                                        <Icon icon="solar:feed-bold" width={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800">Log in to Share</h4>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                        You need an account to reshare and write quote posts on your feed.
                                    </p>
                                    <a
                                        href="/login"
                                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                                    >
                                        <Icon icon="solar:login-2-bold" width={16} />
                                        <span>Log In</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Copy Link & QR Code */}
                    {activeTab === 'link' && (
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh] text-center">
                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200">
                                <input
                                    type="text"
                                    readOnly
                                    value={postUrl}
                                    className="bg-transparent flex-1 text-xs font-semibold text-gray-700 outline-none px-2 truncate"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition shrink-0"
                                >
                                    {copiedLink ? 'Copied!' : 'Copy Link'}
                                </button>
                            </div>

                            {/* QR Code generator */}
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl inline-flex flex-col items-center gap-2 mx-auto">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(postUrl)}`}
                                    alt="QR Code"
                                    className="w-36 h-36 rounded-lg shadow-xs"
                                />
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    Scan with phone camera
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Embed Widget */}
                    {activeTab === 'embed' && (
                        <div className="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
                            <p className="text-xs font-semibold text-gray-500">
                                Copy this HTML snippet to embed this post on any external website or blog:
                            </p>

                            <pre className="p-3 bg-gray-900 text-gray-200 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {embedCode}
                            </pre>

                            <button
                                type="button"
                                onClick={handleCopyEmbed}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                            >
                                <Icon icon="solar:copy-bold" width={18} />
                                {copiedEmbed ? 'Embed Code Copied!' : 'Copy Embed Code'}
                            </button>
                        </div>
                    )}
                </div>
            </div>,
            document.body
        );
}
