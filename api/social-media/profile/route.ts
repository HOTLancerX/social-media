import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/Users';
import UserInfo from '@/models/Users_info';
import { getAuthSession } from '@/lib/session';
import { getFriendshipModel } from '../../../models/Friendship';
import { getSocialPostModel } from '../../../models/SocialMedia';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const userId = searchParams.get('userId');

        if (!slug && !userId) {
            return NextResponse.json({ error: 'User slug or ID is required' }, { status: 400 });
        }

        const query: any = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            query._id = userId;
        } else if (slug) {
            query.slug = slug;
        }

        const user = await User.findOne(query).select('-password').lean();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch user info records
        const infoRecords = await UserInfo.find({ userId: user._id }).lean();
        const infoMap = infoRecords.reduce<Record<string, string>>((acc, r: any) => {
            acc[r.name] = r.value;
            return acc;
        }, {});

        // Fetch counts: Friends, Posts, Photos, Videos
        const Friendship: any = getFriendshipModel();
        const SocialPost: any = getSocialPostModel();

        const userObjId = mongoose.Types.ObjectId.isValid(user._id) ? new mongoose.Types.ObjectId(String(user._id)) : null;
        const userStrId = String(user._id);

        const friendOrConditions: any[] = [
            { requesterId: userStrId },
            { recipientId: userStrId },
        ];
        if (userObjId) {
            friendOrConditions.push(
                { requesterId: userObjId },
                { recipientId: userObjId }
            );
        }

        const [friendsCount, postsCount, photosCount, videosCount] = await Promise.all([
            Friendship.countDocuments({
                $or: friendOrConditions,
                status: 'accepted',
            }),
            SocialPost.countDocuments({
                $or: [{ userId: userStrId }, ...(userObjId ? [{ userId: userObjId }] : [])],
                status: 'published',
            }),
            SocialPost.countDocuments({
                userId: userStrId,
                type: 'image',
                status: 'published',
            }),
            SocialPost.countDocuments({
                userId: userStrId,
                type: 'video',
                status: 'published',
            }),
        ]);

        return NextResponse.json({
            user: {
                _id: String(user._id),
                name: user.name,
                slug: user.slug,
                email: user.email,
                phone: user.phone,
                type: user.type,
                image: user.image,
                status: user.status,
                address: user.address,
                city: user.city,
                state: user.state,
                zipCode: user.zipCode,
                createdAt: user.createdAt,
            },
            info: infoMap,
            stats: {
                friendsCount,
                postsCount,
                photosCount,
                videosCount,
            },
        });
    } catch (err: any) {
        console.error('Failed to get profile data:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        if (!sessionUser?._id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await req.json();
        const {
            name,
            image,
            coverPhoto,
            bio,
            workInfo,
            educationInfo,
            locationCity,
            locationHometown,
            relationshipStatus,
            socialLinks,
            privacySettings,
        } = body;

        // 1. Update core User document
        const userUpdate: any = {};
        if (name) userUpdate.name = name.trim();
        if (image !== undefined) userUpdate.image = image;

        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(sessionUser._id, userUpdate);
        }

        // 2. Update extended UserInfo records
        const infoUpdates: { name: string; value: string }[] = [];

        if (coverPhoto !== undefined) infoUpdates.push({ name: 'cover_photo', value: String(coverPhoto) });
        if (bio !== undefined) infoUpdates.push({ name: 'bio', value: String(bio) });
        if (workInfo !== undefined) infoUpdates.push({ name: 'work_info', value: JSON.stringify(workInfo) });
        if (educationInfo !== undefined) infoUpdates.push({ name: 'education_info', value: JSON.stringify(educationInfo) });
        if (locationCity !== undefined) infoUpdates.push({ name: 'location_city', value: String(locationCity) });
        if (locationHometown !== undefined) infoUpdates.push({ name: 'location_hometown', value: String(locationHometown) });
        if (relationshipStatus !== undefined) infoUpdates.push({ name: 'relationship_status', value: String(relationshipStatus) });
        if (socialLinks !== undefined) infoUpdates.push({ name: 'social_links', value: JSON.stringify(socialLinks) });
        if (privacySettings !== undefined) infoUpdates.push({ name: 'privacy_settings', value: JSON.stringify(privacySettings) });

        for (const item of infoUpdates) {
            await UserInfo.findOneAndUpdate(
                { userId: sessionUser._id, name: item.name },
                { value: item.value },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({
            message: 'Profile updated successfully',
        });
    } catch (err: any) {
        console.error('Failed to update profile:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
