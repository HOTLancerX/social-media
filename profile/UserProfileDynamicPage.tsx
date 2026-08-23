'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserProfilePage from './UserProfilePage';
import { Icon } from '@iconify/react';
import type { ProfileTab } from './ProfileHeader';

interface UserProfileDynamicPageProps {
    data?: any;
    settings?: Record<string, any>;
    permalinkMap?: Record<string, string>;
    pageData?: any;
}

export default function UserProfileDynamicPage({
    data: serverUserDoc,
    pageData: initialPageData,
    settings,
}: UserProfileDynamicPageProps) {
    const pathname = usePathname() || '';
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    const [profileData, setProfileData] = useState<any>(initialPageData || null);
    const [loading, setLoading] = useState(!initialPageData);
    const [error, setError] = useState<string | null>(null);

    // Extract username and sub-tab from pathname (e.g. /khan, /khan/friends, /user/khan, /profile/khan/photos)
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

    let targetUsername = serverUserDoc?.slug || '';
    let tabFromUrl: ProfileTab = 'posts';

    if (segments.length > 0) {
        if (['user', 'profile', 'u'].includes(segments[0])) {
            targetUsername = segments[1] || targetUsername || (currentUser?.slug || '');
            tabFromUrl = (segments[2] as ProfileTab) || 'posts';
        } else {
            targetUsername = segments[0] || targetUsername || (currentUser?.slug || '');
            tabFromUrl = (segments[1] as ProfileTab) || 'posts';
        }
    }

    useEffect(() => {
        if (initialPageData && initialPageData.user?.slug === targetUsername) {
            setProfileData(initialPageData);
            setLoading(false);
            return;
        }

        if (!targetUsername) {
            if (currentUser?.slug) {
                fetchProfile(currentUser.slug);
            } else {
                setLoading(false);
                setError('User not found');
            }
            return;
        }

        fetchProfile(targetUsername);
    }, [targetUsername, initialPageData, currentUser?.slug]);

    const fetchProfile = async (slugOrId: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/social-media/profile?slug=${encodeURIComponent(slugOrId)}`);
            const data = await res.json();
            if (res.ok && data.user) {
                setProfileData(data);
            } else {
                setError(data.error || 'User not found');
            }
        } catch {
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-indigo-600">
                    <Icon icon="line-md:loading-twotone-loop" width={36} />
                    <p className="text-xs font-bold text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 shadow-sm border border-rose-100">
                    <Icon icon="solar:user-cross-bold" width={32} />
                </div>
                <h2 className="text-lg font-black text-gray-900 mb-1">
                    {error || 'User Profile Unavailable'}
                </h2>
                <p className="text-xs text-gray-500 max-w-sm mb-6">
                    This user profile does not exist or may have been removed.
                </p>
                <a
                    href="/feeds"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition"
                >
                    Back to Feeds
                </a>
            </div>
        );
    }

    return (
        <UserProfilePage
            userData={profileData}
            initialTab={tabFromUrl}
            currentUser={currentUser}
            onProfileUpdated={() => fetchProfile(targetUsername)}
        />
    );
}
