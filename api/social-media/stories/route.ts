import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getStoryModel } from '../../../models/Story';
import { getFriendshipModel } from '../../../models/Friendship';
import { getSocialNotificationModel } from '../../../models/Notification';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const Story = getStoryModel();
        const Friendship = getFriendshipModel();

        const now = new Date();

        // 1. Get friend IDs if session user is logged in
        let allowedUserIds: mongoose.Types.ObjectId[] = [];
        if (sessionUser?._id) {
            const uId = sessionUser._id;
            const uObjId = mongoose.Types.ObjectId.isValid(uId) ? new mongoose.Types.ObjectId(String(uId)) : null;

            const friendships = await Friendship.find({
                $or: [
                    { requesterId: uId },
                    { recipientId: uId },
                    ...(uObjId ? [{ requesterId: uObjId }, { recipientId: uObjId }] : []),
                ],
                status: 'accepted',
            }).lean();

            const friendIds = friendships.map((f: any) =>
                String(f.requesterId) === String(sessionUser._id) ? f.recipientId : f.requesterId
            );

            allowedUserIds = [
                ...(uObjId ? [uObjId] : []),
                ...friendIds
                    .filter((id) => mongoose.Types.ObjectId.isValid(id))
                    .map((id) => new mongoose.Types.ObjectId(String(id))),
            ];
        }

        const query: any = { expiresAt: { $gt: now } };
        if (allowedUserIds.length > 1) {
            query.userId = { $in: allowedUserIds };
        }

        // Fetch active stories (within 24h), sorted by newest first
        const rawStories = await Story.find(query)
            .sort({ createdAt: -1 })
            .lean() as any[];

        // Fetch live User documents to enrich story authors, viewers, and reactions with current avatar/slug
        const allUserIds = new Set<string>();
        rawStories.forEach((s) => {
            if (s.userId) allUserIds.add(String(s.userId));
            (s.viewers || []).forEach((v: any) => {
                if (v.userId) allUserIds.add(String(v.userId));
            });
            (s.reactions || []).forEach((r: any) => {
                if (r.userId) allUserIds.add(String(r.userId));
            });
        });

        const { default: User } = await import('@/models/Users');
        const userObjIds = Array.from(allUserIds)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const userDocs = await User.find({
            $or: [{ _id: { $in: userObjIds } }, { _id: { $in: Array.from(allUserIds) } }],
        })
            .select('_id name slug image type')
            .lean();

        const userMap = new Map<string, any>();
        userDocs.forEach((u: any) => userMap.set(String(u._id), u));

        // Enrich stories with live author, viewer, and reaction photos (deduplicated by userId)
        const stories = rawStories.map((story) => {
            const author = userMap.get(String(story.userId));

            const uniqueViewersMap = new Map<string, any>();
            (story.viewers || []).forEach((v: any) => {
                const uId = String(v.userId);
                if (!uniqueViewersMap.has(uId)) {
                    const u = userMap.get(uId);
                    uniqueViewersMap.set(uId, {
                        ...v,
                        userId: uId,
                        userName: u?.name || v.userName || 'User',
                        userImage: u?.image || v.userImage || '',
                        userSlug: u?.slug || v.userSlug || '',
                    });
                }
            });

            const uniqueReactionsMap = new Map<string, any>();
            (story.reactions || []).forEach((r: any) => {
                const uId = String(r.userId);
                const u = userMap.get(uId);
                uniqueReactionsMap.set(uId, {
                    ...r,
                    userId: uId,
                    userName: u?.name || r.userName || 'User',
                    userImage: u?.image || r.userImage || '',
                    userSlug: u?.slug || r.userSlug || '',
                });
            });

            return {
                ...story,
                _id: String(story._id),
                userName: author?.name || story.userName,
                userImage: author?.image || story.userImage || '',
                userSlug: author?.slug || story.userSlug || '',
                viewers: Array.from(uniqueViewersMap.values()),
                reactions: Array.from(uniqueReactionsMap.values()),
            };
        });

        // Group stories by user
        const userStoriesMap = new Map<string, any>();

        for (const story of stories) {
            const uId = String(story.userId);
            if (!userStoriesMap.has(uId)) {
                userStoriesMap.set(uId, {
                    userId: uId,
                    userName: story.userName,
                    userImage: story.userImage,
                    userSlug: story.userSlug,
                    isMine: sessionUser?._id && String(sessionUser._id) === uId,
                    latestCreatedAt: story.createdAt,
                    hasUnviewed: sessionUser?._id
                        ? !story.viewers.some((v: any) => String(v.userId) === String(sessionUser._id))
                        : true,
                    stories: [],
                });
            }
            const group = userStoriesMap.get(uId);
            group.stories.push(story);
            if (
                sessionUser?._id &&
                !story.viewers.some((v: any) => String(v.userId) === String(sessionUser._id))
            ) {
                group.hasUnviewed = true;
            }
        }

        // Sort: user's own stories first, then unviewed stories, then newest creations
        const grouped = Array.from(userStoriesMap.values()).sort((a, b) => {
            if (a.isMine) return -1;
            if (b.isMine) return 1;
            if (a.hasUnviewed && !b.hasUnviewed) return -1;
            if (!a.hasUnviewed && b.hasUnviewed) return 1;
            return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
        });

        return NextResponse.json({ stories: grouped, totalCount: stories.length });
    } catch (err: any) {
        console.error('Failed to get stories:', err);
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
            mediaType = 'image',
            mediaUrl,
            textContent,
            bgStyle,
            action = 'create',
            storyId,
            reaction = '❤️',
            replyText = '',
        } = body;

        const Story = getStoryModel();
        const Notification = getSocialNotificationModel();

        // 1. Mark Story as Viewed
        if (action === 'view') {
            if (!storyId) return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
            
            const story = await Story.findById(storyId);
            if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

            const alreadyViewed = (story.viewers || []).some(
                (v) => String(v.userId) === String(sessionUser._id)
            );

            if (!alreadyViewed) {
                story.viewers.push({
                    userId: sessionUser._id,
                    userName: sessionUser.name || 'Friend',
                    userImage: sessionUser.image || '',
                    userSlug: sessionUser.slug || '',
                    viewedAt: new Date(),
                } as any);
                await story.save();
            }

            return NextResponse.json({ message: 'Marked viewed', viewersCount: story.viewers.length });
        }

        // 2. React to Story
        if (action === 'react') {
            if (!storyId) return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
            const story = await Story.findById(storyId);
            if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

            // Update or add reaction
            if (!story.reactions) story.reactions = [] as any;
            const existingIdx = story.reactions.findIndex(
                (r) => String(r.userId) === String(sessionUser._id)
            );

            const reactionItem = {
                userId: sessionUser._id,
                userName: sessionUser.name || 'Friend',
                userImage: sessionUser.image || '',
                userSlug: sessionUser.slug || '',
                reaction,
                createdAt: new Date(),
            };

            if (existingIdx >= 0) {
                story.reactions[existingIdx] = reactionItem as any;
            } else {
                story.reactions.push(reactionItem as any);
            }

            await story.save();

            // Notify story author
            if (String(story.userId) !== String(sessionUser._id)) {
                try {
                    await Notification.create({
                        recipientId: story.userId,
                        senderId: sessionUser._id,
                        senderName: sessionUser.name || 'Friend',
                        senderImage: sessionUser.image || '',
                        senderSlug: sessionUser.slug || '',
                        type: 'reaction',
                        reactionType: reaction,
                        targetType: 'post',
                        targetId: String(story._id),
                        content: `reacted with ${reaction} to your story`,
                    });
                } catch (notifErr) {
                    console.error('Failed to notify story reaction:', notifErr);
                }
            }

            return NextResponse.json({
                success: true,
                message: `Reacted ${reaction} to story`,
                reactions: story.reactions,
            });
        }

        // 3. Reply / Comment to Story
        if (action === 'reply') {
            if (!storyId) return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
            if (!replyText?.trim()) return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });

            const story = await Story.findById(storyId).lean();
            if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

            // Notify story author
            if (String(story.userId) !== String(sessionUser._id)) {
                try {
                    await Notification.create({
                        recipientId: story.userId,
                        senderId: sessionUser._id,
                        senderName: sessionUser.name || 'Friend',
                        senderImage: sessionUser.image || '',
                        senderSlug: sessionUser.slug || '',
                        type: 'comment',
                        targetType: 'post',
                        targetId: String(story._id),
                        content: `replied to your story: "${replyText.slice(0, 80)}"`,
                    });
                } catch (notifErr) {
                    console.error('Failed to notify story reply:', notifErr);
                }
            }

            return NextResponse.json({ success: true, message: 'Reply sent' });
        }

        // 4. Create New 24-Hour Story
        if (mediaType === 'image' || mediaType === 'video') {
            if (!mediaUrl) {
                return NextResponse.json({ error: 'mediaUrl is required for media stories' }, { status: 400 });
            }
        } else if (mediaType === 'text') {
            if (!textContent) {
                return NextResponse.json({ error: 'textContent is required for text stories' }, { status: 400 });
            }
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        const newStory = await Story.create({
            userId: sessionUser._id,
            userName: sessionUser.name || 'Friend',
            userImage: sessionUser.image || '',
            userSlug: sessionUser.slug || '',
            mediaType,
            mediaUrl: mediaUrl || '',
            textContent: textContent || '',
            bgStyle: bgStyle || null,
            viewers: [],
            reactions: [],
            expiresAt,
        });

        return NextResponse.json({ message: 'Story created', story: newStory }, { status: 201 });
    } catch (err: any) {
        console.error('Failed to process story action:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
