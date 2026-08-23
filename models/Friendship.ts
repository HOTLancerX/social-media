import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface IFriendship extends Document {
    _id: Types.ObjectId;
    requesterId: Types.ObjectId;
    recipientId: Types.ObjectId;
    status: FriendshipStatus;
    createdAt: Date;
    updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
    {
        requesterId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'blocked'],
            default: 'pending',
            index: true,
        },
    },
    { timestamps: true }
);

// Compound unique index: only 1 friendship relation per pair of users
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export function getFriendshipModel(): Model<IFriendship> {
    return (
        (mongoose.models.Friendship as Model<IFriendship>) ||
        mongoose.model<IFriendship>('Friendship', FriendshipSchema)
    );
}

export default getFriendshipModel();
