/**
 * plugin/social-media/lib/serverHooks.ts
 *
 * SERVER-ONLY. Registers server data hook providers for social media content.
 * Automatically discovered by hook/serverDataHooks.ts via require.context.
 */

import { registerServerDataHook } from '@/hook/serverDataHooks';
import UserInfo from '@/models/Users_info';
import { getFriendshipModel } from '../models/Friendship';
import { getSocialPostModel } from '../models/SocialMedia';

registerServerDataHook('user', async (id, slug, userDoc) => {
    if (!userDoc) return undefined;

    const infoRecords = (await UserInfo.find({ userId: userDoc._id }).lean()) as any[];
    const infoMap = infoRecords.reduce<Record<string, string>>((acc, r) => {
        acc[r.name] = r.value;
        return acc;
    }, {});

    const Friendship = getFriendshipModel();
    const SocialPost = getSocialPostModel();

    const userObjId = userDoc._id;
    const userStrId = String(userDoc._id);
    const friendOrConditions: any[] = [
        { requesterId: userStrId },
        { recipientId: userStrId },
        { requesterId: userObjId },
        { recipientId: userObjId },
    ];

    const [friendsCount, postsCount, photosCount, videosCount] = await Promise.all([
        Friendship.countDocuments({
            $or: friendOrConditions,
            status: 'accepted',
        }),
        SocialPost.countDocuments({ userId: userStrId, status: 'published' }),
        SocialPost.countDocuments({ userId: userStrId, type: 'image', status: 'published' }),
        SocialPost.countDocuments({ userId: userStrId, type: 'video', status: 'published' }),
    ]);

    return {
        user: {
            _id: String(userDoc._id),
            name: userDoc.name,
            slug: userDoc.slug,
            email: userDoc.email,
            phone: userDoc.phone,
            type: userDoc.type,
            image: userDoc.image,
            city: userDoc.city,
            state: userDoc.state,
            createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : undefined,
        },
        info: infoMap,
        stats: {
            friendsCount,
            postsCount,
            photosCount,
            videosCount,
        },
    };
});
