'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import TextPost from './Text';
import TextBgPost from './Text-BG';
import ImagePost from './Image';
import VideoPost from './Video';
import PollPost from './Poll';
import QuotePostCard from './QuotePostCard';
import ShareModal from './ShareModal';
import ReactionPicker, { REACTION_CONFIGS } from './ReactionPicker';
import ReactionSummary from './ReactionSummary';
import FacebookEmoji from './FacebookEmoji';
import CommentSection from './CommentSection';
import EditPostModal from './EditPostModal';
import HexAvatar from './HexAvatar';
import type { ISocialPostData, ILinkPreview } from '../models/SocialMedia';
import type { ReactionType } from '../models/Like';

interface PostCardProps {
    post: ISocialPostData;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
    onPostDeleted?: (postId: string) => void;
    onPostUpdated?: (updatedPost: any) => void;
    onOpenVideoModal?: (post: ISocialPostData) => void;
}

export default function PostCard({
    post,
    currentUser,
    onPostDeleted,
    onPostUpdated,
    onOpenVideoModal,
}: PostCardProps) {
    const isAuthor = Boolean(currentUser?._id && String(currentUser._id) === String(post.userId));
    const isAdmin = currentUser?.type === 'admin';

    const [currentPost, setCurrentPost] = useState(post);
    const [linkPreviewData, setLinkPreviewData] = useState<ILinkPreview | null>(post.linkPreview || null);

    // Auto-resolve link preview if not present on post but URL is in content
    useEffect(() => {
        if (currentPost.linkPreview && currentPost.linkPreview.url) {
            setLinkPreviewData(currentPost.linkPreview);
            return;
        }

        if (
            currentPost.type === 'text' &&
            currentPost.content &&
            (!currentPost.images || currentPost.images.length === 0) &&
            (!currentPost.videos || currentPost.videos.length === 0)
        ) {
            const urlMatch = currentPost.content.match(/https?:\/\/[^\s]+/i);
            if (urlMatch && urlMatch[0]) {
                const detectedUrl = urlMatch[0].trim();
                fetch('/api/social-media/scrape-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: detectedUrl }),
                })
                    .then((r) => r.json())
                    .then((res) => {
                        if (res.preview) {
                            setLinkPreviewData(res.preview);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [currentPost.linkPreview, currentPost.content, currentPost.type, currentPost.images, currentPost.videos]);

    const [userReaction, setUserReaction] = useState<ReactionType | null>(
        (post.userReaction as ReactionType) || null
    );
    const [reactionsCount, setReactionsCount] = useState(post.reactionsCount);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
    const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);

    const [showComments, setShowComments] = useState(false);
    const [isHoveringLike, setIsHoveringLike] = useState(false);
    const likeHoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleLikeMouseEnter = () => {
        if (likeHoverTimerRef.current) {
            clearTimeout(likeHoverTimerRef.current);
            likeHoverTimerRef.current = null;
        }
        setIsHoveringLike(true);
    };

    const handleLikeMouseLeave = () => {
        if (likeHoverTimerRef.current) {
            clearTimeout(likeHoverTimerRef.current);
        }
        likeHoverTimerRef.current = setTimeout(() => {
            setIsHoveringLike(false);
        }, 350);
    };

    const [showMenu, setShowMenu] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSaved, setIsSaved] = useState<boolean>(Boolean((post as any).isSaved));
    const [saving, setSaving] = useState(false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends' | 'loading'>(
        isAuthor ? 'friends' : 'none'
    );

    useEffect(() => {
        if (!currentUser?._id || isAuthor || !currentPost.userId) return;
        fetch(`/api/social-media/friends?targetUserId=${currentPost.userId}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.status) setFriendStatus(res.status);
            })
            .catch(() => {});
    }, [currentUser?._id, isAuthor, currentPost.userId]);

    const handleAddFriend = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        try {
            const action = friendStatus === 'pending_received' ? 'accept' : 'send';
            const res = await fetch('/api/social-media/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    targetUserId: currentPost.userId,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status) setFriendStatus(data.status);
            }
        } catch (err) {
            console.error('Failed to add friend:', err);
        }
    };

    useEffect(() => {
        if ((post as any).isSaved !== undefined) {
            setIsSaved(Boolean((post as any).isSaved));
            return;
        }
        if (!currentUser?._id) return;
        fetch(`/api/social-media/save?postId=${currentPost._id}`)
            .then((r) => r.json())
            .then((res) => {
                if (res.isSaved !== undefined) {
                    setIsSaved(Boolean(res.isSaved));
                }
            })
            .catch(() => {});
    }, [currentPost._id, currentUser]);

    const handleToggleSave = async () => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        if (saving) return;
        const prevSaved = isSaved;
        setIsSaved(!prevSaved);
        setSaving(true);
        try {
            const res = await fetch('/api/social-media/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: currentPost._id,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsSaved(Boolean(data.isSaved));
            } else {
                setIsSaved(prevSaved);
            }
        } catch {
            setIsSaved(prevSaved);
        } finally {
            setSaving(false);
        }
    };

    const handleReaction = async (reaction: ReactionType) => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        // Optimistic UI updates
        const prevReaction = userReaction;
        const prevCount = { ...reactionsCount };
        let prevLikes = likesCount;

        // Toggle or set
        if (prevReaction === reaction) {
            setUserReaction(null);
            setLikesCount(Math.max(0, prevLikes - 1));
            setReactionsCount({
                ...prevCount,
                [reaction]: Math.max(0, (prevCount[reaction] || 1) - 1),
            });
        } else {
            setUserReaction(reaction);
            const newCount = { ...prevCount };
            if (prevReaction) {
                newCount[prevReaction] = Math.max(0, (newCount[prevReaction] || 1) - 1);
            } else {
                prevLikes += 1;
            }
            newCount[reaction] = (newCount[reaction] || 0) + 1;
            setLikesCount(prevLikes);
            setReactionsCount(newCount);
        }

        try {
            const res = await fetch('/api/social-media/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType: 'post',
                    targetId: currentPost._id,
                    reaction,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setUserReaction(data.userReaction);
                setLikesCount(data.likesCount);
                setReactionsCount(data.reactionsCount);
            } else {
                // Revert
                setUserReaction(prevReaction);
                setLikesCount(prevLikes);
                setReactionsCount(prevCount);
            }
        } catch (err) {
            console.error('Reaction failed:', err);
            setUserReaction(prevReaction);
            setLikesCount(prevLikes);
            setReactionsCount(prevCount);
        } finally {
            setIsHoveringLike(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const res = await fetch(`/api/social-media/${currentPost._id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                onPostDeleted?.(String(currentPost._id));
            }
        } catch (err) {
            console.error('Failed to delete post:', err);
        }
    };

    const handleCopyLink = () => {
        const postSlug = currentPost.shortId || currentPost._id;
        const url = `${window.location.origin}/#post-${postSlug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        setShowMenu(false);
    };

    const reactionConfig = userReaction ? REACTION_CONFIGS[userReaction] : null;

    const formatTimeAgo = (dateStr: any) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <>
            <article
                id={`post-${currentPost.shortId || currentPost._id}`}
                className="bg-white rounded border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-all duration-300 overflow-visible"
            >
                {/* 1. Header Row */}
                <div className="p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* User Avatar */}
                        <Link href={`/${currentPost.userSlug || currentPost.userName}`} className="shrink-0 group block transition-transform hover:scale-105">
                            <HexAvatar
                                image={currentPost.userImage}
                                name={currentPost.userName}
                                size="sm"
                                isOnline={true}
                                showLiveDot={false}
                                showStatusOrLevel={false}
                            />
                        </Link>

                        <div className="min-w-0">
                            {/* Name + Feeling + Add Friend button */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                    href={`/${currentPost.userSlug || currentPost.userName}`}
                                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition cursor-pointer truncate"
                                >
                                    {currentPost.userName}
                                </Link>

                                

                                {currentPost.feeling && (
                                    <span className="text-xs text-slate-500 font-normal">
                                        is {currentPost.feeling.emoji} {currentPost.feeling.text}
                                    </span>
                                )}

                                {/* Add Friend Button: Shown only if not author and not already friends */}
                                {!isAuthor && friendStatus !== 'friends' && (
                                    <button
                                        type="button"
                                        onClick={handleAddFriend}
                                        className={`ml-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                                            friendStatus === 'pending_sent'
                                                ? 'bg-gray-100 text-gray-600'
                                                : friendStatus === 'pending_received'
                                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                                        }`}
                                        title={friendStatus === 'pending_sent' ? 'Request pending' : 'Add as friend'}
                                    >
                                        <Icon
                                            icon={
                                                friendStatus === 'pending_sent'
                                                    ? 'solar:check-circle-bold'
                                                    : friendStatus === 'pending_received'
                                                    ? 'solar:user-check-bold'
                                                    : 'solar:user-plus-bold'
                                            }
                                            width={13}
                                        />
                                        <span>
                                            {friendStatus === 'pending_sent'
                                                ? 'Requested'
                                                : friendStatus === 'pending_received'
                                                ? 'Confirm'
                                                : 'Add Friend'}
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Subtitle: Time + Privacy + Short ID */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5 flex-wrap">
                                <span>{formatTimeAgo(currentPost.createdAt)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5" title={currentPost.privacy}>
                                    {currentPost.privacy === 'public' && (
                                        <Icon icon="solar:global-bold" width={12} />
                                    )}
                                    {currentPost.privacy === 'members' && (
                                        <Icon icon="solar:users-group-rounded-bold" width={12} />
                                    )}
                                    {currentPost.privacy === 'private' && (
                                        <Icon icon="solar:lock-bold" width={12} />
                                    )}
                                </span>
                                {currentPost.shortId && (
                                    <>
                                        <span>•</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            #{currentPost.shortId}
                                        </span>
                                    </>
                                )}
                                {currentPost.location && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-0.5 truncate">
                                            <Icon icon="solar:map-point-bold" width={12} />
                                            {currentPost.location}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Save Bookmark and Post Options Dropdown */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleToggleSave}
                            title={isSaved ? "Unsave post" : "Save post"}
                            className={`p-2 rounded-full transition cursor-pointer ${
                                isSaved
                                    ? "text-amber-500 hover:bg-amber-50"
                                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            <Icon icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-linear"} width={19} />
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                            >
                                <Icon icon="solar:menu-dots-bold" width={20} />
                            </button>

                            {showMenu && (
                                <div
                                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95"
                                    onClick={() => setShowMenu(false)}
                                >
                                    <button
                                        type="button"
                                        onClick={handleToggleSave}
                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Icon
                                            icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-linear"}
                                            width={16}
                                            className={isSaved ? "text-amber-500" : ""}
                                        />
                                        <span>{isSaved ? "Unsave Post" : "Save Post"}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Icon icon="solar:link-bold" width={16} />
                                        {copied ? 'Link Copied!' : 'Copy Link'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowShareModal(true)}
                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Icon icon="solar:share-bold" width={16} />
                                        Share Post Options
                                    </button>

                                {(isAuthor || isAdmin) && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditModal(true)}
                                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Icon icon="solar:pen-new-square-bold" width={16} />
                                            Edit Post
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                            Delete Post
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Post Content Body */}
                <div>
                    {/* A. Text Post */}
                    {currentPost.type === 'text' && currentPost.content && (
                        <div className="px-4 pb-3">
                            <TextPost content={currentPost.content} />
                        </div>
                    )}

                    {/* B. Text With Colorful Background */}
                    {currentPost.type === 'text-bg' && (
                        <TextBgPost content={currentPost.content} bgStyle={currentPost.bgStyle} />
                    )}

                    {/* C. Image Post */}
                    {currentPost.type === 'image' && (
                        <div className="space-y-3">
                            {currentPost.content && (
                                <div className="px-4">
                                    <TextPost content={currentPost.content} />
                                </div>
                            )}
                            <ImagePost images={currentPost.images} />
                        </div>
                    )}

                    {/* D. Video Post */}
                    {currentPost.type === 'video' && (
                        <div className="space-y-3">
                            {currentPost.content && (
                                <div className="px-4">
                                    <TextPost content={currentPost.content} />
                                </div>
                            )}
                            <VideoPost
                                src={currentPost.videos[0]}
                                title={currentPost.content?.slice(0, 60) || 'Featured Video'}
                                onOpenReel={() => onOpenVideoModal?.(currentPost)}
                            />
                        </div>
                    )}

                    {/* E. Poll Post */}
                    {currentPost.type === 'poll' && currentPost.poll && (
                        <div className="px-4 pb-2">
                            {currentPost.content && (
                                <div className="mb-3">
                                    <TextPost content={currentPost.content} />
                                </div>
                            )}
                            <PollPost
                                postId={String(currentPost._id)}
                                poll={currentPost.poll}
                                currentUserId={currentUser?._id}
                                onVoteUpdated={(updatedPoll) =>
                                    setCurrentPost((prev) => ({ ...prev, poll: updatedPoll }))
                                }
                            />
                        </div>
                    )}

                    {/* F. Quote-Post / Reshared Embedded Post Preview */}
                    {currentPost.sharedPost && (
                        <div className="px-4 pb-3">
                            <QuotePostCard sharedPost={currentPost.sharedPost} />
                        </div>
                    )}

                    {/* G. Rich Link / Product Preview Card */}
                    {linkPreviewData && linkPreviewData.url && (
                        <div className="px-4 pb-3">
                            <a
                                href={linkPreviewData.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-2xl overflow-hidden border border-gray-200/80 bg-gray-50/60 hover:bg-gray-100/80 hover:border-blue-300 transition-all duration-300 group shadow-2xs"
                            >
                                {linkPreviewData.image && (
                                    <div className="w-full aspect-2/1 sm:aspect-[2.4/1] overflow-hidden bg-slate-900 relative">
                                        <img
                                            src={linkPreviewData.image}
                                            alt={linkPreviewData.title || 'Link preview'}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                        {linkPreviewData.price && (
                                            <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-600/95 text-white font-black text-xs rounded-full shadow-lg backdrop-blur-xs flex items-center gap-1 border border-white/20">
                                                <Icon icon="solar:tag-price-bold" width={14} />
                                                <span>
                                                    {linkPreviewData.currency ? `${linkPreviewData.currency} ` : ''}
                                                    {linkPreviewData.price}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="p-3.5 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                                            {linkPreviewData.favicon && (
                                                <img
                                                    src={linkPreviewData.favicon}
                                                    alt=""
                                                    className="w-3.5 h-3.5 rounded-xs shrink-0"
                                                />
                                            )}
                                            <span>
                                                {linkPreviewData.siteName ||
                                                    (() => {
                                                        try {
                                                            return new URL(linkPreviewData.url).hostname.replace(/^www\./i, '');
                                                        } catch {
                                                            return linkPreviewData.url;
                                                        }
                                                    })()}
                                            </span>
                                        </span>
                                        <Icon icon="solar:arrow-right-up-linear" width={14} className="text-gray-400 group-hover:text-blue-600 transition shrink-0" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                                        {linkPreviewData.title || linkPreviewData.url}
                                    </h4>
                                    {linkPreviewData.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                            {linkPreviewData.description}
                                        </p>
                                    )}
                                </div>
                            </a>
                        </div>
                    )}

                    {/* G. Hashtags Pills (Matches Screenshot) */}
                    {currentPost.tags && currentPost.tags.length > 0 && (
                        <div className="px-4 pt-2.5 flex items-center gap-1.5 flex-wrap">
                            {currentPost.tags.map((tag, idx) => (
                                <a
                                    key={idx}
                                    href={`/?tag=${encodeURIComponent(tag.replace(/^#/, ''))}`}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-600 transition"
                                >
                                    #{tag.replace(/^#/, '')}
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Stats & Summary Bar */}
                <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between border-t border-slate-100/90 text-xs text-slate-500">
                    <ReactionSummary
                        targetId={String(currentPost._id)}
                        targetType="post"
                        reactionsCount={reactionsCount}
                        likesCount={likesCount}
                    />

                    <div className="flex items-center gap-3 font-medium text-slate-500">
                        {commentsCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowComments(!showComments)}
                                className="hover:underline hover:text-slate-800 transition cursor-pointer"
                            >
                                {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                            </button>
                        )}
                        {sharesCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowShareModal(true)}
                                className="hover:underline hover:text-slate-800 transition cursor-pointer"
                            >
                                {sharesCount} {sharesCount === 1 ? 'share' : 'shares'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 4. Action Buttons Bar (Like, Comment, Share) */}
                <div className="px-3 py-1.5 border-t border-slate-100/90 grid grid-cols-3 gap-1.5 relative">
                    {/* Like Button with Floating Reaction Picker on Hover */}
                    <div
                        className="relative"
                        onMouseEnter={handleLikeMouseEnter}
                        onMouseLeave={handleLikeMouseLeave}
                    >
                        {isHoveringLike && (
                            <ReactionPicker
                                onSelect={(r) => {
                                    if (likeHoverTimerRef.current) clearTimeout(likeHoverTimerRef.current);
                                    setIsHoveringLike(false);
                                    handleReaction(r);
                                }}
                                onMouseEnter={handleLikeMouseEnter}
                                onMouseLeave={handleLikeMouseLeave}
                                position="top"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (likeHoverTimerRef.current) clearTimeout(likeHoverTimerRef.current);
                                setIsHoveringLike(false);
                                handleReaction(userReaction || 'like');
                            }}
                            className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition hover:bg-slate-100/70 cursor-pointer ${
                                reactionConfig ? reactionConfig.bgColor : 'text-slate-600 hover:text-slate-900'
                            }`}
                            style={
                                reactionConfig
                                    ? { color: reactionConfig.color }
                                    : undefined
                            }
                        >
                            {reactionConfig ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 overflow-hidden">
                                    <FacebookEmoji type={userReaction || 'like'} size="xxs" />
                                </span>
                            ) : (
                                <Icon icon="solar:like-outline" width={18} />
                            )}
                            <span>{reactionConfig ? reactionConfig.label : 'Like'}</span>
                        </button>
                    </div>

                    {/* Comment Button */}
                    <button
                        type="button"
                        onClick={() => setShowComments(!showComments)}
                        className="py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition cursor-pointer"
                    >
                        <Icon icon="solar:chat-round-dots-outline" width={18} />
                        <span>Comment</span>
                    </button>

                    {/* Share Button (Opens Multi-Channel Share Modal) */}
                    <button
                        type="button"
                        onClick={() => setShowShareModal(true)}
                        className="py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition cursor-pointer"
                    >
                        <Icon icon="solar:share-outline" width={18} />
                        <span>Share</span>
                    </button>
                </div>

                {/* 5. Expandable Comments Section */}
                {showComments && (
                    <div className="px-4 pb-4">
                        <CommentSection
                            postId={String(currentPost._id)}
                            currentUser={currentUser}
                            onCommentCountChanged={(newCount) => setCommentsCount(newCount)}
                        />
                    </div>
                )}
            </article>

            {/* Comprehensive Share Modal */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                post={currentPost}
                currentUser={currentUser}
                onPostShared={(newSharedPost) => {
                    setSharesCount((prev) => prev + 1);
                    onPostUpdated?.(newSharedPost);
                }}
            />

            {/* Edit Post Modal */}
            {showEditModal && (
                <EditPostModal
                    isOpen={showEditModal}
                    post={currentPost}
                    onClose={() => setShowEditModal(false)}
                    onPostUpdated={(updated) => {
                        setCurrentPost(updated);
                        onPostUpdated?.(updated);
                    }}
                />
            )}
        </>
    );
}
