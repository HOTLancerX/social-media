'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import VideoPost from '../ui/Video';
import VideoViewerModal from '../ui/VideoViewerModal';

interface ProfileVideosProps {
    userId: string;
}

export default function ProfileVideos({ userId }: ProfileVideosProps) {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/social-media?userId=${userId}&type=video&limit=30`)
            .then((r) => r.json())
            .then((res) => {
                setVideos(res.posts || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Icon icon="solar:videocamera-record-bold" className="text-indigo-600" width={22} />
                    Videos & Reels ({videos.length})
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Video content and community clips
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="aspect-video rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : videos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {videos.map((post, idx) => (
                        <div key={post._id} className="space-y-2">
                            <VideoPost
                                src={post.videos?.[0]}
                                title={post.content?.slice(0, 50) || 'Video'}
                                onOpenReel={() => setActiveVideoIndex(idx)}
                            />
                            {post.content && (
                                <p className="text-xs font-semibold text-gray-800 line-clamp-2 px-1">
                                    {post.content}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                        <Icon icon="solar:videocamera-record-bold" width={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No videos uploaded yet</p>
                    <p className="text-xs text-gray-400">Videos and reels shared by this user will appear here.</p>
                </div>
            )}

            {/* Video Reels Fullscreen Modal */}
            {activeVideoIndex !== null && videos.length > 0 && (
                <VideoViewerModal
                    videos={videos}
                    initialIndex={activeVideoIndex}
                    onClose={() => setActiveVideoIndex(null)}
                    onPostUpdated={(updatedPost) => {
                        setVideos((prev) =>
                            prev.map((p) =>
                                String(p._id) === String(updatedPost._id) ? updatedPost : p
                            )
                        );
                    }}
                />
            )}
        </div>
    );
}
