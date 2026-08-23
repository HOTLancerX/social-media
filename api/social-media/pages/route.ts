import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getPageModel } from '../../../models/Page';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const listType = searchParams.get('list'); // 'my' | 'discover'

        const SocialPage = getPageModel();

        if (slug) {
            const page = await SocialPage.findOne({ slug })
                .populate('ownerId', 'name image slug')
                .populate('followers', 'name image slug')
                .lean();

            if (!page) {
                return NextResponse.json({ error: 'Page not found' }, { status: 404 });
            }

            const isFollowing = sessionUser?._id
                ? (page.followers as any[])?.some((f: any) => String(f._id || f) === String(sessionUser._id))
                : false;
            const isOwner = sessionUser?._id
                ? String(page.ownerId?._id || page.ownerId) === String(sessionUser._id)
                : false;

            return NextResponse.json({ page, isFollowing, isOwner });
        }

        const query: any = {};
        if (listType === 'my' && sessionUser?._id) {
            query.ownerId = sessionUser._id;
        }

        const pages = await SocialPage.find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('ownerId', 'name image slug')
            .lean();

        return NextResponse.json({ pages, count: pages.length });
    } catch (err: any) {
        console.error('Failed to get pages:', err);
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
        const { action = 'create', name, slug, category, bio, coverImage, avatarImage, website, phone, email, address, pageId } = body;

        const SocialPage = getPageModel();

        // 1. Create Page
        if (action === 'create') {
            if (!name) {
                return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
            }

            const cleanSlug = (slug || name)
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const uniqueSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

            const page = await SocialPage.create({
                name: name.trim(),
                slug: uniqueSlug,
                category: category || 'Creator / Brand',
                bio: bio || '',
                coverImage: coverImage || '',
                avatarImage: avatarImage || '',
                website: website || '',
                phone: phone || '',
                email: email || '',
                address: address || '',
                ownerId: sessionUser._id,
                admins: [sessionUser._id],
                followers: [sessionUser._id],
                likes: [sessionUser._id],
            });

            return NextResponse.json({ message: 'Page created successfully', page }, { status: 201 });
        }

        // 2. Follow / Unfollow Page
        if (action === 'follow' || action === 'unfollow') {
            if (!pageId) {
                return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
            }

            const page = await SocialPage.findById(pageId);
            if (!page) {
                return NextResponse.json({ error: 'Page not found' }, { status: 404 });
            }

            const userIdObj = new mongoose.Types.ObjectId(String(sessionUser._id));

            if (action === 'follow') {
                if (!page.followers.some((id) => String(id) === String(sessionUser._id))) {
                    page.followers.push(userIdObj);
                    await page.save();
                }
                return NextResponse.json({ message: 'Followed page', isFollowing: true });
            }

            if (action === 'unfollow') {
                page.followers = page.followers.filter((id) => String(id) !== String(sessionUser._id));
                await page.save();
                return NextResponse.json({ message: 'Unfollowed page', isFollowing: false });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        console.error('Page action error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
