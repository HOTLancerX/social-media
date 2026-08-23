import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export interface IPage extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    category: string;
    bio?: string;
    avatarImage?: string;
    coverImage?: string;
    ownerId: Types.ObjectId;
    admins: Types.ObjectId[];
    followers: Types.ObjectId[];
    likes: Types.ObjectId[];
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    verified: boolean;
    ctaButton?: {
        label: string;
        link: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true, index: true },
        category: { type: String, default: 'Community / Brand' },
        bio: { type: String, default: '' },
        avatarImage: { type: String, default: '' },
        coverImage: { type: String, default: '' },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        website: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        ctaButton: {
            label: { type: String, default: 'Follow' },
            link: { type: String, default: '' },
        },
    },
    { timestamps: true }
);

export function getPageModel(): Model<IPage> {
    return (
        (mongoose.models.SocialPage as Model<IPage>) ||
        mongoose.model<IPage>('SocialPage', PageSchema)
    );
}

export default getPageModel();
