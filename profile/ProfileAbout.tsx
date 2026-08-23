'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

interface ProfileAboutProps {
    user: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
        createdAt?: string;
    };
    info: Record<string, string>;
    isOwner?: boolean;
    onEditSettings?: () => void;
}

export default function ProfileAbout({
    user,
    info,
    isOwner = false,
    onEditSettings,
}: ProfileAboutProps) {
    const [subTab, setSubTab] = useState<'overview' | 'work' | 'places' | 'contact' | 'social'>('overview');

    let workList: any[] = [];
    try {
        if (info.work_info) workList = JSON.parse(info.work_info);
    } catch {}

    let educationList: any[] = [];
    try {
        if (info.education_info) educationList = JSON.parse(info.education_info);
    } catch {}

    let socialLinks: Record<string, string> = {};
    try {
        if (info.social_links) socialLinks = JSON.parse(info.social_links);
    } catch {}

    const city = info.location_city || user.city || '';
    const hometown = info.location_hometown || user.state || '';
    const relationshipStatus = info.relationship_status || 'Single';

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-3">
            {/* Left Nav */}
            <div className="p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 space-y-1">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider px-3 mb-3">
                    About Sections
                </h3>

                {[
                    { id: 'overview', label: 'Overview', icon: 'solar:user-id-bold' },
                    { id: 'work', label: 'Work & Education', icon: 'solar:case-round-bold' },
                    { id: 'places', label: 'Places Lived', icon: 'solar:map-point-bold' },
                    { id: 'contact', label: 'Contact & Basic Info', icon: 'solar:phone-calling-rounded-bold' },
                    { id: 'social', label: 'Social & Websites', icon: 'solar:global-bold' },
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSubTab(item.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                            subTab === item.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        <Icon icon={item.icon} width={18} />
                        <span>{item.label}</span>
                    </button>
                ))}

                {isOwner && onEditSettings && (
                    <div className="pt-4 mt-4 border-t border-gray-200/60">
                        <button
                            type="button"
                            onClick={onEditSettings}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-indigo-50 border border-gray-200 text-indigo-600 rounded-xl text-xs font-bold shadow-xs transition"
                        >
                            <Icon icon="solar:pen-new-square-bold" width={16} />
                            <span>Edit All Details</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Right Content */}
            <div className="p-6 md:p-8 md:col-span-2 space-y-6">
                {/* 1. Overview */}
                {subTab === 'overview' && (
                    <div className="space-y-5">
                        <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <Icon icon="solar:user-id-bold" className="text-indigo-600" width={20} />
                            Overview
                        </h4>

                        <div className="space-y-4">
                            {workList.length > 0 ? (
                                <div className="flex items-start gap-3 text-xs text-gray-700">
                                    <Icon icon="solar:case-round-bold" width={20} className="text-gray-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-gray-900">{workList[0].position} at <span className="text-indigo-600">{workList[0].company}</span></p>
                                        <p className="text-gray-400">{workList[0].city || 'Active Job'}</p>
                                    </div>
                                </div>
                            ) : null}

                            {educationList.length > 0 ? (
                                <div className="flex items-start gap-3 text-xs text-gray-700">
                                    <Icon icon="solar:diploma-bold" width={20} className="text-gray-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-gray-900">Studied {educationList[0].degree || 'at'} <span className="text-indigo-600">{educationList[0].school}</span></p>
                                        <p className="text-gray-400">{educationList[0].graduationYear ? `Class of ${educationList[0].graduationYear}` : ''}</p>
                                    </div>
                                </div>
                            ) : null}

                            {city ? (
                                <div className="flex items-center gap-3 text-xs text-gray-700">
                                    <Icon icon="solar:map-point-bold" width={20} className="text-gray-400 shrink-0" />
                                    <span>Lives in <strong className="text-gray-900">{city}</strong></span>
                                </div>
                            ) : null}

                            {hometown ? (
                                <div className="flex items-center gap-3 text-xs text-gray-700">
                                    <Icon icon="solar:home-bold" width={20} className="text-gray-400 shrink-0" />
                                    <span>From <strong className="text-gray-900">{hometown}</strong></span>
                                </div>
                            ) : null}

                            <div className="flex items-center gap-3 text-xs text-gray-700">
                                <Icon icon="solar:heart-bold" width={20} className="text-rose-500 shrink-0" />
                                <span>Relationship: <strong className="text-gray-900">{relationshipStatus}</strong></span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-700">
                                <Icon icon="solar:calendar-bold" width={20} className="text-gray-400 shrink-0" />
                                <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Work & Education */}
                {subTab === 'work' && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Icon icon="solar:case-round-bold" className="text-indigo-600" width={18} />
                                Work Experience
                            </h4>
                            {workList.length > 0 ? (
                                <div className="space-y-3">
                                    {workList.map((job, idx) => (
                                        <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Icon icon="solar:case-round-bold" width={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs text-gray-900">{job.position || 'Position'} at {job.company || 'Company'}</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{job.city} • {job.isCurrent ? 'Present' : 'Past'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No workplace added yet.</p>
                            )}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Icon icon="solar:diploma-bold" className="text-indigo-600" width={18} />
                                Education
                            </h4>
                            {educationList.length > 0 ? (
                                <div className="space-y-3">
                                    {educationList.map((edu, idx) => (
                                        <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                <Icon icon="solar:diploma-bold" width={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs text-gray-900">{edu.degree || 'Degree'} at {edu.school || 'School'}</p>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{edu.field ? `${edu.field} • ` : ''}{edu.graduationYear ? `Class of ${edu.graduationYear}` : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 italic">No education details added yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Places Lived */}
                {subTab === 'places' && (
                    <div className="space-y-4">
                        <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <Icon icon="solar:map-point-bold" className="text-indigo-600" width={20} />
                            Places Lived
                        </h4>

                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                <Icon icon="solar:city-bold" className="text-indigo-500" width={24} />
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Current City</p>
                                    <p className="text-xs text-gray-600 font-medium">{city || 'Not specified'}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                <Icon icon="solar:home-smile-bold" className="text-amber-500" width={24} />
                                <div>
                                    <p className="text-xs font-bold text-gray-900">Hometown</p>
                                    <p className="text-xs text-gray-600 font-medium">{hometown || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Contact & Basic Info */}
                {subTab === 'contact' && (
                    <div className="space-y-4">
                        <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <Icon icon="solar:phone-calling-rounded-bold" className="text-indigo-600" width={20} />
                            Contact & Basic Info
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {user.email && (
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="font-bold text-gray-400 text-[11px] uppercase">Email</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{user.email}</p>
                                </div>
                            )}

                            {user.phone && (
                                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="font-bold text-gray-400 text-[11px] uppercase">Phone</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{user.phone}</p>
                                </div>
                            )}

                            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="font-bold text-gray-400 text-[11px] uppercase">Relationship</p>
                                <p className="font-bold text-gray-900 mt-0.5">{relationshipStatus}</p>
                            </div>

                            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="font-bold text-gray-400 text-[11px] uppercase">Member Since</p>
                                <p className="font-bold text-gray-900 mt-0.5">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Social & Websites */}
                {subTab === 'social' && (
                    <div className="space-y-4">
                        <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <Icon icon="solar:global-bold" className="text-indigo-600" width={20} />
                            Social Profiles & Websites
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(socialLinks).filter(([_, url]) => Boolean(url)).map(([platform, url]) => (
                                <a
                                    key={platform}
                                    href={url.startsWith('http') ? url : `https://${url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3.5 bg-gray-50 hover:bg-indigo-50/50 rounded-2xl border border-gray-100 flex items-center justify-between transition group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon
                                            icon={
                                                platform === 'twitter'
                                                    ? 'ri:twitter-x-fill'
                                                    : platform === 'github'
                                                    ? 'ri:github-fill'
                                                    : platform === 'instagram'
                                                    ? 'ri:instagram-fill'
                                                    : platform === 'linkedin'
                                                    ? 'ri:linkedin-fill'
                                                    : platform === 'youtube'
                                                    ? 'ri:youtube-fill'
                                                    : 'solar:global-bold'
                                            }
                                            width={20}
                                            className="text-gray-700 group-hover:text-indigo-600 shrink-0"
                                        />
                                        <span className="text-xs font-bold text-gray-800 capitalize truncate">{platform}</span>
                                    </div>
                                    <Icon icon="solar:arrow-right-up-linear" width={16} className="text-gray-400 group-hover:text-indigo-600" />
                                </a>
                            ))}

                            {Object.keys(socialLinks).length === 0 && (
                                <p className="text-xs text-gray-400 italic col-span-2">No social links added yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
