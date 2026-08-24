'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import HexAvatar from './HexAvatar';
import type { IPollData, IPollVoter } from '../models/SocialMedia';

interface PollPostProps {
    postId: string;
    poll: IPollData;
    currentUserId?: string;
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
    onVoteUpdated?: (updatedPoll: IPollData) => void;
    className?: string;
}

export default function PollPost({
    postId,
    poll,
    currentUserId = '',
    currentUser = null,
    onVoteUpdated,
    className = '',
}: PollPostProps) {
    const [localPoll, setLocalPoll] = useState<IPollData>(poll);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [showResults, setShowResults] = useState<boolean>(false);
    const [isVoting, setIsVoting] = useState(false);

    // Voters Breakdown Modal State
    const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
    const [activeOptionTab, setActiveOptionTab] = useState<string>('all');
    const [detailedVoters, setDetailedVoters] = useState<{
        options: Array<{
            id: string;
            text: string;
            votesCount: number;
            voters: Array<{
                userId: string;
                userName: string;
                userImage: string;
                userSlug: string;
                isFriend?: boolean;
                isSelf?: boolean;
            }>;
        }>;
        totalVotes: number;
    } | null>(null);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setLocalPoll(poll);
    }, [poll]);

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

        const currentVoterObj: IPollVoter = {
            userId: String(currentUserId),
            userName: currentUser?.name || 'You',
            userImage: currentUser?.image || '',
            userSlug: '',
        };

        // Optimistic UI update with real voter photo
        const updatedOptions = localPoll.options.map((opt) => {
            const alreadyVoted = opt.votes.includes(currentUserId);
            const currentVoters = opt.voters || [];

            if (!localPoll.allowMultiple) {
                const cleanedVotes = opt.votes.filter((uid) => uid !== currentUserId);
                const cleanedVoters = currentVoters.filter((v) => String(v.userId) !== String(currentUserId));

                if (opt.id === selectedOptionId && !alreadyVoted) {
                    return {
                        ...opt,
                        votes: [...cleanedVotes, currentUserId],
                        voters: [...cleanedVoters, currentVoterObj],
                    };
                }
                return { ...opt, votes: cleanedVotes, voters: cleanedVoters };
            } else {
                if (opt.id === selectedOptionId) {
                    return {
                        ...opt,
                        votes: alreadyVoted
                            ? opt.votes.filter((uid) => uid !== currentUserId)
                            : [...opt.votes, currentUserId],
                        voters: alreadyVoted
                            ? currentVoters.filter((v) => String(v.userId) !== String(currentUserId))
                            : [...currentVoters, currentVoterObj],
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

    const openVotersModal = async (targetOptId: string = 'all') => {
        setIsVotersModalOpen(true);
        setActiveOptionTab(targetOptId);
        setLoadingVoters(true);

        try {
            const res = await fetch(`/api/social-media/poll?postId=${postId}`);
            if (res.ok) {
                const data = await res.json();
                setDetailedVoters(data);
            }
        } catch (err) {
            console.error('Failed to fetch voters:', err);
        } finally {
            setLoadingVoters(false);
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
                {localPoll.options.map((opt) => {
                    const votesCount = opt.votes?.length || 0;
                    const percentage = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                    const isUserVotedThis = currentUserId ? opt.votes?.includes(currentUserId) : false;
                    const isLocallySelected = selectedOptionId === opt.id || isUserVotedThis;

                    // Compute real voters list for this option
                    const votersList: IPollVoter[] = [];
                    if (opt.voters && opt.voters.length > 0) {
                        votersList.push(...opt.voters);
                    } else if (opt.votes && opt.votes.length > 0) {
                        opt.votes.forEach((uid) => {
                            if (currentUserId && uid === currentUserId && currentUser) {
                                votersList.push({
                                    userId: uid,
                                    userName: currentUser.name || 'You',
                                    userImage: currentUser.image || '',
                                });
                            } else {
                                votersList.push({
                                    userId: uid,
                                    userName: 'Member',
                                    userImage: '',
                                });
                            }
                        });
                    }

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

                            {/* Real Voter Avatars Stack for Option (Revealed Mode) */}
                            {isRevealed && votesCount > 0 && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openVotersModal(opt.id);
                                    }}
                                    className="relative z-10 flex items-center gap-2 mt-2 pt-2 border-t border-indigo-100/60 text-[11px] text-gray-500 hover:text-indigo-600 transition"
                                >
                                    <div className="flex -space-x-2 items-center">
                                        {votersList.slice(0, 4).map((voter, i) => (
                                            <div
                                                key={voter.userId || i}
                                                className="w-5.5 h-5.5 rounded-full overflow-hidden border-2 border-white bg-indigo-100 shadow-2xs shrink-0"
                                                title={voter.userName}
                                            >
                                                {voter.userImage ? (
                                                    <img
                                                        src={voter.userImage}
                                                        alt={voter.userName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                                        {voter.userName?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="font-semibold text-gray-700 hover:underline">
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
                <button
                    type="button"
                    onClick={() => openVotersModal('all')}
                    className="hover:text-indigo-600 hover:underline cursor-pointer flex items-center gap-1.5"
                >
                    <Icon icon="solar:users-group-rounded-bold" width={14} className="text-gray-400" />
                    <span>
                        {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                    </span>
                </button>
                {localPoll.expiresAt && !isClosed && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Icon icon="solar:clock-circle-bold" width={13} />
                        Active Poll
                    </span>
                )}
            </div>

            {/* ═════════════════════════════════════════════════════════════
                Real Voters Breakdown Modal (Matches Likes Modal)
               ═════════════════════════════════════════════════════════════ */}
            {isVotersModalOpen &&
                mounted &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
                            {/* Modal Header */}
                            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:check-circle-bold" className="text-indigo-600" width={20} />
                                    <h3 className="text-sm font-bold text-gray-900">Poll Voters</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsVotersModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 text-gray-500 flex items-center justify-center transition border border-gray-200/80 cursor-pointer"
                                >
                                    <Icon icon="solar:close-circle-bold" width={18} />
                                </button>
                            </div>

                            {/* Option Tabs */}
                            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 overflow-x-auto no-scrollbar bg-gray-50/40">
                                <button
                                    type="button"
                                    onClick={() => setActiveOptionTab('all')}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                        activeOptionTab === 'all'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200/70'
                                    }`}
                                >
                                    <span>All</span>
                                    <span>({totalVotes})</span>
                                </button>

                                {localPoll.options.map((opt) => {
                                    const optVotesCount = opt.votes?.length || 0;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setActiveOptionTab(opt.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                                activeOptionTab === opt.id
                                                    ? 'bg-indigo-600 text-white shadow-xs'
                                                    : 'text-gray-600 hover:bg-gray-200/70'
                                            }`}
                                        >
                                            <span className="truncate max-w-30">{opt.text}</span>
                                            <span className="text-[10px] opacity-80">({optVotesCount})</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Voters List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
                                {loadingVoters ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Icon icon="line-md:loading-twotone-loop" width={32} className="text-indigo-500" />
                                        <span className="text-xs font-bold">Loading voters...</span>
                                    </div>
                                ) : (() => {
                                    const activeOption = detailedVoters?.options?.find((o) => o.id === activeOptionTab);
                                    const votersToRender =
                                        activeOptionTab === 'all'
                                            ? (detailedVoters?.options || []).flatMap((o) =>
                                                  o.voters.map((v) => ({ ...v, optionText: o.text }))
                                              )
                                            : (activeOption?.voters || []).map((v) => ({
                                                  ...v,
                                                  optionText: activeOption?.text || '',
                                              }));

                                    if (!votersToRender || votersToRender.length === 0) {
                                        return (
                                            <div className="py-12 text-center text-gray-400 text-xs font-medium">
                                                No votes in this category yet.
                                            </div>
                                        );
                                    }

                                    return votersToRender.map((item, idx) => (
                                        <div
                                            key={`${item.userId}-${idx}`}
                                            className="flex items-center justify-between pt-3 first:pt-0 gap-3"
                                        >
                                            <Link
                                                href={`/${item.userSlug || item.userId}`}
                                                onClick={() => setIsVotersModalOpen(false)}
                                                className="flex items-center gap-3 min-w-0 group flex-1"
                                            >
                                                <div className="relative shrink-0">
                                                    {item.userImage ? (
                                                        <img
                                                            src={item.userImage}
                                                            alt={item.userName}
                                                            className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition border border-gray-100"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                                            {item.userName?.charAt(0)?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 truncate transition">
                                                            {item.userName}
                                                        </h4>
                                                        {item.isSelf && (
                                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-200">
                                                                You
                                                            </span>
                                                        )}
                                                        {item.isFriend && (
                                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-200">
                                                                Friend
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        Voted: <span className="text-gray-600 font-semibold">{item.optionText}</span>
                                                    </p>
                                                </div>
                                            </Link>

                                            <Link
                                                href={`/${item.userSlug || item.userId}`}
                                                onClick={() => setIsVotersModalOpen(false)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 text-xs font-bold rounded-xl transition shrink-0"
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
