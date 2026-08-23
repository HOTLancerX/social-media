'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Icon } from '@iconify/react';
import type { ISocialPostData } from '../models/SocialMedia';

interface ReelsFeedBarProps {
    onSelectReel: (post: ISocialPostData) => void;
}

export default function ReelsFeedBar({ onSelectReel }: ReelsFeedBarProps) {
    const [reels, setReels] = useState<ISocialPostData[]>([]);
    const [loading, setLoading] = useState(true);

    // Embla Carousel Integration
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
    });

    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback((api: any) => {
        setPrevBtnDisabled(!api.canScrollPrev());
        setNextBtnDisabled(!api.canScrollNext());
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect(emblaApi);
        emblaApi.on('reInit', onSelect);
        emblaApi.on('select', onSelect);
        emblaApi.on('scroll', onSelect);
    }, [emblaApi, onSelect]);

    useEffect(() => {
        setLoading(true);
        fetch('/api/social-media?type=video&limit=12')
            .then((r) => r.json())
            .then((res) => {
                setReels(res.posts || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Re-initialize Embla when reels load
    useEffect(() => {
        if (emblaApi) {
            emblaApi.reInit();
        }
    }, [reels, emblaApi]);

    if (!loading && reels.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-4 my-3 overflow-hidden">
            {/* Header with Title and Embla Nav Arrows */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-rose-500 via-red-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                        <Icon icon="solar:videocamera-record-bold" width={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                            <span>Reels and short videos</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-wide">
                                Watch
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                            Suggested video clips and reels from the community
                        </p>
                    </div>
                </div>

                {/* Carousel Navigation Buttons */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={scrollPrev}
                        disabled={prevBtnDisabled}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-slate-100 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        aria-label="Previous reel"
                    >
                        <Icon icon="solar:alt-arrow-left-bold" width={16} />
                    </button>
                    <button
                        type="button"
                        onClick={scrollNext}
                        disabled={nextBtnDisabled}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-slate-100 flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        aria-label="Next reel"
                    >
                        <Icon icon="solar:alt-arrow-right-bold" width={16} />
                    </button>
                </div>
            </div>

            {/* Carousel Viewport */}
            <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing select-none">
                <div className="flex gap-3">
                    {loading
                        ? [1, 2, 3, 4].map((n) => (
                              <div
                                  key={n}
                                  className="flex-none w-36 sm:w-44 aspect-9/16 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/60"
                              />
                          ))
                        : reels.map((post) => {
                              const videoSrc = post.videos?.[0] || '';
                              return (
                                  <div
                                      key={post._id}
                                      onClick={() => onSelectReel(post)}
                                      className="flex-none w-36 sm:w-44 aspect-9/16 rounded-2xl overflow-hidden relative group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 bg-slate-900 border border-slate-200/60 hover:scale-[1.02]"
                                  >
                                      {/* Background Video / Poster */}
                                      {videoSrc ? (
                                          <video
                                              src={videoSrc}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                              preload="metadata"
                                              muted
                                              playsInline
                                          />
                                      ) : (
                                          <div className="w-full h-full bg-linear-to-tr from-slate-900 via-indigo-950 to-slate-900" />
                                      )}

                                      {/* Gradient Overlays */}
                                      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

                                      {/* Top: Creator Avatar & Name */}
                                      <div className="absolute top-2.5 inset-x-2.5 flex items-center gap-2 z-10">
                                          <div className="relative">
                                              {post.userImage ? (
                                                  <img
                                                      src={post.userImage}
                                                      alt={post.userName}
                                                      className="w-7 h-7 rounded-full object-cover border border-white/90 shadow-sm"
                                                  />
                                              ) : (
                                                  <div className="w-7 h-7 rounded-full bg-linear-to-tr from-rose-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-white/90 shadow-sm">
                                                      {post.userName?.charAt(0)?.toUpperCase()}
                                                  </div>
                                              )}
                                          </div>
                                          <span className="font-bold text-[11px] text-white truncate drop-shadow-md">
                                              {post.userName}
                                          </span>
                                      </div>

                                      {/* Center: Play Watermark Badge */}
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <div className="w-11 h-11 rounded-full bg-black/40 group-hover:bg-red-600/90 text-white flex items-center justify-center backdrop-blur-xs transition-all duration-300 transform group-hover:scale-110 shadow-lg border border-white/20">
                                              <Icon icon="solar:play-bold" width={22} className="ml-0.5" />
                                          </div>
                                      </div>

                                      {/* Bottom: Caption & Like Count */}
                                      <div className="absolute bottom-2.5 inset-x-2.5 z-10 space-y-1">
                                          {post.content && (
                                              <p className="text-white text-[11px] font-medium line-clamp-2 leading-tight drop-shadow-md">
                                                  {post.content}
                                              </p>
                                          )}
                                          <div className="flex items-center justify-between text-white/90 text-[10px] font-bold drop-shadow-sm pt-0.5">
                                              <div className="flex items-center gap-1">
                                                  <Icon icon="solar:heart-bold" width={12} className="text-rose-500" />
                                                  <span>{post.likesCount || 0}</span>
                                              </div>
                                              <div className="flex items-center gap-1 text-white/75">
                                                  <Icon icon="solar:chat-round-dots-bold" width={11} />
                                                  <span>{post.commentsCount || 0}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                </div>
            </div>
        </div>
    );
}
