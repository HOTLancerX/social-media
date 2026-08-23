'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserProfilePage from './UserProfilePage';
import { Icon } from '@iconify/react';
import type { ProfileTab } from './ProfileHeader';

interface UserProfileDynamicPageProps {
    settings?: Record<string, any>;
    permalinkMap?: Record<string, string>;
}

export default function UserProfileDynamicPage({ settings }: UserProfileDynamicPageProps) {
    const pathname = usePathname() || '';
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Extract username and sub-tab from pathname (e.g. /user/john/friends or /profile/john)
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
    // segments[0] is 'user' or 'profile' or 'u'
    const username = segments[1] || (currentUser?.slug || '');
    const tabFromUrl = (segments[2] as ProfileTab) || 'posts';

    useEffect(() => {
        if (!username) {
            if (currentUser?.slug) {
                // Default to logged-in user profile
                fetchProfile(currentUser.slug);
            } else {
                setLoading(false);
                setError('User not found');
            }
            return;
        }

        fetchProfile(username);
    }, [username, currentUser?.slug]);

    const fetchProfile = async (slugOrId: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/social-media/profile?slug=${encodeURIComponent(slugOrId)}`);
            const data = await res.json();
            if (res.ok && data.user) {
                setProfileData(data);
            } else {
                setError(data.error || 'Profile not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <Icon icon="line-md:loading-twotone-loop" width={36} className="text-indigo-600 mx-auto" />
                    <p className="text-xs font-bold text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm border border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                        <Icon icon="solar:user-cross-bold" width={32} />
                    </div>
                    <h2 className="text-lg font-black text-gray-900">User Not Found</h2>
                    <p className="text-xs text-gray-500">
                        The user profile you are looking for does not exist or may have been removed.
                    </p>
                    <a
                        href="/feeds"
                        className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                        Back to Feeds
                    </a>
                </div>
            </div>
        );
    }

    return (
        <UserProfilePage
            userData={profileData}
            initialTab={tabFromUrl}
            currentUser={currentUser}
        />
    );
}
