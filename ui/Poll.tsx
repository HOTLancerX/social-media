'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { IPollData } from '../models/SocialMedia';

interface PollPostProps {
    postId: string;
    poll: IPollData;
    currentUserId?: string;
    onVoteUpdated?: (updatedPoll: IPollData) => void;
    className?: string;
}

const SAMPLE_VOTER_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
];

export default function PollPost({
    postId,
    poll,
    currentUserId = '',
    onVoteUpdated,
    className = '',
}: PollPostProps) {
    const [localPoll, setLocalPoll] = useState<IPollData>(poll);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [isVoting, setIsVoting] = useState(false);

    if (!localPoll || !localPoll.options || localPoll.options.length === 0) {
        return null;
    }

    const totalVotes = localPoll.options.reduce(
        (sum, opt) => sum + (opt.votes?.length || 0),
        0
    );

    const hasUserVoted = currentUserId
        ? localPoll.options.some((opt) => opt.votes?.includes(currentUserId))
        : false;

    const isExpired = localPoll.expiresAt
        ? new Date(localPoll.expiresAt) < new Date()
        : false;

    const isClosed = localPoll.isClosed || isExpired;
    const isRevealed = hasUserVoted || isClosed || showResults;

    const handleSelect = (optionId: string) => {
        if (!currentUserId) {
            window.location.href = '/login';
            return;
        }
        if (isClosed || isVoting) return;
        setSelectedOptionId(optionId);
    };

    const handleVoteSubmit = async () => {
        if (!currentUserId) {
            window.location.href = '/login';
            return;
        }
        if (!selectedOptionId || isClosed || isVoting) return;

        setIsVoting(true);

        // Optimistic UI update
        const updatedOptions = localPoll.options.map((opt) => {
            const alreadyVoted = opt.votes.includes(currentUserId);
            if (!localPoll.allowMultiple) {
                const cleanedVotes = opt.votes.filter((uid) => uid !== currentUserId);
                if (opt.id === selectedOptionId && !alreadyVoted) {
                    return { ...opt, votes: [...cleanedVotes, currentUserId] };
                }
                return { ...opt, votes: cleanedVotes };
            } else {
                if (opt.id === selectedOptionId) {
                    return {
                        ...opt,
                        votes: alreadyVoted
                            ? opt.votes.filter((uid) => uid !== currentUserId)
                            : [...opt.votes, currentUserId],
                    };
                }
                return opt;
            }
        });

        const newPollState = { ...localPoll, options: updatedOptions };
        setLocalPoll(newPollState);

        try {
            const res = await fetch('/api/social-media/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    optionId: selectedOptionId,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.poll) {
                    setLocalPoll(data.poll);
                    onVoteUpdated?.(data.poll);
                }
            } else {
                setLocalPoll(poll);
            }
        } catch (err) {
            console.error('Failed to submit vote:', err);
            setLocalPoll(poll);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className={`p-4 md:p-5 rounded-2xl bg-white border border-gray-100/90 shadow-xs space-y-4 ${className}`}>
            {/* Poll Header */}
            {localPoll.question && (
                <div className="space-y-1">
                    <h4 className="text-sm md:text-base font-bold text-gray-900 leading-snug">
                        {localPoll.question}
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                        {localPoll.allowMultiple ? 'Select one or more options' : 'Select one option'}
                    </p>
                </div>
            )}

            {/* Options List */}
            <div className="space-y-2.5">
                {localPoll.options.map((opt, idx) => {
                    const votesCount = opt.votes?.length || 0;
                    const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                    const isUserVotedThis = currentUserId ? opt.votes?.includes(currentUserId) : false;
                    const isLocallySelected = selectedOptionId === opt.id || isUserVotedThis;

                    return (
                        <div
                            key={opt.id}
                            onClick={() => !isRevealed && handleSelect(opt.id)}
                            className={`group relative p-3.5 rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                                isLocallySelected
                                    ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                                    : 'border-gray-200 hover:border-indigo-300 bg-gray-50/50 hover:bg-gray-50'
                            }`}
                        >
                            {/* Animated Background Progress Fill */}
                            {isRevealed && (
                                <div
                                    className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-l-xl pointer-events-none ${
                                        isUserVotedThis
                                            ? 'bg-indigo-200/50'
                                            : 'bg-indigo-100/35'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                />
                            )}

                            <div className="relative z-10 flex items-center justify-between gap-3">
                                {/* Radio/Checkbox Icon + Label */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                                            isLocallySelected
                                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                                : 'border-gray-300 group-hover:border-indigo-400 bg-white'
                                        }`}
                                    >
                                        {isLocallySelected ? (
                                            <Icon icon="solar:check-read-bold" width={12} />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-indigo-300 transition" />
                                        )}
                                    </div>

                                    <span
                                        className={`text-xs md:text-sm font-semibold truncate ${
                                            isLocallySelected ? 'text-indigo-950 font-bold' : 'text-gray-800'
                                        }`}
                                    >
                                        {opt.text}
                                    </span>
                                </div>

                                {/* Results percentage */}
                                {isRevealed && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-black text-indigo-600">
                                            {percentage}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Voter Avatars Stack & Count for Option (Revealed Mode) */}
                            {isRevealed && votesCount > 0 && (
                                <div className="relative z-10 flex items-center gap-2 mt-2 pt-2 border-t border-indigo-100/60 text-[11px] text-gray-500">
                                    <div className="flex -space-x-1.5 items-center">
                                        {SAMPLE_VOTER_AVATARS.slice(0, Math.min(3, votesCount)).map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                alt="Voter"
                                                className="w-4.5 h-4.5 rounded-full object-cover border-2 border-white shadow-xs"
                                            />
                                        ))}
                                    </div>
                                    <span className="font-semibold text-gray-600">
                                        {votesCount} {votesCount === 1 ? 'vote' : 'votes'}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Poll Action Bar Buttons (Vote Now / See Results) */}
            {!hasUserVoted && !isClosed && (
                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={handleVoteSubmit}
                        disabled={!selectedOptionId || isVoting}
                        className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isVoting ? (
                            <>
                                <Icon icon="line-md:loading-twotone-loop" width={16} />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:check-circle-bold" width={16} />
                                <span>Vote Now</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowResults(!showResults)}
                        className="px-4 py-2.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                        {showResults ? 'Hide Results' : 'See Results'}
                    </button>
                </div>
            )}

            {/* Footer Summary */}
            <div className="flex items-center justify-between pt-2 text-[11px] text-gray-400 font-medium border-t border-gray-100">
                <span>
                    {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
                {localPoll.expiresAt && !isClosed && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Icon icon="solar:clock-circle-bold" width={13} />
                        Active Poll
                    </span>
                )}
            </div>
        </div>
    );
}
