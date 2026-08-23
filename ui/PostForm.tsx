'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import Gallery from '@/components/Gallery';
import { BG_PRESETS } from './Text-BG';
import type { PostType, IBgStyle, IFeeling } from '../models/SocialMedia';

const FEELINGS_LIST: IFeeling[] = [
    { emoji: '😊', text: 'happy' },
    { emoji: '🥰', text: 'loved' },
    { emoji: '🤩', text: 'excited' },
    { emoji: '😇', text: 'blessed' },
    { emoji: '🎉', text: 'celebrating' },
    { emoji: '😎', text: 'cool' },
    { emoji: '🤔', text: 'thinking' },
    { emoji: '😴', text: 'tired' },
    { emoji: '💪', text: 'motivated' },
    { emoji: '❤️', text: 'in love' },
];

interface PostFormProps {
    currentUser?: {
        _id: string;
        name: string;
        image?: string;
        type?: string;
    } | null;
    onPostCreated?: (newPost: any) => void;
    className?: string;
}

export default function PostForm({
    currentUser,
    onPostCreated,
    className = '',
}: PostFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [postType, setPostType] = useState<PostType>('text');
    const [content, setContent] = useState('');
    const [bgStyle, setBgStyle] = useState<IBgStyle>(BG_PRESETS[0]);
    const [images, setImages] = useState<string[]>([]);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [privacy, setPrivacy] = useState<'public' | 'members' | 'private'>('public');
    const [selectedFeeling, setSelectedFeeling] = useState<IFeeling | null>(null);
    const [showFeelingsPicker, setShowFeelingsPicker] = useState(false);

    // Poll State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
    const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
    const [pollDurationDays, setPollDurationDays] = useState(7);

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const openModalWithType = (type: PostType) => {
        if (!currentUser?._id) {
            window.location.href = '/login';
            return;
        }
        setPostType(type);
        setIsOpen(true);
        setErrorMsg('');
    };

    if (!currentUser?._id) {
        return (
            <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Icon icon="solar:chat-round-dots-bold" width={22} />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-900">Join the conversation</p>
                        <p className="text-[11px] sm:text-xs text-gray-500">Log in to create posts, share photos, and interact with the community.</p>
                    </div>
                </div>
                <a
                    href="/login"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                    <Icon icon="solar:login-2-bold" width={16} />
                    <span>Log In to Post</span>
                </a>
            </div>
        );
    }

    const handleAddPollOption = () => {
        if (pollOptions.length < 6) {
            setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
        }
    };

    const handleRemovePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, idx) => idx !== index));
        }
    };

    const handlePollOptionChange = (index: number, val: string) => {
        const updated = [...pollOptions];
        updated[index] = val;
        setPollOptions(updated);
    };

    const resetForm = () => {
        setContent('');
        setBgStyle(BG_PRESETS[0]);
        setImages([]);
        setVideoUrl('');
        setSelectedFeeling(null);
        setPollQuestion('');
        setPollOptions(['Option 1', 'Option 2']);
        setPollAllowMultiple(false);
        setPostType('text');
        setIsOpen(false);
        setErrorMsg('');
    };

    const handleSubmit = async () => {
        setErrorMsg('');

        // Basic validation
        if (postType === 'text' && !content.trim()) {
            setErrorMsg('Please write some content for your post.');
            return;
        }

        if (postType === 'text-bg' && !content.trim()) {
            setErrorMsg('Please write your status text.');
            return;
        }

        if (postType === 'image' && images.length === 0) {
            setErrorMsg('Please select at least one photo.');
            return;
        }

        if (postType === 'video' && !videoUrl) {
            setErrorMsg('Please select a video.');
            return;
        }

        if (postType === 'poll') {
            if (!pollQuestion.trim()) {
                setErrorMsg('Please enter a poll question.');
                return;
            }
            if (pollOptions.some((opt) => !opt.trim())) {
                setErrorMsg('Please fill in all poll options.');
                return;
            }
        }

        setSubmitting(true);

        const pollExpiry = new Date();
        pollExpiry.setDate(pollExpiry.getDate() + pollDurationDays);

        const payload = {
            type: postType,
            content: content.trim(),
            bgStyle: postType === 'text-bg' ? bgStyle : null,
            images: postType === 'image' ? images : [],
            videos: postType === 'video' && videoUrl ? [videoUrl] : [],
            poll:
                postType === 'poll'
                    ? {
                          question: pollQuestion.trim(),
                          options: pollOptions.map((opt, i) => ({
                              id: `opt_${i + 1}_${Date.now()}`,
                              text: opt.trim(),
                              votes: [],
                          })),
                          allowMultiple: pollAllowMultiple,
                          expiresAt: pollExpiry.toISOString(),
                      }
                    : null,
            privacy,
            feeling: selectedFeeling,
        };

        try {
            const res = await fetch('/api/social-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.post) {
                    onPostCreated?.(data.post);
                    resetForm();
                }
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Failed to publish post');
            }
        } catch (err: any) {
            console.error('Post creation error:', err);
            setErrorMsg('An unexpected error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* Top Composer Card (Matches Image UI) */}
            <div className={`bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden ${className}`}>
                {/* 1. Header Tabs: Publish | Albums | Poll */}
                <div className="flex items-center border-b border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={() => setPostType('text')}
                        className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer relative ${
                            postType === 'text' || postType === 'text-bg'
                                ? 'text-blue-600 bg-white'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon icon="solar:pen-new-square-bold" width={18} />
                        <span>Publish</span>
                        {(postType === 'text' || postType === 'text-bg') && (
                            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => openModalWithType('image')}
                        className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer relative ${
                            postType === 'image'
                                ? 'text-blue-600 bg-white'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon icon="solar:gallery-wide-bold" width={18} />
                        <span>Albums</span>
                        {postType === 'image' && (
                            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => openModalWithType('poll')}
                        className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer relative ${
                            postType === 'poll'
                                ? 'text-blue-600 bg-white'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon icon="solar:chart-square-bold" width={18} />
                        <span>Poll</span>
                        {postType === 'poll' && (
                            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                </div>

                {/* 2. Composer Body */}
                <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        {currentUser?.image ? (
                            <img
                                src={currentUser.image}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0 mt-1"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 mt-1 shadow-xs">
                                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}

                        <textarea
                            rows={3}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`Write something here, ${currentUser?.name || ''}...`}
                            className="w-full text-xs md:text-sm text-gray-800 placeholder-gray-400 bg-transparent border-0 outline-none resize-none pt-2"
                        />
                    </div>

                    {/* Selected Image/Video Thumbnails Preview */}
                    {images.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto py-2">
                            {images.map((img, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                                    <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                        className="absolute top-1 right-1 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center text-[10px]"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Bottom Toolbar */}
                <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => openModalWithType('text')}
                            title="Add feeling / emoji"
                            className="p-2 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        >
                            <Icon icon="solar:emoji-funny-circle-bold" width={20} className="text-amber-500" />
                        </button>

                        <button
                            type="button"
                            onClick={() => openModalWithType('image')}
                            title="Upload photo"
                            className="p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                        >
                            <Icon icon="solar:gallery-wide-bold" width={20} className="text-emerald-500" />
                        </button>

                        <button
                            type="button"
                            onClick={() => openModalWithType('video')}
                            title="Add video"
                            className="p-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                            <Icon icon="solar:videocamera-record-bold" width={20} className="text-rose-500" />
                        </button>

                        <button
                            type="button"
                            onClick={() => openModalWithType('text-bg')}
                            title="Colorful card"
                            className="p-2 rounded-xl text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                        >
                            <Icon icon="solar:pallete-2-bold" width={20} className="text-violet-500" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={privacy}
                            onChange={(e) => setPrivacy(e.target.value as any)}
                            className="text-[11px] font-semibold bg-white text-gray-700 rounded-xl px-2.5 py-1.5 border border-gray-200 outline-none cursor-pointer"
                        >
                            <option value="public">🌐 Public</option>
                            <option value="members">👥 Members</option>
                            <option value="private">🔒 Private</option>
                        </select>

                        <button
                            type="button"
                            onClick={content.trim() || images.length > 0 || videoUrl ? handleSubmit : () => openModalWithType('text')}
                            disabled={submitting}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting ? (
                                <Icon icon="line-md:loading-twotone-loop" width={16} />
                            ) : (
                                <Icon icon="solar:plain-bold" width={16} />
                            )}
                            <span>Post</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Facebook Post Composer Modal */}
            {isOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                        <div
                            className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 text-base">Create Post</h3>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                                >
                                    <Icon icon="solar:close-circle-bold" width={24} />
                                </button>
                            </div>

                            {/* User Info + Audience Selector */}
                            <div className="p-4 flex items-center justify-between border-b border-gray-50">
                                <div className="flex items-center gap-3">
                                    {currentUser?.image ? (
                                        <img
                                            src={currentUser.image}
                                            alt="Avatar"
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                                            {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                            {currentUser?.name || 'Guest User'}
                                            {selectedFeeling && (
                                                <span className="text-xs text-gray-500 font-normal">
                                                    is {selectedFeeling.emoji} {selectedFeeling.text}
                                                </span>
                                            )}
                                        </h4>

                                        {/* Privacy Selector */}
                                        <select
                                            value={privacy}
                                            onChange={(e) => setPrivacy(e.target.value as any)}
                                            className="mt-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-lg px-2 py-0.5 border border-transparent focus:border-blue-400 outline-none cursor-pointer"
                                        >
                                            <option value="public">🌐 Public</option>
                                            <option value="members">👥 Members Only</option>
                                            <option value="private">🔒 Only Me</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Post Type Switcher Pill */}
                                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                                    {(['text', 'text-bg', 'image', 'video', 'poll'] as PostType[]).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setPostType(t)}
                                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                                                postType === t
                                                    ? 'bg-white text-blue-600 shadow-xs'
                                                    : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                            title={t.toUpperCase()}
                                        >
                                            {t === 'text' && <Icon icon="solar:text-bold" width={16} />}
                                            {t === 'text-bg' && <Icon icon="solar:pallete-2-bold" width={16} />}
                                            {t === 'image' && <Icon icon="solar:gallery-wide-bold" width={16} />}
                                            {t === 'video' && <Icon icon="solar:videocamera-record-bold" width={16} />}
                                            {t === 'poll' && <Icon icon="solar:chart-square-bold" width={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Body Container */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {errorMsg && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                                        <Icon icon="solar:danger-circle-bold" width={18} className="shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* TYPE 1: Plain Text Post */}
                                {postType === 'text' && (
                                    <textarea
                                        autoFocus
                                        rows={5}
                                        placeholder={`What's on your mind, ${currentUser?.name || 'friend'}?`}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full text-sm text-gray-800 placeholder-gray-400 border-none resize-none focus:ring-0 outline-none"
                                    />
                                )}

                                {/* TYPE 2: Colorful Background Card */}
                                {postType === 'text-bg' && (
                                    <div className="space-y-4">
                                        {/* Live Preview Card Box */}
                                        <div
                                            className="w-full min-h-55 flex items-center justify-center p-6 text-center rounded-2xl shadow-inner relative overflow-hidden transition-all duration-300"
                                            style={{
                                                background: bgStyle.gradient,
                                                color: bgStyle.textColor,
                                            }}
                                        >
                                            <textarea
                                                autoFocus
                                                rows={4}
                                                placeholder="Write something colorful..."
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                className="w-full bg-transparent text-center font-black text-xl md:text-2xl placeholder-white/70 border-none resize-none focus:ring-0 outline-none leading-snug drop-shadow-sm"
                                                style={{ color: bgStyle.textColor }}
                                            />
                                        </div>

                                        {/* Background Swatches Picker */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 mb-2 block">
                                                Choose Theme Background
                                            </label>
                                            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                                {BG_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.id}
                                                        type="button"
                                                        onClick={() => setBgStyle(preset)}
                                                        className={`w-9 h-9 rounded-xl shrink-0 transition-transform ${
                                                            bgStyle.id === preset.id
                                                                ? 'ring-2 ring-blue-600 scale-110 shadow-md'
                                                                : 'hover:scale-105 opacity-85 hover:opacity-100'
                                                        }`}
                                                        style={{ background: preset.gradient }}
                                                        title={preset.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TYPE 3: Photos (Multiple via Gallery.tsx) */}
                                {postType === 'image' && (
                                    <div className="space-y-3">
                                        <textarea
                                            rows={2}
                                            placeholder="Say something about these photos..."
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full text-sm text-gray-800 placeholder-gray-400 border-none resize-none focus:ring-0 outline-none"
                                        />

                                        <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                                            <label className="text-xs font-bold text-gray-700 mb-2 block">
                                                Attach Images
                                            </label>
                                            <Gallery
                                                multiple={true}
                                                value={images}
                                                onChange={(val) => {
                                                    const imgArray = Array.isArray(val) ? val : [val].filter(Boolean);
                                                    setImages(imgArray);
                                                }}
                                                placeholder="Choose images from gallery or upload"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TYPE 4: Video (Single via Gallery.tsx) */}
                                {postType === 'video' && (
                                    <div className="space-y-3">
                                        <textarea
                                            rows={2}
                                            placeholder="Say something about this video..."
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full text-sm text-gray-800 placeholder-gray-400 border-none resize-none focus:ring-0 outline-none"
                                        />

                                        <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                                            <label className="text-xs font-bold text-gray-700 mb-2 block">
                                                Attach Video
                                            </label>
                                            <Gallery
                                                multiple={false}
                                                value={videoUrl}
                                                onChange={(val) => {
                                                    const vid = Array.isArray(val) ? val[0] : val;
                                                    setVideoUrl(vid || '');
                                                }}
                                                placeholder="Choose video from library or upload"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* TYPE 5: Poll Builder */}
                                {postType === 'poll' && (
                                    <div className="space-y-4">
                                        <textarea
                                            rows={2}
                                            placeholder="Add an optional status message..."
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full text-sm text-gray-800 placeholder-gray-400 border-none resize-none focus:ring-0 outline-none"
                                        />

                                        <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/30 space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-gray-800 mb-1 block">
                                                    Ask a Question
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Which design do you prefer?"
                                                    value={pollQuestion}
                                                    onChange={(e) => setPollQuestion(e.target.value)}
                                                    className="w-full bg-white border border-gray-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-700 block">
                                                    Options ({pollOptions.length}/6)
                                                </label>
                                                {pollOptions.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) =>
                                                                handlePollOptionChange(idx, e.target.value)
                                                            }
                                                            placeholder={`Option ${idx + 1}`}
                                                            className="flex-1 bg-white border border-gray-200 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                                                        />
                                                        {pollOptions.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePollOption(idx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 transition"
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {pollOptions.length < 6 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddPollOption}
                                                        className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                    >
                                                        <Icon icon="solar:add-circle-bold" width={16} />
                                                        Add Option
                                                    </button>
                                                )}
                                            </div>

                                            {/* Settings */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                                                <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={pollAllowMultiple}
                                                        onChange={(e) => setPollAllowMultiple(e.target.checked)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    Allow multiple choices
                                                </label>

                                                <select
                                                    value={pollDurationDays}
                                                    onChange={(e) => setPollDurationDays(parseInt(e.target.value, 10))}
                                                    className="bg-white border border-gray-200 text-xs rounded-lg px-2 py-1 outline-none"
                                                >
                                                    <option value={1}>1 day</option>
                                                    <option value={3}>3 days</option>
                                                    <option value={7}>1 week</option>
                                                    <option value={30}>1 month</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Feeling / Activity Selector Popup */}
                                {showFeelingsPicker && (
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 animate-in fade-in">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-gray-700">
                                                How are you feeling?
                                            </span>
                                            {selectedFeeling && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFeeling(null)}
                                                    className="text-[11px] text-red-500 hover:underline"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {FEELINGS_LIST.map((f) => (
                                                <button
                                                    key={f.text}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFeeling(f);
                                                        setShowFeelingsPicker(false);
                                                    }}
                                                    className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition ${
                                                        selectedFeeling?.text === f.text
                                                            ? 'bg-blue-100 text-blue-700 font-bold'
                                                            : 'bg-white hover:bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    <span className="text-xl">{f.emoji}</span>
                                                    <span className="text-[10px] capitalize">{f.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Bottom Action Bar */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setShowFeelingsPicker(!showFeelingsPicker)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                                        selectedFeeling
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'text-gray-600 hover:bg-gray-200/70'
                                    }`}
                                >
                                    <Icon icon="solar:emoji-funny-circle-bold" width={18} className="text-amber-500" />
                                    <span>{selectedFeeling ? selectedFeeling.text : 'Feeling'}</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {submitting ? (
                                            <>
                                                <Icon icon="line-md:loading-twotone-loop" width={16} />
                                                Publishing...
                                            </>
                                        ) : (
                                            'Publish Post'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
