import mongoose, { Schema, type Document, type Types } from "mongoose";
import { type IReactionsCount } from "./SocialMedia";

export interface ISocialComment extends Document {
    _id: Types.ObjectId;
    postId: string;
    parentId?: string | null; // For nested replies
    replyToUserId?: string; // If replying to a specific user
    replyToUserName?: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    userSlug?: string;
    content: string;
    image?: string;
    likesCount: number;
    reactionsCount: IReactionsCount;
    repliesCount: number;
    isPinned: boolean;
    status: "published" | "deleted" | "hidden";
    createdAt: Date;
    updatedAt: Date;
}

const ReactionsCountSchema = new Schema<IReactionsCount>(
    {
        like: { type: Number, default: 0 },
        love: { type: Number, default: 0 },
        care: { type: Number, default: 0 },
        haha: { type: Number, default: 0 },
        wow: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        angry: { type: Number, default: 0 },
    },
    { _id: false }
);

const SocialCommentSchema = new Schema<ISocialComment>(
    {
        postId: { type: String, required: true, index: true },
        parentId: { type: String, default: null, index: true },
        replyToUserId: { type: String, default: "" },
        replyToUserName: { type: String, default: "" },
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: "" },
        userRole: { type: String, default: "User" },
        userSlug: { type: String, default: "" },
        content: { type: String, required: true },
        image: { type: String, default: "" },
        likesCount: { type: Number, default: 0 },
        reactionsCount: {
            type: ReactionsCountSchema,
            default: () => ({
                like: 0,
                love: 0,
                care: 0,
                haha: 0,
                wow: 0,
                sad: 0,
                angry: 0,
            }),
        },
        repliesCount: { type: Number, default: 0 },
        isPinned: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["published", "deleted", "hidden"],
            default: "published",
            index: true,
        },
    },
    { timestamps: true, collection: "social_comments" }
);

SocialCommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export function getSocialCommentModel(): mongoose.Model<ISocialComment> {
    return (
        (mongoose.models.SocialComment as mongoose.Model<ISocialComment>) ||
        mongoose.model<ISocialComment>("SocialComment", SocialCommentSchema)
    );
}

export default getSocialCommentModel;
