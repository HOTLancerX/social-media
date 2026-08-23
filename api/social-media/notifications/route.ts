import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getSocialNotificationModel } from '../../../models/Notification';
import { getAuthSession } from '@/lib/session';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        if (!sessionUser?._id) {
            return NextResponse.json({ notifications: [], unreadCount: 0 });
        }

        const userObjId = mongoose.Types.ObjectId.isValid(sessionUser._id)
            ? new mongoose.Types.ObjectId(sessionUser._id)
            : null;

        const Notification = getSocialNotificationModel();
        const filter = {
            $or: [
                { recipientId: sessionUser._id },
                ...(userObjId ? [{ recipientId: userObjId }] : []),
            ],
        };

        const [notifications, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .limit(30)
                .lean(),
            Notification.countDocuments({
                ...filter,
                isRead: false,
            }),
        ]);

        return NextResponse.json({
            notifications,
            unreadCount,
        });
    } catch (err: any) {
        console.error('Failed to get notifications:', err);
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
        const { action = 'mark_read', notificationId } = body;
        const Notification = getSocialNotificationModel();

        const userObjId = mongoose.Types.ObjectId.isValid(sessionUser._id)
            ? new mongoose.Types.ObjectId(sessionUser._id)
            : null;

        const userFilter = {
            $or: [
                { recipientId: sessionUser._id },
                ...(userObjId ? [{ recipientId: userObjId }] : []),
            ],
        };

        if (action === 'mark_all_read') {
            await Notification.updateMany(userFilter, { $set: { isRead: true } });
            return NextResponse.json({ success: true, message: 'All notifications marked as read' });
        }

        if (action === 'mark_read' && notificationId) {
            await Notification.findByIdAndUpdate(notificationId, { $set: { isRead: true } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Failed to update notification:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
