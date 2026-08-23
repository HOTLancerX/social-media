'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';

interface ProfilePhotosProps {
    userId: string;
}

export default function ProfilePhotos({ userId }: ProfilePhotosProps) {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/social-media?userId=${userId}&type=image&limit=50`)
            .then((r) => r.json())
            .then((res) => {
                const imgList: string[] = [];
                (res.posts || []).forEach((p: any) => {
                    if (p.images && Array.isArray(p.images)) {
                        imgList.push(...p.images);
                    }
                });
                setPhotos(imgList);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Icon icon="solar:gallery-wide-bold" className="text-indigo-600" width={22} />
                    Photos ({photos.length})
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Images shared on posts and timeline
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div key={n} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photos.map((img, idx) => (
                        <div
                            key={idx}
                            onClick={() => setLightboxIndex(idx)}
                            className="aspect-square rounded-2xl overflow-hidden bg-black/5 cursor-pointer group relative shadow-xs"
                        >
                            <img
                                src={img}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Icon icon="solar:maximize-square-bold" width={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                        <Icon icon="solar:gallery-wide-bold" width={28} />
                    </div>
                    <p className="text-sm font-bold text-gray-700">No photos uploaded yet</p>
                    <p className="text-xs text-gray-400">Photos posted by this user will appear here.</p>
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-99999 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none animate-in fade-in"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <div className="w-full flex items-center justify-between text-white p-2">
                            <span className="text-xs font-bold text-gray-300">
                                {lightboxIndex + 1} / {photos.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setLightboxIndex(null)}
                                className="p-2 rounded-full hover:bg-white/10 text-white"
                            >
                                <Icon icon="solar:close-circle-bold" width={28} />
                            </button>
                        </div>

                        <div className="relative max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={photos[lightboxIndex]}
                                alt="Expanded view"
                                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                            />
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md transition"
                            >
                                ‹ Previous
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((lightboxIndex + 1) % photos.length);
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-md transition"
                            >
                                Next ›
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
