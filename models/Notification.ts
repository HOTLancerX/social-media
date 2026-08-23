import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type NotificationType =
    | 'like'
    | 'reaction'
    | 'comment'
    | 'reply'
    | 'share'
    | 'friend_request'
    | 'friend_accept';

export interface ISocialNotification extends Document {
    _id: Types.ObjectId;
    recipientId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderName: string;
    senderImage?: string;
    senderSlug?: string;
    type: NotificationType;
    reactionType?: string;
    targetType: 'post' | 'comment' | 'user';
    targetId?: string;
    postSlug?: string;
    content?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SocialNotificationSchema = new Schema<ISocialNotification>(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        senderImage: {
            type: String,
            default: '',
        },
        senderSlug: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: ['like', 'reaction', 'comment', 'reply', 'share', 'friend_request', 'friend_accept'],
            required: true,
            index: true,
        },
        reactionType: {
            type: String,
            default: 'like',
        },
        targetType: {
            type: String,
            enum: ['post', 'comment', 'user'],
            default: 'post',
        },
        targetId: {
            type: String,
            default: '',
        },
        postSlug: {
            type: String,
            default: '',
        },
        content: {
            type: String,
            default: '',
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

// Index to query user's latest unread notifications quickly
SocialNotificationSchema.index({ recipientId: 1, createdAt: -1 });

export function getSocialNotificationModel(): Model<ISocialNotification> {
    return (
        (mongoose.models.SocialNotification as Model<ISocialNotification>) ||
        mongoose.model<ISocialNotification>('SocialNotification', SocialNotificationSchema)
    );
}

export default getSocialNotificationModel();
