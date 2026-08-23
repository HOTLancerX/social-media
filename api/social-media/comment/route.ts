import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSocialCommentModel } from "../../../models/Comment";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getSocialLikeModel } from "../../../models/Like";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json({ error: "postId is required" }, { status: 400 });
        }

        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id;

        const CommentModel = getSocialCommentModel();
        
        // Fetch all non-deleted comments for this post
        const comments = await CommentModel.find({
            postId,
            status: { $ne: "deleted" },
        })
            .sort({ isPinned: -1, createdAt: 1 })
            .lean();

        // Get user reactions for these comments if user is logged in
        let userReactionsMap: Record<string, string> = {};
        if (currentUserId && comments.length > 0) {
            const commentIds = comments.map((c) => String(c._id));
            const LikeModel = getSocialLikeModel();
            const likes = await LikeModel.find({
                targetType: "comment",
                targetId: { $in: commentIds },
                userId: currentUserId,
            }).lean();

            likes.forEach((l) => {
                userReactionsMap[l.targetId] = l.reaction;
            });
        }

        // Structure comments into top-level and nested replies
        const topLevel: any[] = [];
        const repliesByParent: Record<string, any[]> = {};

        comments.forEach((c: any) => {
            const formatted = {
                ...c,
                _id: String(c._id),
                userReaction: userReactionsMap[String(c._id)] || null,
                replies: [],
            };

            if (c.parentId) {
                if (!repliesByParent[c.parentId]) {
                    repliesByParent[c.parentId] = [];
                }
                repliesByParent[c.parentId].push(formatted);
            } else {
                topLevel.push(formatted);
            }
        });

        // Attach replies to parents
        topLevel.forEach((parent) => {
            if (repliesByParent[parent._id]) {
                parent.replies = repliesByParent[parent._id];
            }
        });

        return NextResponse.json({
            comments: topLevel,
            totalCount: comments.length,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/comment error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const {
            postId,
            parentId = null,
            replyToUserId = "",
            replyToUserName = "",
            content,
            image = "",
            guestUser = null,
        } = body;

        if (!postId || !content || !content.trim()) {
            return NextResponse.json(
                { error: "Post ID and content are required" },
                { status: 400 }
            );
        }

        let userId = sessionUser?._id;
        let userName = sessionUser?.name;
        let userImage = sessionUser?.image || "";
        let userRole = sessionUser?.type || "User";
        let userSlug = sessionUser?.slug || "";

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required. Please log in to comment." },
                { status: 401 }
            );
        }

        const CommentModel = getSocialCommentModel();
        const PostModel = getSocialPostModel();

        // Create comment
        const newComment = await CommentModel.create({
            postId,
            parentId: parentId || null,
            replyToUserId,
            replyToUserName,
            userId,
            userName,
            userImage,
            userRole,
            userSlug,
            content: content.trim(),
            image: image || "",
            likesCount: 0,
            reactionsCount: {
                like: 0,
                love: 0,
                care: 0,
                haha: 0,
                wow: 0,
                sad: 0,
                angry: 0,
            },
            repliesCount: 0,
            status: "published",
        });

        // Increment post comments count
        if (postId) {
            await PostModel.updateOne(
                { $or: [{ _id: postId }, { shortId: postId }] },
                { $inc: { commentsCount: 1 } }
            );
        }

        // If it's a reply, increment parent comment repliesCount
        if (parentId) {
            await CommentModel.findByIdAndUpdate(parentId, {
                $inc: { repliesCount: 1 },
            });
        }

        // Trigger in-app notifications
        try {
            const { getSocialNotificationModel } = await import("../../../models/Notification");
            const Notification = getSocialNotificationModel();
            const post = await PostModel.findOne({ $or: [{ _id: postId }, { shortId: postId }] }).lean();

            if (post && String(post.userId) !== String(userId)) {
                await Notification.create({
                    recipientId: post.userId,
                    senderId: userId,
                    senderName: userName,
                    senderImage: userImage,
                    senderSlug: sessionUser.slug || "",
                    type: parentId ? "reply" : "comment",
                    targetType: "post",
                    targetId: String(post._id),
                    postSlug: post.shortId || String(post._id),
                    content: content ? content.slice(0, 80) : "commented on your post",
                });
            }

            if (parentId) {
                const parentComment = await CommentModel.findById(parentId).lean();
                if (parentComment && String(parentComment.userId) !== String(userId) && String(parentComment.userId) !== String(post?.userId)) {
                    await Notification.create({
                        recipientId: parentComment.userId,
                        senderId: userId,
                        senderName: userName,
                        senderImage: userImage,
                        senderSlug: sessionUser.slug || "",
                        type: "reply",
                        targetType: "comment",
                        targetId: String(parentComment._id),
                        postSlug: post?.shortId || String(post?._id || ""),
                        content: content ? content.slice(0, 80) : "replied to your comment",
                    });
                }
            }
        } catch (notifErr) {
            console.error("Failed to create comment notification:", notifErr);
        }

        return NextResponse.json(
            {
                success: true,
                comment: {
                    ...newComment.toObject(),
                    _id: String(newComment._id),
                    userReaction: null,
                    replies: [],
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("POST /api/social-media/comment error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to post comment" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const commentId = searchParams.get("id");

        if (!commentId) {
            return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
        }

        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const CommentModel = getSocialCommentModel();
        const PostModel = getSocialPostModel();
        const comment = await CommentModel.findById(commentId);

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const isAuthor = comment.userId === sessionUser._id;
        const isAdmin = sessionUser.type === "admin";

        if (!isAuthor && !isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        await CommentModel.findByIdAndDelete(commentId);

        // Decrement post commentsCount
        await PostModel.findByIdAndUpdate(comment.postId, {
            $inc: { commentsCount: -1 },
        });

        if (comment.parentId) {
            await CommentModel.findByIdAndUpdate(comment.parentId, {
                $inc: { repliesCount: -1 },
            });
        }

        // Also clean up likes on this comment
        const LikeModel = getSocialLikeModel();
        await LikeModel.deleteMany({ targetType: "comment", targetId: commentId });

        return NextResponse.json({ success: true, message: "Comment deleted" });
    } catch (error: any) {
        console.error("DELETE /api/social-media/comment error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete comment" }, { status: 500 });
    }
}
