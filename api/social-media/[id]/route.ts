import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getSocialLikeModel } from "../../../models/Like";
import { getSocialCommentModel } from "../../../models/Comment";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

interface RouteContext {
    params: Promise<{ id: string }>;
}

async function findPostByIdOrShortId(id: string) {
    const PostModel = getSocialPostModel();
    if (mongoose.Types.ObjectId.isValid(id)) {
        const byId = await PostModel.findById(id).lean();
        if (byId) return byId;
    }
    // Fallback: search by shortId
    return await PostModel.findOne({ shortId: id }).lean();
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        await connectDB();
        const { id } = await params;

        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id;

        const post = (await findPostByIdOrShortId(id)) as any;

        if (!post || post.status === "deleted") {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const postIdStr = String(post._id);

        let userReaction = null;
        if (currentUserId) {
            const LikeModel = getSocialLikeModel();
            const like = await LikeModel.findOne({
                targetType: "post",
                targetId: postIdStr,
                userId: currentUserId,
            }).lean();
            if (like) userReaction = like.reaction;
        }

        return NextResponse.json({
            post: {
                ...post,
                _id: postIdStr,
                userReaction,
            },
        });
    } catch (error: any) {
        console.error("GET /api/social-media/[id] error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch post" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
    try {
        await connectDB();
        const { id } = await params;
        const sessionUser = await getAuthSession(req);

        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const PostModel = getSocialPostModel();
        let post: any = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            post = await PostModel.findById(id);
        }
        if (!post) {
            post = await PostModel.findOne({ shortId: id });
        }

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const isAuthor = post.userId === sessionUser._id;
        const isAdmin = sessionUser.type === "admin";

        if (!isAuthor && !isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const body = await req.json();
        const { content, privacy, isPinned, tags, location, images, videos, bgStyle, feeling, type } = body;

        if (content !== undefined) {
            post.content = content.trim();
            // Re-extract hashtags
            const hashtagMatches = post.content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g);
            const extractedTags: string[] = Array.isArray(tags) ? [...tags] : [];
            if (hashtagMatches) {
                hashtagMatches.forEach((h: string) => {
                    const tagClean = h.replace(/^#/, "").toLowerCase();
                    if (!extractedTags.includes(tagClean)) {
                        extractedTags.push(tagClean);
                    }
                });
            }
            post.tags = extractedTags;
        }

        if (type !== undefined) post.type = type;
        if (privacy !== undefined) post.privacy = privacy;
        if (isPinned !== undefined && isAdmin) post.isPinned = isPinned;
        if (location !== undefined) post.location = location;
        if (images !== undefined) post.images = Array.isArray(images) ? images : [images].filter(Boolean);
        if (videos !== undefined) post.videos = Array.isArray(videos) ? videos : [videos].filter(Boolean);
        if (bgStyle !== undefined) post.bgStyle = bgStyle;
        if (feeling !== undefined) post.feeling = feeling;

        await post.save();

        return NextResponse.json({ success: true, post });
    } catch (error: any) {
        console.error("PUT /api/social-media/[id] error:", error);
        return NextResponse.json({ error: error.message || "Failed to update post" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
    try {
        await connectDB();
        const { id } = await params;
        const sessionUser = await getAuthSession(req);

        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const PostModel = getSocialPostModel();
        let post: any = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            post = await PostModel.findById(id);
        }
        if (!post) {
            post = await PostModel.findOne({ shortId: id });
        }

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const isAuthor = post.userId === sessionUser._id;
        const isAdmin = sessionUser.type === "admin";

        if (!isAuthor && !isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const postIdStr = String(post._id);

        // Delete post
        await PostModel.findByIdAndDelete(post._id);

        // Cleanup associated comments & likes
        const LikeModel = getSocialLikeModel();
        const CommentModel = getSocialCommentModel();
        await Promise.all([
            LikeModel.deleteMany({ targetId: postIdStr }),
            CommentModel.deleteMany({ postId: postIdStr }),
        ]);

        return NextResponse.json({ success: true, message: "Post deleted" });
    } catch (error: any) {
        console.error("DELETE /api/social-media/[id] error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete post" }, { status: 500 });
    }
}
