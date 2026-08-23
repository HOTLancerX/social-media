'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import TextPost from './Text';
import TextBgPost from './Text-BG';
import type { ISharedPostSnapshot } from '../models/SocialMedia';

interface QuotePostCardProps {
    sharedPost: ISharedPostSnapshot;
    className?: string;
}

export default function QuotePostCard({ sharedPost, className = '' }: QuotePostCardProps) {
    if (!sharedPost) return null;

    const formatTimeAgo = (dateStr: any) => {
        if (!dateStr) return '';
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div
            className={`border border-gray-200/90 rounded-2xl overflow-hidden bg-gray-50/70 hover:bg-gray-50 transition shadow-xs ${className}`}
        >
            {/* Original Author Row */}
            <div className="p-3 bg-white/80 flex items-center justify-between gap-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5 min-w-0">
                    {sharedPost.userImage ? (
                        <img
                            src={sharedPost.userImage}
                            alt={sharedPost.userName}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {sharedPost.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    )}

                    <div className="min-w-0">
                        <span className="font-bold text-gray-900 text-xs truncate block">
                            {sharedPost.userName}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                            {formatTimeAgo(sharedPost.createdAt)}
                        </span>
                    </div>
                </div>

                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100">
                    Original Post
                </span>
            </div>

            {/* Content Preview */}
            <div className="p-3">
                {sharedPost.type === 'text' && (
                    <TextPost content={sharedPost.content} maxChars={200} />
                )}

                {sharedPost.type === 'text-bg' && (
                    <TextBgPost
                        content={sharedPost.content}
                        bgStyle={sharedPost.bgStyle}
                        className="min-h-40 md:min-h-45 p-6 text-sm"
                    />
                )}

                {sharedPost.type === 'image' && (
                    <div className="space-y-2">
                        {sharedPost.content && (
                            <TextPost content={sharedPost.content} maxChars={150} />
                        )}
                        {sharedPost.images && sharedPost.images.length > 0 && (
                            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black">
                                <img
                                    src={sharedPost.images[0]}
                                    alt="Shared media"
                                    className="w-full h-full object-cover"
                                />
                                {sharedPost.images.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                                        +{sharedPost.images.length - 1} photos
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {sharedPost.type === 'video' && (
                    <div className="space-y-2">
                        {sharedPost.content && (
                            <TextPost content={sharedPost.content} maxChars={150} />
                        )}
                        {sharedPost.videos && sharedPost.videos.length > 0 && (
                            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                <video
                                    src={sharedPost.videos[0]}
                                    className="w-full h-full object-cover opacity-80"
                                />
                                <div className="absolute p-3 rounded-full bg-black/60 text-white">
                                    <Icon icon="solar:play-bold" width={22} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {sharedPost.type === 'poll' && sharedPost.poll && (
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs mb-1">
                            <Icon icon="solar:chart-square-bold" width={16} />
                            <span>{sharedPost.poll.question}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            {sharedPost.poll.options?.length || 0} options • Poll
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
