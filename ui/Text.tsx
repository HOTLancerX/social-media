'use client';

import React, { useState } from 'react';

interface TextPostProps {
    content: string;
    maxChars?: number;
    className?: string;
}

export default function TextPost({ content, maxChars = 320, className = '' }: TextPostProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    const isLong = content.length > maxChars;
    const displayText = isLong && !isExpanded ? content.slice(0, maxChars) + '...' : content;

    // Helper to format hashtags, mentions, and URLs into styled spans / links
    const formatContent = (text: string) => {
        // Regex split for URLs, #hashtags, and @mentions
        const parts = text.split(/(https?:\/\/[^\s]+|#[a-zA-Z0-9_\u0600-\u06FF]+|@[a-zA-Z0-9_]+)/g);

        return parts.map((part, index) => {
            if (/^https?:\/\//i.test(part)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            if (/^#/.test(part)) {
                return (
                    <span
                        key={index}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Optional hashtag filter trigger
                        }}
                    >
                        {part}
                    </span>
                );
            }
            if (/^@/.test(part)) {
                return (
                    <span
                        key={index}
                        className="text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className={`text-gray-900 text-[15px] leading-relaxed whitespace-pre-line select-text ${className}`}>
            {formatContent(displayText)}
            {isLong && (
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="ml-1 text-gray-500 hover:text-gray-800 font-bold text-xs inline-block transition"
                >
                    {isExpanded ? ' See less' : ' See more'}
                </button>
            )}
        </div>
    );
}
