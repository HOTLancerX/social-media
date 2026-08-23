import mongoose, { Schema, type Document, type Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "./SocialMedia";
import { getSocialCommentModel } from "./Comment";

export type ReactionType = "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry";

export interface ISocialLike extends Document {
    _id: Types.ObjectId;
    targetType: "post" | "comment";
    targetId: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    reaction: ReactionType;
    createdAt: Date;
    updatedAt: Date;
}

const SocialLikeSchema = new Schema<ISocialLike>(
    {
        targetType: {
            type: String,
            enum: ["post", "comment"],
            default: "post",
            index: true,
        },
        targetId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: "" },
        userRole: { type: String, default: "User" },
        reaction: {
            type: String,
            enum: ["like", "love", "care", "haha", "wow", "sad", "angry"],
            default: "like",
        },
    },
    { timestamps: true, collection: "social_likes" }
);

// One reaction per user per target
SocialLikeSchema.index({ targetId: 1, userId: 1 }, { unique: true });
SocialLikeSchema.index({ targetId: 1, reaction: 1 });

export function getSocialLikeModel(): mongoose.Model<ISocialLike> {
    return (
        (mongoose.models.SocialLike as mongoose.Model<ISocialLike>) ||
        mongoose.model<ISocialLike>("SocialLike", SocialLikeSchema)
    );
}

/**
 * Helper to recalculate and update reaction counts on target post or comment
 */
export async function syncTargetReactions(targetType: "post" | "comment", targetId: string) {
    await connectDB();
    const LikeModel = getSocialLikeModel();
    
    // Aggregation to get count per reaction
    const counts = await LikeModel.aggregate([
        { $match: { targetId } },
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
    ]);

    const reactionsCount = {
        like: 0,
        love: 0,
        care: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
    };

    let total = 0;
    for (const item of counts) {
        if (item._id in reactionsCount) {
            reactionsCount[item._id as ReactionType] = item.count;
            total += item.count;
        }
    }

    if (targetType === "post") {
        const PostModel = getSocialPostModel();
        if (mongoose.Types.ObjectId.isValid(targetId)) {
            await PostModel.findByIdAndUpdate(targetId, {
                likesCount: total,
                reactionsCount,
            });
        } else {
            await PostModel.findOneAndUpdate({ shortId: targetId }, {
                likesCount: total,
                reactionsCount,
            });
        }
    } else {
        const CommentModel = getSocialCommentModel();
        if (mongoose.Types.ObjectId.isValid(targetId)) {
            await CommentModel.findByIdAndUpdate(targetId, {
                likesCount: total,
                reactionsCount,
            });
        }
    }

    return { total, reactionsCount };
}

export default getSocialLikeModel;
