import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getGroupModel } from '../../../models/Group';
import { getSocialPostModel } from '../../../models/SocialMedia';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id ? String(sessionUser._id) : null;

        const { searchParams } = new URL(req.url);
        const checkSlug = searchParams.get('check_slug');
        const excludeId = searchParams.get('excludeId');

        const Group = getGroupModel();
        const PostModel = getSocialPostModel();

        // 0. Slug Availability Checker
        if (checkSlug) {
            const cleanSlug = checkSlug
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9-_]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            if (!cleanSlug || cleanSlug.length < 2) {
                return NextResponse.json({
                    available: false,
                    slug: cleanSlug,
                    error: 'Slug must be at least 2 characters (letters, numbers, hyphens)',
                });
            }

            const checkQuery: any = { slug: cleanSlug };
            if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
                checkQuery._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
            }

            const existing = await (Group as any).findOne(checkQuery).select('_id slug name').lean();
            return NextResponse.json({
                available: !existing,
                slug: cleanSlug,
                message: !existing ? 'Slug is available!' : 'This slug is already taken',
            });
        }

        const rawSlug = searchParams.get('slug');
        const slug = rawSlug ? String(rawSlug).split(',').pop()?.split('/').pop()?.trim() : null;
        const listType = searchParams.get('list'); // 'my' | 'discover' | 'admin' | 'public' | 'private'
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

        // 1. Single Group Details by Slug
        if (slug) {
            const group = await (Group as any).findOne({ slug })
                .populate({ path: 'creatorId', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'admins', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'moderators', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'members', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'pendingMembers', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'bannedUsers', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'blockedUsers', select: 'name image slug', options: { strictPopulate: false } })
                .populate({ path: 'invitedUsers', select: 'name image slug', options: { strictPopulate: false } })
                .lean();

            if (!group) {
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }

            const isMember = currentUserId
                ? (group.members as any[])?.some((m: any) => String(m._id || m) === currentUserId)
                : false;

            const isAdmin = currentUserId
                ? (group.admins as any[])?.some((a: any) => String(a._id || a) === currentUserId) ||
                  String(group.creatorId?._id || group.creatorId) === currentUserId
                : false;

            const isModerator = currentUserId
                ? (group.moderators as any[])?.some((mod: any) => String(mod._id || mod) === currentUserId)
                : false;

            const isPending = currentUserId
                ? (group.pendingMembers as any[])?.some((p: any) => String(p._id || p) === currentUserId)
                : false;

            const isBanned = currentUserId
                ? (group.bannedUsers as any[])?.some((b: any) => String(b._id || b) === currentUserId)
                : false;

            const isBlocked = currentUserId
                ? (group.blockedUsers as any[])?.some((bl: any) => String(bl._id || bl) === currentUserId)
                : false;

            // Fetch pending posts count for admins / moderators
            let pendingPostsCount = 0;
            if (isAdmin || isModerator) {
                pendingPostsCount = await PostModel.countDocuments({
                    groupId: String(group._id),
                    status: 'pending_approval',
                });
            }

            // Security / Privacy: for visitors who are NOT admin/mod, sanitize sensitive admin lists
            const sanitizedGroup = {
                ...group,
                pendingMembers: isAdmin || isModerator ? group.pendingMembers : [],
                bannedUsers: isAdmin || isModerator ? group.bannedUsers : [],
                blockedUsers: isAdmin || isModerator ? group.blockedUsers : [],
                invitedUsers: isAdmin || isModerator ? group.invitedUsers : [],
                members: group.privacy === 'private' && !isMember && !isAdmin ? (group.members || []).slice(0, 5) : group.members,
                membersCount: group.members?.length || 0,
                pendingPostsCount,
            };

            return NextResponse.json({
                group: sanitizedGroup,
                isMember,
                isAdmin,
                isModerator,
                isPending,
                isBanned,
                isBlocked,
                pendingPostsCount,
            });
        }

        // 2. Groups Directory / Discovery Query
        const query: any = {};

        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
                { category: { $regex: search.trim(), $options: 'i' } },
            ];
        }

        if (category && category !== 'All') {
            query.category = category;
        }

        if (listType === 'my' && currentUserId) {
            const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
                ? new mongoose.Types.ObjectId(currentUserId)
                : currentUserId;
            query.members = userObjId;
        } else if (listType === 'admin' && currentUserId) {
            const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
                ? new mongoose.Types.ObjectId(currentUserId)
                : currentUserId;
            query.$or = [{ admins: userObjId }, { creatorId: userObjId }, { moderators: userObjId }];
        } else if (listType === 'public') {
            query.privacy = 'public';
        } else if (listType === 'private') {
            query.privacy = 'private';
        }

        const groups = await (Group as any).find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('creatorId', 'name image slug')
            .populate('admins', 'name image slug')
            .populate('members', 'name image slug')
            .lean();

        // Attach membership status flags for current user
        const formattedGroups = groups.map((g: any) => {
            const isMember = currentUserId
                ? (g.members as any[])?.some((m: any) => String(m._id || m) === currentUserId)
                : false;
            const isAdmin = currentUserId
                ? (g.admins as any[])?.some((a: any) => String(a._id || a) === currentUserId) ||
                  String(g.creatorId?._id || g.creatorId) === currentUserId
                : false;
            const isPending = currentUserId
                ? (g.pendingMembers as any[])?.some((p: any) => String(p._id || p) === currentUserId)
                : false;

            return {
                ...g,
                membersCount: g.members?.length || 0,
                isMember,
                isAdmin,
                isPending,
                members: (g.members || []).slice(0, 6),
                pendingMembers: [],
                bannedUsers: [],
                blockedUsers: [],
            };
        });

        return NextResponse.json({
            groups: formattedGroups,
            count: formattedGroups.length,
        });
    } catch (err: any) {
        console.error('Failed to get groups:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id || (sessionUser as any)?.id;

        if (!currentUserId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const userIdStr = String(currentUserId);
        const userObjId = mongoose.Types.ObjectId.isValid(userIdStr)
            ? new mongoose.Types.ObjectId(userIdStr)
            : userIdStr;

        const body = await req.json();
        const {
            action = 'create',
            name,
            slug,
            description,
            category,
            privacy,
            postApproval,
            allowMemberInvites,
            coverImage,
            avatarImage,
            rules,
            groupId,
            targetUserId,
            postId,
        } = body;

        const Group = getGroupModel();
        const PostModel = getSocialPostModel();

        // ── 1. Create Group ──
        if (action === 'create') {
            if (!name || !name.trim()) {
                return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
            }

            const cleanSlug = (slug || name)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const uniqueSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

            const group = await (Group as any).create({
                name: name.trim(),
                slug: uniqueSlug,
                description: description || '',
                category: category || 'General',
                privacy: privacy === 'private' ? 'private' : 'public',
                postApproval: postApproval === 'admin_approval' ? 'admin_approval' : 'auto',
                allowMemberInvites: allowMemberInvites !== false,
                coverImage: coverImage || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600',
                avatarImage: avatarImage || '',
                creatorId: userObjId,
                admins: [userObjId],
                moderators: [],
                members: [userObjId],
                pendingMembers: [],
                bannedUsers: [],
                blockedUsers: [],
                invitedUsers: [],
                rules: Array.isArray(rules) && rules.length > 0 ? rules : [
                    'Be respectful and kind to all members',
                    'No hate speech, bullying, or harassment',
                    'No unauthorized spam or promotional links',
                    'Respect member privacy and keep discussions constructive',
                ],
            });

            return NextResponse.json({ message: 'Group created successfully', group }, { status: 201 });
        }

        // ── 2. Join / Leave / Cancel Request ──
        if (action === 'join' || action === 'leave' || action === 'cancel_request') {
            if (!groupId) {
                return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
            }

            const group = await (Group as any).findById(groupId);
            if (!group) {
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }

            // Check if user is banned
            if ((group.bannedUsers || []).some((id: any) => String(id) === userIdStr)) {
                return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
            }

            if (action === 'join') {
                if (group.privacy === 'private') {
                    if (!group.pendingMembers.some((id: any) => String(id) === userIdStr)) {
                        group.pendingMembers.push(userObjId);
                        await group.save();
                    }
                    return NextResponse.json({ message: 'Join request submitted', status: 'pending' });
                } else {
                    if (!group.members.some((id: any) => String(id) === userIdStr)) {
                        group.members.push(userObjId);
                        await group.save();
                    }
                    return NextResponse.json({ message: 'Joined group successfully', status: 'member' });
                }
            }

            if (action === 'cancel_request') {
                group.pendingMembers = group.pendingMembers.filter((id: any) => String(id) !== userIdStr);
                await group.save();
                return NextResponse.json({ message: 'Request cancelled', status: 'none' });
            }

            if (action === 'leave') {
                group.members = group.members.filter((id: any) => String(id) !== userIdStr);
                group.admins = group.admins.filter((id: any) => String(id) !== userIdStr);
                group.moderators = group.moderators.filter((id: any) => String(id) !== userIdStr);
                group.pendingMembers = group.pendingMembers.filter((id: any) => String(id) !== userIdStr);
                await group.save();
                return NextResponse.json({ message: 'Left group', status: 'none' });
            }
        }

        // ── 3. Group Settings & Admin Moderation Controls ──
        if (!groupId) {
            return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
        }

        const group = await (Group as any).findById(groupId);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const isCreator = String(group.creatorId) === userIdStr;
        const isAdmin =
            isCreator ||
            (group.admins as any[])?.some((a: any) => String(a) === userIdStr);
        const isModerator =
            isAdmin ||
            (group.moderators as any[])?.some((m: any) => String(m) === userIdStr);

        if (!isModerator) {
            return NextResponse.json({ error: 'Only group admins or moderators can perform this action' }, { status: 403 });
        }

        // Update Full Settings
        if (action === 'update_settings' || action === 'update_group') {
            if (!isAdmin) {
                return NextResponse.json({ error: 'Only group admins can update group settings' }, { status: 403 });
            }

            if (slug && slug.trim()) {
                const cleanSlug = slug
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9-_]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');

                if (cleanSlug.length < 2) {
                    return NextResponse.json({ error: 'Group slug must be at least 2 characters long' }, { status: 400 });
                }

                if (cleanSlug !== group.slug) {
                    const slugExists = await (Group as any).findOne({
                        slug: cleanSlug,
                        _id: { $ne: group._id },
                    });
                    if (slugExists) {
                        return NextResponse.json(
                            { error: `The custom URL / slug "${cleanSlug}" is already taken by another group.` },
                            { status: 400 }
                        );
                    }
                    group.slug = cleanSlug;
                }
            }

            if (name) group.name = name.trim();
            if (description !== undefined) group.description = description;
            if (category) group.category = category;
            if (privacy) group.privacy = privacy;
            if (postApproval) group.postApproval = postApproval;
            if (allowMemberInvites !== undefined) group.allowMemberInvites = Boolean(allowMemberInvites);
            if (coverImage !== undefined) group.coverImage = coverImage;
            if (avatarImage !== undefined) group.avatarImage = avatarImage;
            if (Array.isArray(rules)) group.rules = rules;

            await group.save();
            return NextResponse.json({ message: 'Group settings updated successfully', group, newSlug: group.slug });
        }

        // Member Approvals & Declines
        if (action === 'approve_member' && targetUserId) {
            const targetObjId = mongoose.Types.ObjectId.isValid(targetUserId)
                ? new mongoose.Types.ObjectId(targetUserId)
                : targetUserId;

            group.pendingMembers = group.pendingMembers.filter((id: any) => String(id) !== String(targetUserId));
            if (!group.members.some((id: any) => String(id) === String(targetUserId))) {
                group.members.push(targetObjId);
            }
            await group.save();
            return NextResponse.json({ message: 'Member approved successfully' });
        }

        if (action === 'reject_member' && targetUserId) {
            group.pendingMembers = group.pendingMembers.filter((id: any) => String(id) !== String(targetUserId));
            await group.save();
            return NextResponse.json({ message: 'Member request declined' });
        }

        // Ban / Unban User
        if (action === 'ban_user' && targetUserId) {
            if (!isAdmin) {
                return NextResponse.json({ error: 'Only admins can ban members' }, { status: 403 });
            }
            const targetObjId = mongoose.Types.ObjectId.isValid(targetUserId)
                ? new mongoose.Types.ObjectId(targetUserId)
                : targetUserId;

            group.members = group.members.filter((id: any) => String(id) !== String(targetUserId));
            group.moderators = group.moderators.filter((id: any) => String(id) !== String(targetUserId));
            group.pendingMembers = group.pendingMembers.filter((id: any) => String(id) !== String(targetUserId));
            if (!group.bannedUsers.some((id: any) => String(id) === String(targetUserId))) {
                group.bannedUsers.push(targetObjId);
            }
            await group.save();
            return NextResponse.json({ message: 'User banned from group' });
        }

        if (action === 'unban_user' && targetUserId) {
            if (!isAdmin) {
                return NextResponse.json({ error: 'Only admins can unban users' }, { status: 403 });
            }
            group.bannedUsers = group.bannedUsers.filter((id: any) => String(id) !== String(targetUserId));
            await group.save();
            return NextResponse.json({ message: 'User unbanned from group' });
        }

        // Block / Unblock User
        if (action === 'block_user' && targetUserId) {
            const targetObjId = mongoose.Types.ObjectId.isValid(targetUserId)
                ? new mongoose.Types.ObjectId(targetUserId)
                : targetUserId;
            if (!group.blockedUsers.some((id: any) => String(id) === String(targetUserId))) {
                group.blockedUsers.push(targetObjId);
            }
            await group.save();
            return NextResponse.json({ message: 'User blocked' });
        }

        if (action === 'unblock_user' && targetUserId) {
            group.blockedUsers = group.blockedUsers.filter((id: any) => String(id) !== String(targetUserId));
            await group.save();
            return NextResponse.json({ message: 'User unblocked' });
        }

        // Remove Member
        if (action === 'remove_member' && targetUserId) {
            group.members = group.members.filter((id: any) => String(id) !== String(targetUserId));
            group.admins = group.admins.filter((id: any) => String(id) !== String(targetUserId));
            group.moderators = group.moderators.filter((id: any) => String(id) !== String(targetUserId));
            await group.save();
            return NextResponse.json({ message: 'Member removed from group' });
        }

        // Manage Roles (Admins & Moderators)
        if (action === 'make_moderator' && targetUserId) {
            if (!isAdmin) return NextResponse.json({ error: 'Only admins can appoint moderators' }, { status: 403 });
            const targetObjId = mongoose.Types.ObjectId.isValid(targetUserId) ? new mongoose.Types.ObjectId(targetUserId) : targetUserId;
            if (!group.moderators.some((id: any) => String(id) === String(targetUserId))) {
                group.moderators.push(targetObjId);
            }
            await group.save();
            return NextResponse.json({ message: 'User promoted to moderator' });
        }

        if (action === 'remove_moderator' && targetUserId) {
            if (!isAdmin) return NextResponse.json({ error: 'Only admins can remove moderators' }, { status: 403 });
            group.moderators = group.moderators.filter((id: any) => String(id) !== String(targetUserId));
            await group.save();
            return NextResponse.json({ message: 'Moderator role removed' });
        }

        // Post Approvals Queue (Approve / Decline pending posts)
        if (action === 'approve_post' && postId) {
            const post = await (PostModel as any).findById(postId);
            if (!post || String(post.groupId) !== String(group._id)) {
                return NextResponse.json({ error: 'Pending post not found' }, { status: 404 });
            }
            post.status = 'published';
            await post.save();
            return NextResponse.json({ message: 'Post approved and published!', post });
        }

        if (action === 'decline_post' && postId) {
            const post = await (PostModel as any).findById(postId);
            if (post && String(post.groupId) !== String(group._id)) {
                return NextResponse.json({ error: 'Pending post not found' }, { status: 404 });
            }
            if (post) {
                post.status = 'deleted';
                await post.save();
            }
            return NextResponse.json({ message: 'Pending post declined' });
        }

        // Delete Group (Creator Only)
        if (action === 'delete_group') {
            if (!isCreator) {
                return NextResponse.json({ error: 'Only the group creator can delete this group' }, { status: 403 });
            }
            await (Group as any).findByIdAndDelete(group._id);
            await (PostModel as any).deleteMany({ groupId: String(group._id) });
            return NextResponse.json({ message: 'Group deleted successfully' });
        }

        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    } catch (err: any) {
        console.error('Group action error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
