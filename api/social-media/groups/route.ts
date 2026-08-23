import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getGroupModel } from '../../../models/Group';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const listType = searchParams.get('list'); // 'my' | 'discover'

        const Group = getGroupModel();

        if (slug) {
            const group = await Group.findOne({ slug })
                .populate('creatorId', 'name image slug')
                .populate('admins', 'name image slug')
                .populate('members', 'name image slug')
                .lean();

            if (!group) {
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }

            const isMember = sessionUser?._id
                ? (group.members as any[])?.some((m: any) => String(m._id || m) === String(sessionUser._id))
                : false;
            const isAdmin = sessionUser?._id
                ? (group.admins as any[])?.some((a: any) => String(a._id || a) === String(sessionUser._id)) ||
                  String(group.creatorId?._id || group.creatorId) === String(sessionUser._id)
                : false;

            return NextResponse.json({ group, isMember, isAdmin });
        }

        const query: any = {};
        if (listType === 'my' && sessionUser?._id) {
            query.members = sessionUser._id;
        }

        const groups = await Group.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('creatorId', 'name image slug')
            .lean();

        return NextResponse.json({ groups, count: groups.length });
    } catch (err: any) {
        console.error('Failed to get groups:', err);
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
        const { action = 'create', name, slug, description, category, privacy, coverImage, avatarImage, groupId } = body;

        const Group = getGroupModel();

        // 1. Create Group
        if (action === 'create') {
            if (!name) {
                return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
            }

            const cleanSlug = (slug || name)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const uniqueSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

            const group = await Group.create({
                name: name.trim(),
                slug: uniqueSlug,
                description: description || '',
                category: category || 'General',
                privacy: privacy === 'private' ? 'private' : 'public',
                coverImage: coverImage || '',
                avatarImage: avatarImage || '',
                creatorId: sessionUser._id,
                admins: [sessionUser._id],
                members: [sessionUser._id],
                rules: body.rules || [],
            });

            return NextResponse.json({ message: 'Group created successfully', group }, { status: 201 });
        }

        // 2. Join / Leave Group
        if (action === 'join' || action === 'leave') {
            if (!groupId) {
                return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
            }

            const group = await Group.findById(groupId);
            if (!group) {
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }

            const userIdObj = new mongoose.Types.ObjectId(String(sessionUser._id));

            if (action === 'join') {
                if (group.privacy === 'private') {
                    if (!group.pendingMembers.some((id) => String(id) === String(sessionUser._id))) {
                        group.pendingMembers.push(userIdObj);
                        await group.save();
                    }
                    return NextResponse.json({ message: 'Join request submitted', status: 'pending' });
                } else {
                    if (!group.members.some((id) => String(id) === String(sessionUser._id))) {
                        group.members.push(userIdObj);
                        await group.save();
                    }
                    return NextResponse.json({ message: 'Joined group', status: 'member' });
                }
            }

            if (action === 'leave') {
                group.members = group.members.filter((id) => String(id) !== String(sessionUser._id));
                group.admins = group.admins.filter((id) => String(id) !== String(sessionUser._id));
                await group.save();
                return NextResponse.json({ message: 'Left group', status: 'none' });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        console.error('Group action error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
