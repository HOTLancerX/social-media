import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getFriendshipModel } from '../../../models/Friendship';
import { getSocialNotificationModel } from '../../../models/Notification';
import User from '@/models/Users';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get('targetUserId');
        const listType = searchParams.get('list'); // 'friends' | 'pending' | 'followers' | 'following' | 'status'

        const Friendship = getFriendshipModel();

        // 1. Check friendship status with target user (only if list is not specified or list=status)
        if ((!listType || listType === 'status') && targetUserId && sessionUser?._id) {
            const uId = sessionUser._id;
            const tId = targetUserId;
            const uObjId = mongoose.Types.ObjectId.isValid(uId) ? new mongoose.Types.ObjectId(uId) : null;
            const tObjId = mongoose.Types.ObjectId.isValid(tId) ? new mongoose.Types.ObjectId(tId) : null;

            const orConditions: any[] = [
                { requesterId: uId, recipientId: tId },
                { requesterId: tId, recipientId: uId },
            ];
            if (uObjId && tObjId) {
                orConditions.push(
                    { requesterId: uObjId, recipientId: tObjId },
                    { requesterId: tObjId, recipientId: uObjId }
                );
            }

            const friendship: any = await Friendship.findOne({ $or: orConditions }).lean();

            let status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked' = 'none';
            if (friendship) {
                if (friendship.status === 'accepted') {
                    status = 'friends';
                } else if (friendship.status === 'pending') {
                    status = String(friendship.requesterId) === String(sessionUser._id)
                        ? 'pending_sent'
                        : 'pending_received';
                } else if (friendship.status === 'blocked') {
                    status = 'blocked';
                }
            }

            return NextResponse.json({
                status,
                friendshipId: friendship?._id,
            });
        }

        const limit = parseInt(searchParams.get('limit') || '50', 10);

        // 2. Fetch user's friends list
        const queryUserId = targetUserId || sessionUser?._id;
        if (listType === 'friends' && queryUserId) {
            const qId = String(queryUserId);
            const qObjId = mongoose.Types.ObjectId.isValid(qId) ? new mongoose.Types.ObjectId(qId) : null;

            const orConditions: any[] = [
                { requesterId: qId },
                { recipientId: qId },
            ];
            if (qObjId) {
                orConditions.push(
                    { requesterId: qObjId },
                    { recipientId: qObjId }
                );
            }

            const friendships = await Friendship.find({
                $or: orConditions,
                status: 'accepted',
            })
                .sort({ updatedAt: -1 })
                .limit(limit)
                .lean();

            const friendIds: string[] = [];
            friendships.forEach((f: any) => {
                const reqIdStr = String(f.requesterId);
                const recIdStr = String(f.recipientId);
                if (reqIdStr === qId) {
                    friendIds.push(recIdStr);
                } else {
                    friendIds.push(reqIdStr);
                }
            });

            const validObjIds = friendIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));

            const friends = await User.find({
                $or: [
                    { _id: { $in: validObjIds } },
                    { _id: { $in: friendIds } },
                ],
            })
                .select('_id name slug image type status city state')
                .lean();

            return NextResponse.json({
                friends: friends.map((u: any) => ({ ...u, _id: String(u._id) })),
                count: friends.length,
            });
        }

        // 3. Fetch followers list (people who follow queryUserId: sent pending request OR accepted friends)
        if (listType === 'followers' && queryUserId) {
            const qId = queryUserId;
            const qObjId = mongoose.Types.ObjectId.isValid(qId) ? new mongoose.Types.ObjectId(qId) : null;

            const orConditions: any[] = [
                { recipientId: qId, status: 'pending' },
                { recipientId: qId, status: 'accepted' },
                { requesterId: qId, status: 'accepted' },
            ];
            if (qObjId) {
                orConditions.push(
                    { recipientId: qObjId, status: 'pending' },
                    { recipientId: qObjId, status: 'accepted' },
                    { requesterId: qObjId, status: 'accepted' }
                );
            }

            const followerFriendships = await Friendship.find({ $or: orConditions })
                .sort({ updatedAt: -1 })
                .limit(limit)
                .lean();

            const followerUserIds = followerFriendships.map((f: any) =>
                String(f.recipientId) === String(queryUserId) ? f.requesterId : f.recipientId
            );

            const followers = await User.find({
                _id: { $in: followerUserIds },
            })
                .select('_id name slug image type status city state')
                .lean();

            const friendshipMap = new Map(
                followerFriendships.map((f: any) => {
                    const otherId = String(f.recipientId) === String(queryUserId) ? String(f.requesterId) : String(f.recipientId);
                    return [otherId, { status: f.status, isPending: f.status === 'pending', friendshipId: f._id }];
                })
            );

            const enrichedFollowers = followers.map((u: any) => ({
                ...u,
                relation: friendshipMap.get(String(u._id)) || { status: 'none', isPending: false },
            }));

            return NextResponse.json({
                followers: enrichedFollowers,
                count: enrichedFollowers.length,
            });
        }

        // 4. Fetch following list
        if (listType === 'following' && queryUserId) {
            const qId = queryUserId;
            const qObjId = mongoose.Types.ObjectId.isValid(qId) ? new mongoose.Types.ObjectId(qId) : null;

            const orConditions: any[] = [
                { requesterId: qId, status: 'pending' },
                { requesterId: qId, status: 'accepted' },
                { recipientId: qId, status: 'accepted' },
            ];
            if (qObjId) {
                orConditions.push(
                    { requesterId: qObjId, status: 'pending' },
                    { requesterId: qObjId, status: 'accepted' },
                    { recipientId: qObjId, status: 'accepted' }
                );
            }

            const followingFriendships = await Friendship.find({ $or: orConditions })
                .sort({ updatedAt: -1 })
                .limit(limit)
                .lean();

            const followingUserIds = followingFriendships.map((f: any) =>
                String(f.requesterId) === String(queryUserId) ? f.recipientId : f.requesterId
            );

            const following = await User.find({
                _id: { $in: followingUserIds },
            })
                .select('_id name slug image type status city state')
                .lean();

            return NextResponse.json({
                following,
                count: following.length,
            });
        }

        // 5. Fetch pending received requests for session user
        if (listType === 'pending' && sessionUser?._id) {
            const sId = sessionUser._id;
            const sObjId = mongoose.Types.ObjectId.isValid(sId) ? new mongoose.Types.ObjectId(sId) : null;

            const orConditions: any[] = [{ recipientId: sId, status: 'pending' }];
            if (sObjId) orConditions.push({ recipientId: sObjId, status: 'pending' });

            const pendingFriendships = await Friendship.find({ $or: orConditions })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            const requesterIds = pendingFriendships.map((f: any) => f.requesterId);
            const requesters = await User.find({ _id: { $in: requesterIds } })
                .select('_id name slug image type status city state')
                .lean();

            const requesterMap = new Map(requesters.map((u: any) => [String(u._id), u]));
            const pendingList = pendingFriendships.map((f: any) => ({
                friendshipId: f._id,
                createdAt: f.createdAt,
                user: requesterMap.get(String(f.requesterId)),
            })).filter((item: any) => Boolean(item.user));

            return NextResponse.json({
                pending: pendingList,
                count: pendingList.length,
            });
        }

        return NextResponse.json({ status: 'none' });
    } catch (err: any) {
        console.error('Failed to get friendship data:', err);
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
        const { action, targetUserId, friendshipId } = body;

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        const Friendship = getFriendshipModel();
        const Notification = getSocialNotificationModel();

        const sessionObjId: any = mongoose.Types.ObjectId.isValid(sessionUser._id)
            ? new mongoose.Types.ObjectId(String(sessionUser._id))
            : sessionUser._id;

        const targetObjId: any = targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)
            ? new mongoose.Types.ObjectId(String(targetUserId))
            : targetUserId;

        // ── A. Send Friend Request ──
        if (action === 'send') {
            if (!targetUserId || String(targetUserId) === String(sessionUser._id)) {
                return NextResponse.json({ error: 'Invalid target user' }, { status: 400 });
            }

            // Check if request or friendship already exists
            const orConditions: any[] = [
                { requesterId: sessionUser._id, recipientId: targetUserId },
                { requesterId: targetUserId, recipientId: sessionUser._id },
                { requesterId: sessionObjId, recipientId: targetObjId },
                { requesterId: targetObjId, recipientId: sessionObjId },
            ];

            const existing = await Friendship.findOne({ $or: orConditions });

            if (existing) {
                if (existing.status === 'accepted') {
                    return NextResponse.json({ message: 'Already friends', status: 'friends' });
                }
                if (existing.status === 'pending') {
                    return NextResponse.json({ message: 'Request already pending', status: 'pending_sent' });
                }
                existing.status = 'pending';
                existing.requesterId = sessionObjId;
                existing.recipientId = targetObjId;
                await existing.save();

                // Trigger in-app notification
                try {
                    await Notification.create({
                        recipientId: targetObjId,
                        senderId: sessionObjId,
                        senderName: sessionUser.name || 'Friend',
                        senderImage: sessionUser.image || '',
                        senderSlug: sessionUser.slug || '',
                        type: 'friend_request',
                        targetType: 'user',
                        targetId: String(sessionUser._id),
                        content: 'sent you a friend request',
                    });
                } catch {}

                return NextResponse.json({ message: 'Friend request sent', status: 'pending_sent' });
            }

            const newFriendship = await Friendship.create({
                requesterId: sessionObjId,
                recipientId: targetObjId,
                status: 'pending',
            });

            // Trigger in-app notification
            try {
                await Notification.create({
                    recipientId: targetObjId,
                    senderId: sessionObjId,
                    senderName: sessionUser.name || 'Friend',
                    senderImage: sessionUser.image || '',
                    senderSlug: sessionUser.slug || '',
                    type: 'friend_request',
                    targetType: 'user',
                    targetId: String(sessionUser._id),
                    content: 'sent you a friend request',
                });
            } catch {}

            return NextResponse.json({
                message: 'Friend request sent',
                status: 'pending_sent',
                friendshipId: newFriendship._id,
            });
        }

        // ── B. Accept Friend Request ──
        if (action === 'accept') {
            const query: any = friendshipId
                ? { _id: friendshipId }
                : {
                      $or: [
                          { requesterId: targetUserId, recipientId: sessionUser._id, status: 'pending' },
                          { requesterId: targetObjId, recipientId: sessionObjId, status: 'pending' },
                      ],
                  };

            const friendship = await Friendship.findOne(query);
            if (!friendship) {
                return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
            }

            friendship.status = 'accepted';
            await friendship.save();

            // Trigger in-app notification
            try {
                await Notification.create({
                    recipientId: friendship.requesterId,
                    senderId: sessionObjId,
                    senderName: sessionUser.name || 'Friend',
                    senderImage: sessionUser.image || '',
                    senderSlug: sessionUser.slug || '',
                    type: 'friend_accept',
                    targetType: 'user',
                    targetId: String(sessionUser._id),
                    content: 'accepted your friend request',
                });
            } catch {}

            return NextResponse.json({
                message: 'Friend request accepted',
                status: 'friends',
            });
        }

        // ── C. Decline / Cancel / Unfriend ──
        if (action === 'decline' || action === 'cancel' || action === 'unfriend') {
            const query: any = friendshipId
                ? { _id: friendshipId }
                : {
                      $or: [
                          { requesterId: sessionUser._id, recipientId: targetUserId },
                          { requesterId: targetUserId, recipientId: sessionUser._id },
                          { requesterId: sessionObjId, recipientId: targetObjId },
                          { requesterId: targetObjId, recipientId: sessionObjId },
                      ],
                  };

            await Friendship.findOneAndDelete(query);

            return NextResponse.json({
                message: 'Friendship removed',
                status: 'none',
            });
        }

        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    } catch (err: any) {
        console.error('Friend request action error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
