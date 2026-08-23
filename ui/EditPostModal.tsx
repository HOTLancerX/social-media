'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import Gallery from '@/components/Gallery';
import { BG_PRESETS } from './Text-BG';
import type { ISocialPostData, IBgStyle, IFeeling } from '../models/SocialMedia';

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

interface EditPostModalProps {
    isOpen: boolean;
    post: ISocialPostData;
    onClose: () => void;
    onPostUpdated: (updatedPost: ISocialPostData) => void;
}

export default function EditPostModal({
    isOpen,
    post,
    onClose,
    onPostUpdated,
}: EditPostModalProps) {
    const [content, setContent] = useState(post.content || '');
    const [privacy, setPrivacy] = useState<'public' | 'members' | 'private'>(post.privacy || 'public');
    const [images, setImages] = useState<string[]>(post.images || []);
    const [videos, setVideos] = useState<string[]>(post.videos || []);
    const [bgStyle, setBgStyle] = useState<IBgStyle>(post.bgStyle || BG_PRESETS[0]);
    const [feeling, setFeeling] = useState<IFeeling | null>(post.feeling || null);
    const [showFeelings, setShowFeelings] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');

        try {
            const res = await fetch(`/api/social-media/${post._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim(),
                    privacy,
                    images,
                    videos,
                    bgStyle: post.type === 'text-bg' ? bgStyle : null,
                    feeling,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                onPostUpdated(data.post || {
                    ...post,
                    content,
                    privacy,
                    images,
                    videos,
                    bgStyle: post.type === 'text-bg' ? bgStyle : null,
                    feeling,
                });
                onClose();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Failed to update post');
            }
        } catch (err) {
            setErrorMsg('Network error updating post');
        } finally {
            setSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-99999 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:pen-new-square-bold" className="text-indigo-600" width={20} />
                        Edit Post
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                    >
                        <Icon icon="solar:close-circle-bold" width={24} />
                    </button>
                </div>

                {errorMsg && (
                    <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                        {errorMsg}
                    </div>
                )}

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                    {/* User Info and Privacy Pill */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            {post.userImage ? (
                                <img src={post.userImage} alt={post.userName} className="w-10 h-10 rounded-full object-cover shadow-xs" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    {post.userName?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-gray-900">{post.userName}</p>
                                {feeling && (
                                    <p className="text-[11px] text-gray-500 font-medium">
                                        is {feeling.emoji} {feeling.text}
                                    </p>
                                )}
                            </div>
                        </div>

                        <select
                            value={privacy}
                            onChange={(e) => setPrivacy(e.target.value as any)}
                            className="text-xs font-bold text-gray-700 bg-gray-100 border-none rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                        >
                            <option value="public">🌐 Public</option>
                            <option value="members">👥 Members</option>
                            <option value="private">🔒 Only Me</option>
                        </select>
                    </div>

                    {/* Content Editor */}
                    {post.type === 'text-bg' ? (
                        <div className="space-y-3">
                            <div
                                className="w-full min-h-48 rounded-2xl p-6 flex items-center justify-center text-center shadow-inner relative"
                                style={{ background: bgStyle.gradient, color: bgStyle.textColor || '#ffffff' }}
                            >
                                <textarea
                                    rows={4}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-transparent text-center font-black text-xl resize-none outline-none drop-shadow-md placeholder-white/70"
                                    placeholder="What's on your mind?"
                                />
                            </div>

                            {/* BG Picker */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {BG_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => setBgStyle(preset)}
                                        className={`w-8 h-8 rounded-xl shrink-0 transition-transform ${
                                            bgStyle.id === preset.id
                                                ? 'ring-2 ring-indigo-600 scale-110 shadow-md'
                                                : 'hover:scale-105 opacity-80 hover:opacity-100'
                                        }`}
                                        style={{ background: preset.gradient }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <textarea
                            rows={4}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-2xl p-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none resize-none"
                            placeholder="What's on your mind?"
                        />
                    )}

                    {/* Image Attachments */}
                    {(post.type === 'image' || images.length > 0) && (
                        <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                            <label className="text-xs font-bold text-gray-700 mb-2 block">
                                Images Attached
                            </label>
                            <Gallery
                                multiple={true}
                                value={images}
                                onChange={(val) => {
                                    const arr = Array.isArray(val) ? val : [val].filter(Boolean);
                                    setImages(arr);
                                }}
                                placeholder="Add or manage images"
                            />
                        </div>
                    )}

                    {/* Video Attachment */}
                    {(post.type === 'video' || videos.length > 0) && (
                        <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                            <label className="text-xs font-bold text-gray-700 mb-2 block">
                                Video Attached
                            </label>
                            <Gallery
                                multiple={false}
                                value={videos[0] || ''}
                                onChange={(val) => {
                                    const vid = Array.isArray(val) ? val[0] : val;
                                    setVideos(vid ? [vid] : []);
                                }}
                                placeholder="Choose video"
                            />
                        </div>
                    )}

                    {/* Feeling Picker Selector */}
                    {showFeelings && (
                        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">How are you feeling?</p>
                            <div className="grid grid-cols-5 gap-2">
                                {FEELINGS_LIST.map((f) => (
                                    <button
                                        key={f.text}
                                        type="button"
                                        onClick={() => {
                                            setFeeling(feeling?.text === f.text ? null : f);
                                            setShowFeelings(false);
                                        }}
                                        className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition ${
                                            feeling?.text === f.text ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        <span className="text-lg">{f.emoji}</span>
                                        <span className="text-[10px] capitalize">{f.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setShowFeelings(!showFeelings)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1.5"
                        >
                            <Icon icon="solar:emoji-funny-circle-bold" width={18} className="text-amber-500" />
                            <span>{feeling ? feeling.text : 'Feeling'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                            >
                                {saving ? <Icon icon="line-md:loading-twotone-loop" width={16} /> : <Icon icon="solar:check-circle-bold" width={16} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
