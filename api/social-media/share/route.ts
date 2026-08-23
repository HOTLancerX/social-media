import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getSocialShareModel, type SharePlatform } from "../../../models/Share";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const {
            postId,
            platform = "copy-link",
            caption = "",
            guestUser = null,
        } = body;

        if (!postId) {
            return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
        }

        const PostModel = getSocialPostModel();
        const ShareModel = getSocialShareModel();

        // Find original target post (by _id or shortId)
        let targetPost: any = null;
        if (mongoose.Types.ObjectId.isValid(postId)) {
            targetPost = await PostModel.findById(postId);
        }
        if (!targetPost) {
            targetPost = await PostModel.findOne({ shortId: postId });
        }

        if (!targetPost || targetPost.status === "deleted") {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        let userId = sessionUser?._id;
        let userName = sessionUser?.name || "Guest";
        let userImage = sessionUser?.image || "";
        let userRole = sessionUser?.type || "User";
        let userSlug = sessionUser?.slug || "";

        // Increment shares count on original post
        targetPost.sharesCount = (targetPost.sharesCount || 0) + 1;
        await targetPost.save();

        let createdPost: any = null;

        // If internal quote-post / reshare to personal feed
        if (platform === "internal") {
            if (!userId) {
                return NextResponse.json(
                    { error: "Authentication required to share to feed" },
                    { status: 401 }
                );
            }

            const sharedSnapshot = {
                _id: String(targetPost._id),
                shortId: targetPost.shortId || "",
                userId: targetPost.userId,
                userName: targetPost.userName,
                userImage: targetPost.userImage,
                userRole: targetPost.userRole,
                type: targetPost.type,
                content: targetPost.content,
                bgStyle: targetPost.bgStyle,
                images: targetPost.images,
                videos: targetPost.videos,
                poll: targetPost.poll,
                createdAt: targetPost.createdAt,
            };

            createdPost = await PostModel.create({
                userId,
                userName,
                userImage,
                userRole,
                userSlug,
                type: "text",
                content: caption.trim(),
                sharedPostId: String(targetPost._id),
                sharedPost: sharedSnapshot,
                privacy: "public",
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0,
                source: "web",
                status: "published",
            });
        }

        // Record share event
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
        const userAgent = req.headers.get("user-agent") || "";

        await ShareModel.create({
            postId: String(targetPost._id),
            userId: userId || "",
            userName: userName || "Guest",
            platform: platform as SharePlatform,
            caption: caption ? caption.trim() : "",
            newPostId: createdPost ? String(createdPost._id) : "",
            ipAddress,
            userAgent,
        });

        // Trigger in-app notification to post author
        if (userId && String(targetPost.userId) !== String(userId)) {
            try {
                const { getSocialNotificationModel } = await import("../../../models/Notification");
                const Notification = getSocialNotificationModel();
                await Notification.create({
                    recipientId: targetPost.userId,
                    senderId: userId,
                    senderName: userName,
                    senderImage: userImage,
                    senderSlug: userSlug,
                    type: "share",
                    targetType: "post",
                    targetId: String(targetPost._id),
                    postSlug: targetPost.shortId || String(targetPost._id),
                    content: caption ? `shared your post: "${caption.slice(0, 50)}"` : "shared your post",
                });
            } catch (notifErr) {
                console.error("Failed to create share notification:", notifErr);
            }
        }

        return NextResponse.json({
            success: true,
            sharesCount: targetPost.sharesCount,
            newPost: createdPost
                ? {
                      ...createdPost.toObject(),
                      _id: String(createdPost._id),
                      userReaction: null,
                  }
                : null,
        });
    } catch (error: any) {
        console.error("POST /api/social-media/share error:", error);
        return NextResponse.json({ error: error.message || "Failed to process share" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json({ error: "postId is required" }, { status: 400 });
        }

        const ShareModel = getSocialShareModel();
        const [shares, platformStats] = await Promise.all([
            ShareModel.find({ postId }).sort({ createdAt: -1 }).limit(50).lean(),
            ShareModel.aggregate([
                { $match: { postId } },
                { $group: { _id: "$platform", count: { $sum: 1 } } },
            ]),
        ]);

        const breakdown: Record<string, number> = {};
        let total = 0;
        platformStats.forEach((p) => {
            breakdown[p._id] = p.count;
            total += p.count;
        });

        return NextResponse.json({
            total,
            breakdown,
            recentShares: shares,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/share error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch share stats" }, { status: 500 });
    }
}
