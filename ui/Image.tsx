'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

interface ImagePostProps {
    images: string[];
    className?: string;
}

export default function ImagePost({ images = [], className = '' }: ImagePostProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    if (!images || images.length === 0) return null;

    const count = images.length;
    const isLightboxOpen = lightboxIndex !== null;

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null) {
            setLightboxIndex((lightboxIndex + 1) % images.length);
        }
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null) {
            setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
        }
    };

    return (
        <>
            <div className={`overflow-hidden bg-gray-900 select-none ${className}`}>
                {/* 1 Image */}
                {count === 1 && (
                    <div
                        className="relative w-full max-h-130 flex items-center justify-center bg-black cursor-pointer group overflow-hidden"
                        onClick={() => setLightboxIndex(0)}
                    >
                        <img
                            src={images[0]}
                            alt="Post photo"
                            className="w-full h-auto max-h-130 object-contain group-hover:scale-[1.01] transition-transform duration-200"
                            loading="lazy"
                        />
                    </div>
                )}

                {/* 2 Images — 50/50 Split */}
                {count === 2 && (
                    <div className="grid grid-cols-2 gap-1 h-72 md:h-96">
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                onClick={() => setLightboxIndex(idx)}
                            >
                                <img
                                    src={img}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 3 Images — 1 Large on Left, 2 Stacked on Right */}
                {count === 3 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-80 md:h-105">
                        <div
                            className="row-span-2 relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                            onClick={() => setLightboxIndex(0)}
                        >
                            <img
                                src={images[0]}
                                alt="Photo 1"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                            />
                        </div>
                        {images.slice(1, 3).map((img, idx) => (
                            <div
                                key={idx + 1}
                                className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                onClick={() => setLightboxIndex(idx + 1)}
                            >
                                <img
                                    src={img}
                                    alt={`Photo ${idx + 2}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 4 Images — 2x2 Grid */}
                {count === 4 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-1 h-80 md:h-105">
                        {images.map((img, idx) => (
                            <div
                                key={idx}
                                className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                onClick={() => setLightboxIndex(idx)}
                            >
                                <img
                                    src={img}
                                    alt={`Photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 5+ Images — 2 Top, 3 Bottom with "+N more" overlay */}
                {count >= 5 && (
                    <div className="flex flex-col gap-1 h-80 md:h-110">
                        {/* Top 2 */}
                        <div className="grid grid-cols-2 gap-1 h-1/2">
                            {images.slice(0, 2).map((img, idx) => (
                                <div
                                    key={idx}
                                    className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                    onClick={() => setLightboxIndex(idx)}
                                >
                                    <img
                                        src={img}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Bottom 3 */}
                        <div className="grid grid-cols-3 gap-1 h-1/2">
                            {images.slice(2, 4).map((img, idx) => (
                                <div
                                    key={idx + 2}
                                    className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                    onClick={() => setLightboxIndex(idx + 2)}
                                >
                                    <img
                                        src={img}
                                        alt={`Photo ${idx + 3}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                    />
                                </div>
                            ))}

                            {/* 5th Image with Overlap */}
                            <div
                                className="relative w-full h-full cursor-pointer group overflow-hidden bg-black"
                                onClick={() => setLightboxIndex(4)}
                            >
                                <img
                                    src={images[4]}
                                    alt="Photo 5"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                />
                                {count > 5 && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-xl md:text-2xl transition group-hover:bg-black/70">
                                        +{count - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Fullscreen Lightbox Modal */}
            {isLightboxOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="fixed inset-0 z-99999 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-in fade-in select-none"
                        onClick={() => setLightboxIndex(null)}
                    >
                        {/* Top Bar */}
                        <div className="w-full flex items-center justify-between text-white py-2 px-4 z-10">
                            <span className="text-sm font-semibold text-gray-300">
                                {lightboxIndex + 1} / {images.length}
                            </span>
                            <div className="flex items-center gap-3">
                                <a
                                    href={images[lightboxIndex]}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 rounded-full hover:bg-white/20 text-gray-300 hover:text-white transition"
                                    title="Open Original"
                                >
                                    <Icon icon="solar:download-minimalistic-bold" width={22} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setLightboxIndex(null)}
                                    className="p-2 rounded-full hover:bg-white/20 text-gray-300 hover:text-white transition"
                                    title="Close"
                                >
                                    <Icon icon="solar:close-circle-bold" width={26} />
                                </button>
                            </div>
                        </div>

                        {/* Main Center Image with Prev / Next */}
                        <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2">
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={prevImage}
                                    className="absolute left-2 md:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-lg border border-white/20 transition hover:scale-110 active:scale-95"
                                >
                                    <Icon icon="solar:alt-arrow-left-bold" width={24} />
                                </button>
                            )}

                            <img
                                src={images[lightboxIndex]}
                                alt={`Full view ${lightboxIndex + 1}`}
                                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition duration-200"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={nextImage}
                                    className="absolute right-2 md:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-lg border border-white/20 transition hover:scale-110 active:scale-95"
                                >
                                    <Icon icon="solar:alt-arrow-right-bold" width={24} />
                                </button>
                            )}
                        </div>

                        {/* Bottom Thumbnail Strip */}
                        {images.length > 1 && (
                            <div
                                className="flex items-center gap-2 max-w-2xl overflow-x-auto p-2 no-scrollbar z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setLightboxIndex(idx)}
                                        className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                                            lightboxIndex === idx
                                                ? 'border-blue-500 scale-105 shadow-md'
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
}
