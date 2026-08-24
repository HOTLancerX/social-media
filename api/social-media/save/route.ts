import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialSaveModel, getUserSavedPostIds } from "../../../models/Saves";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getSocialLikeModel } from "../../../models/Like";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        const currentUserId = sessionUser?._id || (sessionUser as any)?.id;
        if (!currentUserId) {
            return NextResponse.json({ posts: [], savedIds: [], total: 0, isSaved: false, authenticated: false });
        }

        const userId = String(currentUserId);
        const SaveModel = getSocialSaveModel();

        // If asking for a single post's saved status for current user
        if (postId) {
            const exists = await (SaveModel as any).exists({
                postId,
                $or: [
                    { userId },
                    ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : []),
                ],
            });
            return NextResponse.json({ isSaved: Boolean(exists) });
        }

        // Fetch strictly only this user's saved post IDs
        const savedPostIds = await getUserSavedPostIds(userId);
        if (savedPostIds.length === 0) {
            return NextResponse.json({ posts: [], total: 0, savedIds: [] });
        }

        const PostModel = getSocialPostModel();
        const validObjectIds = savedPostIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const posts = await (PostModel as any).find({
            $or: [
                { _id: { $in: validObjectIds } },
                { _id: { $in: savedPostIds } },
                { shortId: { $in: savedPostIds } },
            ],
            status: { $nin: ["deleted", "archived"] },
        }).lean();

        // Get user reactions for these posts
        let userReactionsMap: Record<string, string> = {};
        if (posts.length > 0) {
            const postIds = posts.map((p: any) => String(p._id));
            const LikeModel = getSocialLikeModel();
            const userLikes = await (LikeModel as any).find({
                targetType: "post",
                targetId: { $in: postIds },
                userId,
            }).lean();

            userLikes.forEach((l: any) => {
                userReactionsMap[l.targetId] = l.reaction;
            });
        }

        const formattedPosts = posts.map((post: any) => ({
            ...post,
            _id: String(post._id),
            userReaction: userReactionsMap[String(post._id)] || null,
            isSaved: true,
        }));

        return NextResponse.json({
            posts: formattedPosts,
            total: formattedPosts.length,
            savedIds: savedPostIds,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/save error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch saves" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const { postId } = body;

        if (!postId) {
            return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
        }

        if (!sessionUser?._id) {
            return NextResponse.json({ error: "Authentication required. Please log in to save posts." }, { status: 401 });
        }

        const userId = String(sessionUser._id);
        const userName = sessionUser.name || "Member";
        const userImage = sessionUser.image || "";

        const SaveModel = getSocialSaveModel();
        const existingSave: any = await (SaveModel as any).findOne({
            postId,
            $or: [
                { userId },
                ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : []),
            ],
        });

        if (existingSave) {
            // Already saved -> Unsave (Delete)
            await SaveModel.findByIdAndDelete(existingSave._id);
            return NextResponse.json({
                success: true,
                isSaved: false,
                message: "Post removed from saved posts",
            });
        } else {
            // Not saved -> Save (Create)
            await SaveModel.create({
                postId,
                userId,
                userName,
                userImage,
            });
            return NextResponse.json({
                success: true,
                isSaved: true,
                message: "Post saved successfully",
            });
        }
    } catch (error: any) {
        console.error("POST /api/social-media/save error:", error);
        return NextResponse.json({ error: error.message || "Failed to toggle save" }, { status: 500 });
    }
}
