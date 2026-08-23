import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type StoryMediaType = 'image' | 'video' | 'text';

export interface IStoryViewer {
    userId: Types.ObjectId | string;
    userName?: string;
    userImage?: string;
    userSlug?: string;
    viewedAt: Date;
}

export interface IStoryReaction {
    userId: Types.ObjectId | string;
    userName?: string;
    userImage?: string;
    userSlug?: string;
    reaction: string;
    createdAt: Date;
}

export interface IStory extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    userImage?: string;
    userSlug?: string;
    mediaType: StoryMediaType;
    mediaUrl?: string;
    textContent?: string;
    bgStyle?: {
        gradient?: string;
        color?: string;
    };
    viewers: IStoryViewer[];
    reactions: IStoryReaction[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StoryViewerSchema = new Schema<IStoryViewer>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, default: '' },
        userImage: { type: String, default: '' },
        userSlug: { type: String, default: '' },
        viewedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const StoryReactionSchema = new Schema<IStoryReaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userName: { type: String, default: '' },
        userImage: { type: String, default: '' },
        userSlug: { type: String, default: '' },
        reaction: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const StorySchema = new Schema<IStory>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        userName: { type: String, required: true },
        userImage: { type: String, default: '' },
        userSlug: { type: String, default: '' },
        mediaType: {
            type: String,
            enum: ['image', 'video', 'text'],
            default: 'image',
        },
        mediaUrl: { type: String, default: '' },
        textContent: { type: String, default: '' },
        bgStyle: {
            gradient: { type: String, default: '' },
            color: { type: String, default: '' },
        },
        viewers: [StoryViewerSchema],
        reactions: [StoryReactionSchema],
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index: auto-delete when expiresAt is reached
        },
    },
    { timestamps: true }
);

export function getStoryModel(): Model<IStory> {
    return (
        (mongoose.models.SocialStory as Model<IStory>) ||
        mongoose.model<IStory>('SocialStory', StorySchema)
    );
}

export default getStoryModel();
