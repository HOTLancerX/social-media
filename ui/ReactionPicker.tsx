'use client';

import React, { useState } from 'react';
import type { ReactionType } from '../models/Like';
import FacebookEmoji from './FacebookEmoji';

export interface ReactionConfig {
    type: ReactionType;
    label: string;
    icon: string;
    color: string;
    emoji: string;
    bgColor: string;
}

export const REACTION_CONFIGS: Record<ReactionType, ReactionConfig> = {
    like: {
        type: 'like',
        label: 'Like',
        icon: 'solar:like-bold',
        color: '#1877F2',
        emoji: '👍',
        bgColor: 'bg-blue-50 text-blue-600',
    },
    love: {
        type: 'love',
        label: 'Love',
        icon: 'solar:heart-bold',
        color: '#F02849',
        emoji: '❤️',
        bgColor: 'bg-rose-50 text-rose-600',
    },
    care: {
        type: 'care',
        label: 'Care',
        icon: 'solar:emoji-funny-circle-bold',
        color: '#F7B125',
        emoji: '🥰',
        bgColor: 'bg-amber-50 text-amber-600',
    },
    haha: {
        type: 'haha',
        label: 'Haha',
        icon: 'solar:emoji-funny-square-bold',
        color: '#F7B125',
        emoji: '😆',
        bgColor: 'bg-amber-50 text-amber-600',
    },
    wow: {
        type: 'wow',
        label: 'Wow',
        icon: 'solar:star-fall-bold',
        color: '#F7B125',
        emoji: '😮',
        bgColor: 'bg-amber-50 text-amber-600',
    },
    sad: {
        type: 'sad',
        label: 'Sad',
        icon: 'solar:sad-circle-bold',
        color: '#F7B125',
        emoji: '😢',
        bgColor: 'bg-yellow-50 text-yellow-600',
    },
    angry: {
        type: 'angry',
        label: 'Angry',
        icon: 'solar:danger-bold',
        color: '#E04E35',
        emoji: '😡',
        bgColor: 'bg-red-50 text-red-600',
    },
};

export const REACTION_LIST: ReactionConfig[] = [
    REACTION_CONFIGS.like,
    REACTION_CONFIGS.love,
    REACTION_CONFIGS.care,
    REACTION_CONFIGS.haha,
    REACTION_CONFIGS.wow,
    REACTION_CONFIGS.sad,
    REACTION_CONFIGS.angry,
];

interface ReactionPickerProps {
    onSelect: (reaction: ReactionType) => void;
    position?: 'top' | 'bottom';
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export default function ReactionPicker({
    onSelect,
    position = 'top',
    className = '',
    onMouseEnter,
    onMouseLeave,
}: ReactionPickerProps) {
    const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`absolute z-50 flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-2xl border border-gray-200/80 transition-all duration-200 animate-in fade-in zoom-in-95 select-none ${
                position === 'top'
                    ? 'bottom-full mb-1 left-0 after:absolute after:-bottom-3 after:inset-x-0 after:h-4 after:content-[\'\']'
                    : 'top-full mt-1 left-0 before:absolute before:-top-3 before:inset-x-0 before:h-4 before:content-[\'\']'
            } ${className}`}
            style={{ filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.18))' }}
            role="toolbar"
            aria-label="Reactions"
        >
            {REACTION_LIST.map((r, idx) => {
                const isHovered = hoveredReaction === r.type;
                return (
                    <button
                        key={r.type}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(r.type);
                        }}
                        onMouseEnter={() => setHoveredReaction(r.type)}
                        onMouseLeave={() => setHoveredReaction(null)}
                        className="group relative flex flex-col items-center p-1 rounded-full hover:bg-gray-100/80 transition-all duration-150 transform hover:-translate-y-2 hover:scale-125 active:scale-95 cursor-pointer"
                        style={{
                            transitionDelay: `${idx * 15}ms`,
                        }}
                        title={r.label}
                    >
                        {/* Tooltip Label */}
                        {isHovered && (
                            <span className="absolute -top-7 px-2.5 py-0.5 text-[11px] font-bold text-white bg-gray-900/95 rounded-full shadow-md pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-75 z-50">
                                {r.label}
                            </span>
                        )}

                        {/* Pure CSS Animated Facebook Emoji */}
                        <span className="flex items-center justify-center w-8 h-8 pointer-events-none">
                            <FacebookEmoji type={r.type} size="sm" />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
