'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { GalleryModal } from '@/components/Gallery';

interface ProfileSettingsProps {
    user: {
        _id: string;
        name: string;
        slug: string;
        email?: string;
        image?: string;
        city?: string;
        state?: string;
    };
    info: Record<string, string>;
    onSaved?: () => void;
}

export default function ProfileSettings({ user, info, onSaved }: ProfileSettingsProps) {
    const [name, setName] = useState(user.name || '');
    const [image, setImage] = useState(user.image || '');
    const [coverPhoto, setCoverPhoto] = useState(info.cover_photo || '');
    const [bio, setBio] = useState(info.bio || '');

    // Location
    const [locationCity, setLocationCity] = useState(info.location_city || user.city || '');
    const [locationHometown, setLocationHometown] = useState(info.location_hometown || user.state || '');
    const [relationshipStatus, setRelationshipStatus] = useState(info.relationship_status || 'Single');

    // Work Info
    let initialWork: any[] = [];
    try {
        if (info.work_info) initialWork = JSON.parse(info.work_info);
    } catch {}
    const [workList, setWorkList] = useState<any[]>(
        initialWork.length > 0 ? initialWork : [{ company: '', position: '', city: '', isCurrent: true }]
    );

    // Education Info
    let initialEdu: any[] = [];
    try {
        if (info.education_info) initialEdu = JSON.parse(info.education_info);
    } catch {}
    const [educationList, setEducationList] = useState<any[]>(
        initialEdu.length > 0 ? initialEdu : [{ school: '', degree: '', field: '', graduationYear: '' }]
    );

    // Social Links
    let initialSocial: Record<string, string> = {};
    try {
        if (info.social_links) initialSocial = JSON.parse(info.social_links);
    } catch {}
    const [socialLinks, setSocialLinks] = useState({
        website: initialSocial.website || '',
        twitter: initialSocial.twitter || '',
        instagram: initialSocial.instagram || '',
        github: initialSocial.github || '',
        linkedin: initialSocial.linkedin || '',
        youtube: initialSocial.youtube || '',
    });

    const [showAvatarGallery, setShowAvatarGallery] = useState(false);
    const [showCoverGallery, setShowCoverGallery] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const res = await fetch('/api/social-media/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    image,
                    coverPhoto,
                    bio,
                    locationCity,
                    locationHometown,
                    relationshipStatus,
                    workInfo: workList.filter((w) => w.company || w.position),
                    educationInfo: educationList.filter((e) => e.school || e.degree),
                    socialLinks,
                }),
            });

            if (res.ok) {
                setSuccessMsg('Profile settings saved successfully!');
                onSaved?.();
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                const err = await res.json();
                setErrorMsg(err.error || 'Failed to save settings');
            }
        } catch (err) {
            setErrorMsg('An unexpected error occurred.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Icon icon="solar:settings-bold" className="text-indigo-600" width={22} />
                        Profile Settings
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        Manage your public profile information, images, career, and social handles.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                    {saving ? <Icon icon="line-md:loading-twotone-loop" width={16} /> : <Icon icon="solar:check-circle-bold" width={16} />}
                    <span>Save Changes</span>
                </button>
            </div>

            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <Icon icon="solar:check-circle-bold" width={18} className="text-emerald-600" />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <Icon icon="solar:close-circle-bold" width={18} className="text-rose-600" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* 1. Profile Visuals (Cover & Avatar) */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Icon icon="solar:camera-bold" className="text-indigo-600" width={16} />
                    Profile & Cover Photos
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Avatar Card */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                        {image ? (
                            <img src={image} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                                {name.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900">Profile Avatar</p>
                            <button
                                type="button"
                                onClick={() => setShowAvatarGallery(true)}
                                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-2xs transition"
                            >
                                Change Avatar
                            </button>
                        </div>
                    </div>

                    {/* Cover Card */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className="w-20 h-14 rounded-xl bg-gray-200 overflow-hidden border border-white shadow-sm">
                            {coverPhoto ? (
                                <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-400">
                                    <Icon icon="solar:gallery-wide-bold" width={20} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900">Cover Banner</p>
                            <button
                                type="button"
                                onClick={() => setShowCoverGallery(true)}
                                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-2xs transition"
                            >
                                Change Cover
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Basic Information & Bio */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Icon icon="solar:user-id-bold" className="text-indigo-600" width={16} />
                    Basic Details & Bio
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Relationship Status</label>
                        <select
                            value={relationshipStatus}
                            onChange={(e) => setRelationshipStatus(e.target.value)}
                            className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition"
                        >
                            <option value="Single">Single</option>
                            <option value="In a relationship">In a relationship</option>
                            <option value="Engaged">Engaged</option>
                            <option value="Married">Married</option>
                            <option value="It's complicated">It&apos;s complicated</option>
                        </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Short Bio / Headline</label>
                        <textarea
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell friends about yourself, your passions, or your headline..."
                            className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Places Lived */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Icon icon="solar:map-point-bold" className="text-indigo-600" width={16} />
                    Places Lived
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Current City</label>
                        <input
                            type="text"
                            placeholder="e.g. San Francisco, California"
                            value={locationCity}
                            onChange={(e) => setLocationCity(e.target.value)}
                            className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">Hometown</label>
                        <input
                            type="text"
                            placeholder="e.g. Austin, Texas"
                            value={locationHometown}
                            onChange={(e) => setLocationHometown(e.target.value)}
                            className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition"
                        />
                    </div>
                </div>
            </div>

            {/* 4. Career & Work Experience */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="solar:case-round-bold" className="text-indigo-600" width={16} />
                        Work Experience
                    </h4>
                    <button
                        type="button"
                        onClick={() => setWorkList([...workList, { company: '', position: '', city: '', isCurrent: true }])}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                        + Add Workplace
                    </button>
                </div>

                <div className="space-y-3">
                    {workList.map((job, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
                            <input
                                type="text"
                                placeholder="Position / Job Title"
                                value={job.position}
                                onChange={(e) => {
                                    const updated = [...workList];
                                    updated[idx].position = e.target.value;
                                    setWorkList(updated);
                                }}
                                className="text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Company Name"
                                value={job.company}
                                onChange={(e) => {
                                    const updated = [...workList];
                                    updated[idx].company = e.target.value;
                                    setWorkList(updated);
                                }}
                                className="text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="City / Location"
                                    value={job.city}
                                    onChange={(e) => {
                                        const updated = [...workList];
                                        updated[idx].city = e.target.value;
                                        setWorkList(updated);
                                    }}
                                    className="flex-1 text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                                />
                                {workList.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setWorkList(workList.filter((_, i) => i !== idx))}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. Education */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="solar:diploma-bold" className="text-indigo-600" width={16} />
                        Education
                    </h4>
                    <button
                        type="button"
                        onClick={() => setEducationList([...educationList, { school: '', degree: '', field: '', graduationYear: '' }])}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                        + Add Education
                    </button>
                </div>

                <div className="space-y-3">
                    {educationList.map((edu, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                            <input
                                type="text"
                                placeholder="School / University"
                                value={edu.school}
                                onChange={(e) => {
                                    const updated = [...educationList];
                                    updated[idx].school = e.target.value;
                                    setEducationList(updated);
                                }}
                                className="text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Degree (e.g. B.S.)"
                                value={edu.degree}
                                onChange={(e) => {
                                    const updated = [...educationList];
                                    updated[idx].degree = e.target.value;
                                    setEducationList(updated);
                                }}
                                className="text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Field of Study"
                                value={edu.field}
                                onChange={(e) => {
                                    const updated = [...educationList];
                                    updated[idx].field = e.target.value;
                                    setEducationList(updated);
                                }}
                                className="text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Grad Year"
                                    value={edu.graduationYear}
                                    onChange={(e) => {
                                        const updated = [...educationList];
                                        updated[idx].graduationYear = e.target.value;
                                        setEducationList(updated);
                                    }}
                                    className="flex-1 text-xs font-medium p-2.5 bg-white border border-gray-200 rounded-xl outline-none"
                                />
                                {educationList.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setEducationList(educationList.filter((_, i) => i !== idx))}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. Social Links */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Icon icon="solar:global-bold" className="text-indigo-600" width={16} />
                    Social Links & Websites
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['website', 'twitter', 'instagram', 'github', 'linkedin', 'youtube'].map((platform) => (
                        <div key={platform} className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 capitalize">{platform}</label>
                            <input
                                type="text"
                                placeholder={`https://${platform}.com/username`}
                                value={(socialLinks as any)[platform]}
                                onChange={(e) => setSocialLinks({ ...socialLinks, [platform]: e.target.value })}
                                className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Gallery Media Selectors */}
            {showCoverGallery && (
                <GalleryModal
                    isOpen={showCoverGallery}
                    multiple={false}
                    selectedImages={coverPhoto ? [coverPhoto] : []}
                    onSelect={(selected) => {
                        const url = Array.isArray(selected) ? selected[0] : selected;
                        if (url) {
                            setCoverPhoto(url);
                        }
                        setShowCoverGallery(false);
                    }}
                    onClose={() => setShowCoverGallery(false)}
                />
            )}

            {showAvatarGallery && (
                <GalleryModal
                    isOpen={showAvatarGallery}
                    multiple={false}
                    selectedImages={image ? [image] : []}
                    onSelect={(selected) => {
                        const url = Array.isArray(selected) ? selected[0] : selected;
                        if (url) {
                            setImage(url);
                        }
                        setShowAvatarGallery(false);
                    }}
                    onClose={() => setShowAvatarGallery(false)}
                />
            )}
        </form>
    );
}
