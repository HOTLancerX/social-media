'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import ReactionPicker, { REACTION_CONFIGS } from './ReactionPicker';
import ReactionSummary from './ReactionSummary';
import type { ReactionType } from '../models/Like';

interface CommentItem {
    _id: string;
    postId: string;
    parentId?: string | null;
    replyToUserId?: string;
    replyToUserName?: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    content: string;
    image?: string;
    likesCount: number;
    reactionsCount?: any;
    userReaction?: ReactionType | null;
    replies?: CommentItem[];
    createdAt: string;
}

interface CommentSectionProps {
    postId: string;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
    onCommentCountChanged?: (newCount: number) => void;
}

export default function CommentSection({
    postId,
    currentUser,
    onCommentCountChanged,
}: CommentSectionProps) {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reply state: parentId being replied to
    const [replyingTo, setReplyingTo] = useState<{
        parentId: string;
        userName: string;
        userId: string;
    } | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);

    // Active hover reaction picker for comments: commentId -> boolean
    const [activeReactionCommentId, setActiveReactionCommentId] = useState<string | null>(null);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/social-media/comment?postId=${postId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
                if (data.totalCount !== undefined) {
                    onCommentCountChanged?.(data.totalCount);
                }
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        if (!content.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/social-media/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    content: content.trim(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.comment) {
                    setComments((prev) => [data.comment, ...prev]);
                    setContent('');
                    onCommentCountChanged?.(comments.length + 1);
                }
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateReply = async (parentId: string, e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        if (!replyContent.trim() || replySubmitting) return;

        setReplySubmitting(true);
        try {
            const res = await fetch('/api/social-media/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    parentId,
                    replyToUserId: replyingTo?.userId || '',
                    replyToUserName: replyingTo?.userName || '',
                    content: replyContent.trim(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.comment) {
                    setComments((prev) =>
                        prev.map((c) => {
                            if (c._id === parentId) {
                                return {
                                    ...c,
                                    replies: [...(c.replies || []), data.comment],
                                };
                            }
                            return c;
                        })
                    );
                    setReplyContent('');
                    setReplyingTo(null);
                }
            }
        } catch (err) {
            console.error('Failed to post reply:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleReaction = async (commentId: string, reaction: ReactionType) => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await fetch('/api/social-media/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType: 'comment',
                    targetId: commentId,
                    reaction,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Update local comment state recursively
                setComments((prev) =>
                    prev.map((c) => {
                        if (c._id === commentId) {
                            return {
                                ...c,
                                userReaction: data.userReaction,
                                likesCount: data.likesCount,
                                reactionsCount: data.reactionsCount,
                            };
                        }
                        if (c.replies && c.replies.length > 0) {
                            return {
                                ...c,
                                replies: c.replies.map((r) =>
                                    r._id === commentId
                                        ? {
                                              ...r,
                                              userReaction: data.userReaction,
                                              likesCount: data.likesCount,
                                              reactionsCount: data.reactionsCount,
                                          }
                                        : r
                                ),
                            };
                        }
                        return c;
                    })
                );
            }
        } catch (err) {
            console.error('Failed to react to comment:', err);
        } finally {
            setActiveReactionCommentId(null);
        }
    };

    const handleDeleteComment = async (commentId: string, parentId?: string | null) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;
        try {
            const res = await fetch(`/api/social-media/comment?id=${commentId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                if (parentId) {
                    setComments((prev) =>
                        prev.map((c) =>
                            c._id === parentId
                                ? {
                                      ...c,
                                      replies: (c.replies || []).filter((r) => r._id !== commentId),
                                  }
                                : c
                        )
                    );
                } else {
                    setComments((prev) => prev.filter((c) => c._id !== commentId));
                }
            }
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="space-y-4 pt-3 border-t border-gray-100">
            {/* New Comment Input Box or Guest Login Banner */}
            {currentUser?._id ? (
                <form onSubmit={handleCreateComment} className="flex items-start gap-2.5">
                    {currentUser?.image ? (
                        <img
                            src={currentUser.image}
                            alt="My Avatar"
                            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-gray-200"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}

                    <div className="flex-1 relative flex items-center">
                        <input
                            type="text"
                            placeholder="Write a public comment..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-gray-100/90 hover:bg-gray-100 focus:bg-white text-gray-800 text-xs rounded-full py-2.5 pl-4 pr-10 border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition outline-none"
                        />

                        {content.trim() && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="absolute right-2 p-1.5 rounded-full text-blue-600 hover:bg-blue-50 transition"
                            >
                                <Icon icon="solar:plain-bold" width={18} />
                            </button>
                        )}
                    </div>
                </form>
            ) : (
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>Log in to join the conversation and leave a comment.</span>
                    <a
                        href="/login"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition shrink-0"
                    >
                        Log In
                    </a>
                </div>
            )}

            {/* Comments Thread List */}
            {loading ? (
                <div className="py-4 flex items-center justify-center text-blue-500 gap-2">
                    <Icon icon="line-md:loading-twotone-loop" width={22} />
                    <span className="text-xs text-gray-400">Loading comments...</span>
                </div>
            ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">
                    No comments yet. Be the first to share your thoughts!
                </p>
            ) : (
                <div className="space-y-3.5">
                    {comments.map((comment) => {
                        const reactionConfig = comment.userReaction
                            ? REACTION_CONFIGS[comment.userReaction]
                            : null;
                        const isAuthor = currentUser?._id === comment.userId;
                        const isAdmin = currentUser?.type === 'admin';

                        return (
                            <div key={comment._id} className="space-y-2 group/comment">
                                {/* Top-level Comment Card */}
                                <div className="flex items-start gap-2.5">
                                    {comment.userImage ? (
                                        <img
                                            src={comment.userImage}
                                            alt={comment.userName}
                                            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-gray-100"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-slate-600 to-gray-800 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                            {comment.userName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        {/* Comment Bubble */}
                                        <div className="relative inline-block bg-gray-100/90 rounded-2xl px-3.5 py-2 text-xs text-gray-800 max-w-full">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="font-bold text-gray-900 truncate">
                                                    {comment.userName}
                                                </span>
                                                {comment.userRole && comment.userRole !== 'User' && (
                                                    <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-blue-100 text-blue-700">
                                                        {comment.userRole}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="whitespace-pre-line leading-relaxed text-gray-800">
                                                {comment.content}
                                            </p>

                                            {/* Overlapping Reaction Badge on Bubble Bottom-Right */}
                                            {comment.likesCount > 0 && (
                                                <div className="absolute -bottom-2 -right-2">
                                                    <ReactionSummary
                                                        targetId={comment._id}
                                                        targetType="comment"
                                                        reactionsCount={comment.reactionsCount}
                                                        likesCount={comment.likesCount}
                                                        className="bg-white rounded-full px-1.5 py-0.5 shadow-xs border border-gray-100"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Bar (Like, Reply, Time, Delete) */}
                                        <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-gray-500 font-semibold relative">
                                            {/* Reaction Button with Floating Reaction Picker */}
                                            <div
                                                className="relative"
                                                onMouseEnter={() => setActiveReactionCommentId(comment._id)}
                                                onMouseLeave={() => setActiveReactionCommentId(null)}
                                            >
                                                {activeReactionCommentId === comment._id && (
                                                    <ReactionPicker
                                                        onSelect={(r) => handleReaction(comment._id, r)}
                                                        position="top"
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReaction(
                                                            comment._id,
                                                            comment.userReaction || 'like'
                                                        )
                                                    }
                                                    className={`hover:underline transition cursor-pointer ${
                                                        reactionConfig
                                                            ? 'font-bold'
                                                            : 'text-gray-500 hover:text-gray-800'
                                                    }`}
                                                    style={
                                                        reactionConfig
                                                            ? { color: reactionConfig.color }
                                                            : undefined
                                                    }
                                                >
                                                    {reactionConfig ? reactionConfig.label : 'Like'}
                                                </button>
                                            </div>

                                            {/* Reply Button */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReplyingTo({
                                                        parentId: comment._id,
                                                        userName: comment.userName,
                                                        userId: comment.userId,
                                                    })
                                                }
                                                className="hover:underline hover:text-gray-800 cursor-pointer"
                                            >
                                                Reply
                                            </button>

                                            {/* Timestamp */}
                                            <span className="text-gray-400 font-normal">
                                                {formatTimeAgo(comment.createdAt)}
                                            </span>

                                            {/* Delete Option */}
                                            {(isAuthor || isAdmin) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteComment(comment._id)}
                                                    className="opacity-0 group-hover/comment:opacity-100 text-red-500 hover:underline transition"
                                                    title="Delete comment"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        {/* Nested Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-2.5 space-y-2.5 pl-3 border-l-2 border-gray-100">
                                                {comment.replies.map((reply) => {
                                                    const replyReactionConfig = reply.userReaction
                                                        ? REACTION_CONFIGS[reply.userReaction]
                                                        : null;
                                                    const isReplyAuthor = currentUser?._id === reply.userId;

                                                    return (
                                                        <div key={reply._id} className="flex items-start gap-2 group/reply">
                                                            {reply.userImage ? (
                                                                <img
                                                                    src={reply.userImage}
                                                                    alt={reply.userName}
                                                                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-gray-100"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                                                    {reply.userName?.charAt(0)?.toUpperCase() || 'U'}
                                                                </div>
                                                            )}

                                                            <div className="flex-1 min-w-0">
                                                                <div className="relative inline-block bg-gray-100/90 rounded-2xl px-3 py-1.5 text-xs text-gray-800 max-w-full">
                                                                    <div className="flex items-center gap-1 mb-0.5">
                                                                        <span className="font-bold text-gray-900 truncate">
                                                                            {reply.userName}
                                                                        </span>
                                                                        {reply.replyToUserName && (
                                                                            <span className="text-blue-600 font-semibold">
                                                                                @{reply.replyToUserName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="whitespace-pre-line leading-relaxed text-gray-800">
                                                                        {reply.content}
                                                                    </p>

                                                                    {reply.likesCount > 0 && (
                                                                        <div className="absolute -bottom-2 -right-2">
                                                                            <ReactionSummary
                                                                                targetId={reply._id}
                                                                                targetType="comment"
                                                                                reactionsCount={reply.reactionsCount}
                                                                                likesCount={reply.likesCount}
                                                                                className="bg-white rounded-full px-1.5 py-0.5 shadow-xs border border-gray-100"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Reply Action Bar */}
                                                                <div className="flex items-center gap-3 mt-0.5 ml-2 text-[10px] text-gray-500 font-semibold relative">
                                                                    <div
                                                                        className="relative"
                                                                        onMouseEnter={() =>
                                                                            setActiveReactionCommentId(reply._id)
                                                                        }
                                                                        onMouseLeave={() =>
                                                                            setActiveReactionCommentId(null)
                                                                        }
                                                                    >
                                                                        {activeReactionCommentId === reply._id && (
                                                                            <ReactionPicker
                                                                                onSelect={(r) =>
                                                                                    handleReaction(reply._id, r)
                                                                                }
                                                                                position="top"
                                                                            />
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleReaction(
                                                                                    reply._id,
                                                                                    reply.userReaction || 'like'
                                                                                )
                                                                            }
                                                                            className={`hover:underline cursor-pointer ${
                                                                                replyReactionConfig
                                                                                    ? 'font-bold'
                                                                                    : 'text-gray-500 hover:text-gray-800'
                                                                            }`}
                                                                            style={
                                                                                replyReactionConfig
                                                                                    ? {
                                                                                          color: replyReactionConfig.color,
                                                                                      }
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            {replyReactionConfig
                                                                                ? replyReactionConfig.label
                                                                                : 'Like'}
                                                                        </button>
                                                                    </div>

                                                                    <span className="text-gray-400 font-normal">
                                                                        {formatTimeAgo(reply.createdAt)}
                                                                    </span>

                                                                    {(isReplyAuthor || isAdmin) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDeleteComment(
                                                                                    reply._id,
                                                                                    comment._id
                                                                                )
                                                                            }
                                                                            className="opacity-0 group-hover/reply:opacity-100 text-red-500 hover:underline transition"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Active Reply Input Box for this comment */}
                                        {replyingTo?.parentId === comment._id && (
                                            <form
                                                onSubmit={(e) => handleCreateReply(comment._id, e)}
                                                className="flex items-center gap-2 mt-2 pl-3"
                                            >
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder={`Reply to ${replyingTo.userName}...`}
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    className="flex-1 bg-gray-100 text-gray-800 text-xs rounded-full py-1.5 pl-3 pr-8 border border-transparent focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-100 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyingTo(null)}
                                                    className="text-xs text-gray-400 hover:text-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={replySubmitting || !replyContent.trim()}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-xs disabled:opacity-50 transition"
                                                >
                                                    Reply
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
