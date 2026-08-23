import mongoose, { Schema, type Document, type Types } from "mongoose";
import connectDB from "@/lib/mongodb";

export type SharePlatform =
    | "internal" // Reshare / Quote post to personal feed
    | "facebook"
    | "twitter"
    | "whatsapp"
    | "telegram"
    | "linkedin"
    | "reddit"
    | "pinterest"
    | "email"
    | "copy-link"
    | "embed"
    | "native-share";

export interface ISocialShare extends Document {
    _id: Types.ObjectId;
    postId: string; // Target post ID
    userId?: string; // User ID who shared (if logged in)
    userName?: string;
    platform: SharePlatform;
    caption?: string; // If quote-posted
    newPostId?: string; // ID of the resulting new post if quote-posted
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const SocialShareSchema = new Schema<ISocialShare>(
    {
        postId: { type: String, required: true, index: true },
        userId: { type: String, default: "" },
        userName: { type: String, default: "Guest" },
        platform: {
            type: String,
            enum: [
                "internal",
                "facebook",
                "twitter",
                "whatsapp",
                "telegram",
                "linkedin",
                "reddit",
                "pinterest",
                "email",
                "copy-link",
                "embed",
                "native-share",
            ],
            required: true,
            index: true,
        },
        caption: { type: String, default: "" },
        newPostId: { type: String, default: "" },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "social_shares" }
);

SocialShareSchema.index({ postId: 1, platform: 1, createdAt: -1 });

export function getSocialShareModel(): mongoose.Model<ISocialShare> {
    return (
        (mongoose.models.SocialShare as mongoose.Model<ISocialShare>) ||
        mongoose.model<ISocialShare>("SocialShare", SocialShareSchema)
    );
}

export default getSocialShareModel;
