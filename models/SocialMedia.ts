import mongoose, { Schema, type Document, type Types } from "mongoose";
import connectDB from "@/lib/mongodb";
import crypto from "crypto";

export type PostType = "text" | "text-bg" | "image" | "video" | "poll";

export interface IBgStyle {
    id: string;
    name?: string;
    gradient: string;
    textColor: string;
    fontFamily?: string;
    pattern?: string;
}

export interface IPollOption {
    id: string;
    text: string;
    votes: string[]; // array of userIds
}

export interface IPollData {
    question: string;
    options: IPollOption[];
    expiresAt?: Date | string;
    allowMultiple?: boolean;
    isClosed?: boolean;
}

export interface IReactionsCount {
    like: number;
    love: number;
    care: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
}

export interface IFeeling {
    emoji: string;
    text: string;
}

export interface ISharedPostSnapshot {
    _id: string;
    shortId?: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    type: PostType;
    content: string;
    bgStyle?: IBgStyle | null;
    images?: string[];
    videos?: string[];
    poll?: IPollData | null;
    createdAt: string | Date;
}

export interface ISocialPostData {
    _id: string;
    shortId: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    userSlug?: string;
    type: PostType;
    content: string;
    bgStyle?: IBgStyle | null;
    images: string[];
    videos: string[];
    poll?: IPollData | null;
    sharedPostId?: string | null;
    sharedPost?: ISharedPostSnapshot | null;
    privacy: "public" | "members" | "private";
    likesCount: number;
    reactionsCount: IReactionsCount;
    commentsCount: number;
    sharesCount: number;
    isPinned: boolean;
    status: "published" | "draft" | "archived" | "deleted";
    tags: string[];
    location?: string;
    feeling?: IFeeling | null;
    source?: "web" | "api" | "auto-post" | "bot";
    scheduledAt?: string | Date | null;
    isScheduled?: boolean;
    createdAt: string | Date;
    updatedAt?: string | Date;
    userReaction?: string | null;
}

export interface ISocialPost extends Document {
    _id: Types.ObjectId;
    shortId: string;
    userId: string;
    userName: string;
    userImage?: string;
    userRole?: string;
    userSlug?: string;
    type: PostType;
    content: string;
    bgStyle?: IBgStyle;
    images: string[];
    videos: string[];
    poll?: IPollData;
    sharedPostId?: string | null;
    sharedPost?: ISharedPostSnapshot | null;
    privacy: "public" | "members" | "private";
    likesCount: number;
    reactionsCount: IReactionsCount;
    commentsCount: number;
    sharesCount: number;
    isPinned: boolean;
    status: "published" | "draft" | "archived" | "deleted";
    tags: string[];
    location?: string;
    feeling?: IFeeling;
    source: "web" | "api" | "auto-post" | "bot";
    scheduledAt?: Date | null;
    isScheduled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export function generateShortId(prefix = "post_"): string {
    const chars = "23456789abcdefghjkmnpqrstuvwxyz"; // base32-like without ambiguous chars
    let randomPart = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < bytes.length; i++) {
        randomPart += chars[bytes[i] % chars.length];
    }
    return `${prefix}${randomPart}`;
}

const BgStyleSchema = new Schema<IBgStyle>(
    {
        id: { type: String, required: true },
        name: { type: String, default: "" },
        gradient: { type: String, required: true },
        textColor: { type: String, default: "#ffffff" },
        fontFamily: { type: String, default: "sans-serif" },
        pattern: { type: String, default: "" },
    },
    { _id: false }
);

const PollOptionSchema = new Schema<IPollOption>(
    {
        id: { type: String, required: true },
        text: { type: String, required: true },
        votes: { type: [String], default: [] },
    },
    { _id: false }
);

const PollDataSchema = new Schema<IPollData>(
    {
        question: { type: String, default: "" },
        options: { type: [PollOptionSchema], default: [] },
        expiresAt: { type: Date },
        allowMultiple: { type: Boolean, default: false },
        isClosed: { type: Boolean, default: false },
    },
    { _id: false }
);

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

const FeelingSchema = new Schema<IFeeling>(
    {
        emoji: { type: String, default: "" },
        text: { type: String, default: "" },
    },
    { _id: false }
);

const SharedPostSnapshotSchema = new Schema<ISharedPostSnapshot>(
    {
        _id: { type: String, required: true },
        shortId: { type: String, default: "" },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: "" },
        userRole: { type: String, default: "User" },
        type: { type: String, default: "text" },
        content: { type: String, default: "" },
        bgStyle: { type: BgStyleSchema, default: null },
        images: { type: [String], default: [] },
        videos: { type: [String], default: [] },
        poll: { type: PollDataSchema, default: null },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const SocialPostSchema = new Schema<ISocialPost>(
    {
        shortId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            default: () => generateShortId("post_"),
        },
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: "" },
        userRole: { type: String, default: "User" },
        userSlug: { type: String, default: "" },
        type: {
            type: String,
            enum: ["text", "text-bg", "image", "video", "poll"],
            default: "text",
            index: true,
        },
        content: { type: String, default: "" },
        bgStyle: { type: BgStyleSchema, default: null },
        images: { type: [String], default: [] },
        videos: { type: [String], default: [] },
        poll: { type: PollDataSchema, default: null },
        sharedPostId: { type: String, default: null, index: true },
        sharedPost: { type: SharedPostSnapshotSchema, default: null },
        privacy: {
            type: String,
            enum: ["public", "members", "private"],
            default: "public",
            index: true,
        },
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
        commentsCount: { type: Number, default: 0 },
        sharesCount: { type: Number, default: 0 },
        isPinned: { type: Boolean, default: false, index: true },
        status: {
            type: String,
            enum: ["published", "draft", "archived", "deleted"],
            default: "published",
            index: true,
        },
        tags: { type: [String], default: [] },
        location: { type: String, default: "" },
        feeling: { type: FeelingSchema, default: null },
        source: {
            type: String,
            enum: ["web", "api", "auto-post", "bot"],
            default: "web",
            index: true,
        },
        scheduledAt: { type: Date, default: null },
        isScheduled: { type: Boolean, default: false, index: true },
    },
    { timestamps: true, collection: "social_posts" }
);

// Compound indexing for optimal feed sorting and querying
SocialPostSchema.index({ status: 1, isPinned: -1, createdAt: -1 });
SocialPostSchema.index({ userId: 1, status: 1, createdAt: -1 });
SocialPostSchema.index({ type: 1, status: 1, createdAt: -1 });
SocialPostSchema.index({ shortId: 1, status: 1 });

export function getSocialPostModel(): mongoose.Model<ISocialPost> {
    return (
        (mongoose.models.SocialPost as mongoose.Model<ISocialPost>) ||
        mongoose.model<ISocialPost>("SocialPost", SocialPostSchema)
    );
}

export default getSocialPostModel;
