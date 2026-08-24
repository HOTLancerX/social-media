import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel, generateShortId } from "../../../models/SocialMedia";
import { getSocialCommentModel } from "../../../models/Comment";
import { getSocialLikeModel, syncTargetReactions, type ReactionType } from "../../../models/Like";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest, sessionUser: any): boolean {
    if (sessionUser && (sessionUser.type === "admin" || sessionUser.type === "editor")) {
        return true;
    }

    const apiKey = req.headers.get("x-api-key") || req.headers.get("x-license-key");
    const validKey =
        process.env.AUTO_POST_SECRET ||
        process.env.CMS_API_KEY ||
        process.env.NEXT_PUBLIC_LICENSE_KEY;

    if (apiKey && validKey && apiKey === validKey) {
        return true;
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader && validKey && authHeader.replace(/^Bearer\s+/i, "") === validKey) {
        return true;
    }

    return false;
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);

        if (!isAuthorized(req, sessionUser)) {
            return NextResponse.json(
                {
                    error: "Unauthorized: Valid API Key (x-api-key header) or Admin session required for automation",
                },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            action = "create-post",
            author = {
                id: sessionUser?._id || "system_bot",
                name: sessionUser?.name || "Auto Bot",
                image: sessionUser?.image || "",
                role: sessionUser?.type || "Automated",
            },
            postData = {},
            commentData = {},
            reactData = {},
        } = body;

        const PostModel = getSocialPostModel();
        const CommentModel = getSocialCommentModel();
        const LikeModel = getSocialLikeModel();

        // ACTION 1: Publish Scheduled Posts
        if (action === "publish-scheduled") {
            const now = new Date();
            const result = await PostModel.updateMany(
                {
                    isScheduled: true,
                    scheduledAt: { $lte: now },
                },
                {
                    $set: {
                        status: "published",
                        isScheduled: false,
                    },
                }
            );

            return NextResponse.json({
                success: true,
                message: `Published ${result.modifiedCount} scheduled posts`,
                count: result.modifiedCount,
            });
        }

        // ACTION 2: Create Automated Post
        if (action === "create-post" || action === "post") {
            const {
                type = "text",
                content = "",
                bgStyle = null,
                images = [],
                videos = [],
                poll = null,
                tags = [],
                location = "",
                privacy = "public",
                scheduledAt = null,
                source = "api",
            } = postData;

            if (type === "text" && !content.trim()) {
                return NextResponse.json({ error: "Content required" }, { status: 400 });
            }

            const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
            const status = isScheduled ? "draft" : "published";

            const newPost = await PostModel.create({
                shortId: generateShortId("post_"),
                userId: author.id || "auto_bot",
                userName: author.name || "Auto Publisher",
                userImage: author.image || "",
                userRole: author.role || "Automated",
                type,
                content: content.trim(),
                bgStyle: type === "text-bg" ? bgStyle : null,
                images: Array.isArray(images) ? images : [],
                videos: Array.isArray(videos) ? videos : [],
                poll: poll || null,
                privacy,
                tags: Array.isArray(tags) ? tags : [],
                location: location || "",
                source: source || "auto-post",
                scheduledAt: isScheduled ? new Date(scheduledAt) : null,
                isScheduled: Boolean(isScheduled),
                status,
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0,
            });

            return NextResponse.json(
                {
                    success: true,
                    post: newPost,
                    permalink: `/feeds#post-${newPost?.shortId || (newPost as any)?._id || ''}`,
                },
                { status: 201 }
            );
        }

        // ACTION 3: Create Automated Comment or Reply
        if (action === "create-comment" || action === "comment" || action === "auto-reply") {
            const {
                postId,
                parentId = null,
                replyToUserId = "",
                replyToUserName = "",
                content = "",
            } = commentData;

            if (!postId || !content.trim()) {
                return NextResponse.json(
                    { error: "postId and content are required for comment" },
                    { status: 400 }
                );
            }

            const newComment = await CommentModel.create({
                postId,
                parentId: parentId || null,
                replyToUserId,
                replyToUserName,
                userId: author.id || "auto_bot",
                userName: author.name || "Bot Assistant",
                userImage: author.image || "",
                userRole: author.role || "Automated",
                content: content.trim(),
                likesCount: 0,
                repliesCount: 0,
                status: "published",
            });

            await PostModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
            if (parentId) {
                await CommentModel.findByIdAndUpdate(parentId, { $inc: { repliesCount: 1 } });
            }

            return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
        }

        // ACTION 4: Automated Reaction
        if (action === "react") {
            const { targetType = "post", targetId, reaction = "like" } = reactData;
            if (!targetId) {
                return NextResponse.json({ error: "targetId required" }, { status: 400 });
            }

            await LikeModel.findOneAndUpdate(
                { targetType, targetId, userId: author.id || "auto_bot" },
                {
                    targetType,
                    targetId,
                    userId: author.id || "auto_bot",
                    userName: author.name || "Auto Bot",
                    userImage: author.image || "",
                    userRole: author.role || "Automated",
                    reaction: reaction as ReactionType,
                },
                { upsert: true, new: true }
            );

            const synced = await syncTargetReactions(targetType, targetId);
            return NextResponse.json({ success: true, ...synced });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("POST /api/social-media/auto-post error:", error);
        return NextResponse.json({ error: error.message || "Auto post error" }, { status: 500 });
    }
}
