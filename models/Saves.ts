import mongoose, { Schema, type Document, type Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "./SocialMedia";

export interface ISocialSave extends Document {
    _id: Types.ObjectId;
    postId: string;
    userId: string;
    userName?: string;
    userImage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SocialSaveSchema = new Schema<ISocialSave>(
    {
        postId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        userName: { type: String, default: "" },
        userImage: { type: String, default: "" },
    },
    { timestamps: true, collection: "social_saves" }
);

// One save entry per user per post
SocialSaveSchema.index({ postId: 1, userId: 1 }, { unique: true });
SocialSaveSchema.index({ userId: 1, createdAt: -1 });

export function getSocialSaveModel(): mongoose.Model<ISocialSave> {
    return (
        (mongoose.models.SocialSave as mongoose.Model<ISocialSave>) ||
        mongoose.model<ISocialSave>("SocialSave", SocialSaveSchema)
    );
}

/**
 * Check if a post is saved by a user
 */
export async function isPostSaved(postId: string, userId: string): Promise<boolean> {
    if (!postId || !userId) return false;
    await connectDB();
    const SaveModel = getSocialSaveModel();
    const exists = await SaveModel.exists({ postId, userId });
    return Boolean(exists);
}

/**
 * Get all saved post IDs for a user
 */
export async function getUserSavedPostIds(userId: string): Promise<string[]> {
    if (!userId) return [];
    await connectDB();
    const SaveModel = getSocialSaveModel();
    const uStr = String(userId);
    const orConds: any[] = [{ userId: uStr }];
    if (mongoose.Types.ObjectId.isValid(uStr)) {
        orConds.push({ userId: new mongoose.Types.ObjectId(uStr) });
    }
    const saves = await (SaveModel as any).find({ $or: orConds }).sort({ createdAt: -1 }).select("postId").lean();
    return saves.map((s: any) => String(s.postId));
}

export default getSocialSaveModel;
