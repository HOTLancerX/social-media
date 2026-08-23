'use client';

import React from 'react';
import '../css/emojis.css';

export type FacebookEmojiType =
    | 'like'
    | 'love'
    | 'care'
    | 'haha'
    | 'yay'
    | 'wow'
    | 'sad'
    | 'angry';

export type FacebookEmojiSize =
    | 'xxs'
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | 'xxl';

interface FacebookEmojiProps {
    type: FacebookEmojiType | string;
    size?: FacebookEmojiSize;
    className?: string;
}

const SIZE_CONFIGS: Record<FacebookEmojiSize, { boxSize: number; scale: number }> = {
    xxs: { boxSize: 20, scale: 0.16666 },
    xs: { boxSize: 26, scale: 0.21666 },
    sm: { boxSize: 36, scale: 0.3 },
    md: { boxSize: 48, scale: 0.4 },
    lg: { boxSize: 64, scale: 0.53333 },
    xl: { boxSize: 120, scale: 1.0 },
    xxl: { boxSize: 180, scale: 1.5 },
};

export default function FacebookEmoji({
    type = 'like',
    size = 'sm',
    className = '',
}: FacebookEmojiProps) {
    const rawType = String(type).toLowerCase();
    const mappedType = rawType === 'care' ? 'yay' : rawType;
    const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.sm;

    return (
        <div
            className={`inline-flex items-center justify-center shrink-0 pointer-events-none select-none relative overflow-visible ${className}`}
            style={{
                width: `${config.boxSize}px`,
                height: `${config.boxSize}px`,
            }}
        >
            <div
                className={`zama-emoji emoji--${mappedType}`}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) scale(${config.scale})`,
                    transformOrigin: 'center center',
                    margin: 0,
                }}
            >
                {mappedType === 'like' && (
                    <div className="emoji__hand">
                        <div className="emoji__thumb" />
                    </div>
                )}
                {mappedType === 'love' && (
                    <div className="emoji__heart" />
                )}
                {mappedType === 'haha' && (
                    <div className="emoji__face">
                        <div className="emoji__eyes" />
                        <div className="emoji__mouth">
                            <div className="emoji__tongue" />
                        </div>
                    </div>
                )}
                {mappedType === 'yay' && (
                    <div className="emoji__face">
                        <div className="emoji__eyebrows" />
                        <div className="emoji__mouth" />
                    </div>
                )}
                {mappedType === 'wow' && (
                    <div className="emoji__face">
                        <div className="emoji__eyebrows" />
                        <div className="emoji__eyes" />
                        <div className="emoji__mouth" />
                    </div>
                )}
                {mappedType === 'sad' && (
                    <div className="emoji__face">
                        <div className="emoji__eyebrows" />
                        <div className="emoji__eyes" />
                        <div className="emoji__mouth" />
                    </div>
                )}
                {mappedType === 'angry' && (
                    <div className="emoji__face">
                        <div className="emoji__eyebrows" />
                        <div className="emoji__eyes" />
                        <div className="emoji__mouth" />
                    </div>
                )}
            </div>
        </div>
    );
}
