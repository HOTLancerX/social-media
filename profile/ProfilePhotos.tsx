'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';

interface ProfilePhotosProps {
    userId: string;
    onClick?: () => void;
}

export default function ProfilePhotos({ userId, onClick }: ProfilePhotosProps) {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const isWidget = Boolean(onClick);

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

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && photos.length > 0) {
            setLightboxIndex((lightboxIndex + 1) % photos.length);
        }
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && photos.length > 0) {
            setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
        }
    };

    // ── 1. Compact Sidebar Widget Mode (When onClick is passed) ──
    if (isWidget) {
        return (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="solar:gallery-wide-bold" className="text-indigo-600" width={18} />
                        Photos {photos.length > 0 && <span className="text-xs font-semibold text-gray-400">({photos.length})</span>}
                    </h3>
                    <button
                        type="button"
                        onClick={onClick}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                        See all
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {photos.slice(0, 9).map((img, idx) => (
                            <div
                                key={idx}
                                onClick={onClick}
                                className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer group relative border border-gray-100 hover:border-indigo-300 transition shadow-2xs"
                            >
                                <img
                                    src={img}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No photos uploaded yet</p>
                )}
            </div>
        );
    }

    // ── 2. Full Dedicated Tab Mode ──
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
                    <h4 className="text-sm font-bold text-gray-800">No Photos Yet</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        Photos attached to posts and media updates will appear in this gallery.
                    </p>
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxIndex !== null && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-99999 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-5 right-5 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition z-50 cursor-pointer"
                    >
                        <Icon icon="solar:close-circle-bold" width={32} />
                    </button>

                    {/* Counter */}
                    <div className="absolute top-5 left-5 text-white/80 text-xs font-bold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        {lightboxIndex + 1} / {photos.length}
                    </div>

                    {/* Previous button */}
                    {photos.length > 1 && (
                        <button
                            type="button"
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer border border-white/10"
                        >
                            <Icon icon="solar:alt-arrow-left-bold" width={24} />
                        </button>
                    )}

                    {/* Image */}
                    <div
                        className="max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={photos[lightboxIndex]}
                            alt="Expanded photo"
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        />
                    </div>

                    {/* Next button */}
                    {photos.length > 1 && (
                        <button
                            type="button"
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer border border-white/10"
                        >
                            <Icon icon="solar:alt-arrow-right-bold" width={24} />
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
