import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type GroupPrivacy = 'public' | 'private';

export interface IGroup extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    avatarImage?: string;
    coverImage?: string;
    privacy: GroupPrivacy;
    creatorId: Types.ObjectId;
    admins: Types.ObjectId[];
    moderators: Types.ObjectId[];
    members: Types.ObjectId[];
    pendingMembers: Types.ObjectId[];
    rules: string[];
    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true, index: true },
        description: { type: String, default: '' },
        category: { type: String, default: 'General' },
        avatarImage: { type: String, default: '' },
        coverImage: { type: String, default: '' },
        privacy: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
        },
        creatorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        pendingMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        rules: [{ type: String }],
    },
    { timestamps: true }
);

export function getGroupModel(): Model<IGroup> {
    return (
        (mongoose.models.Group as Model<IGroup>) ||
        mongoose.model<IGroup>('Group', GroupSchema)
    );
}

export default getGroupModel();
