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
        const guestId = searchParams.get("guestId");

        const userId = sessionUser?._id || guestId;

        if (!userId) {
            return NextResponse.json({ posts: [], savedIds: [], isSaved: false });
        }

        const SaveModel = getSocialSaveModel();

        // If asking for a single post's saved status
        if (postId) {
            const exists = await SaveModel.exists({ postId, userId });
            return NextResponse.json({ isSaved: Boolean(exists) });
        }

        // Fetch all saved posts for this user
        const savedPostIds = await getUserSavedPostIds(userId);
        if (savedPostIds.length === 0) {
            return NextResponse.json({ posts: [], total: 0 });
        }

        const PostModel = getSocialPostModel();
        const validObjectIds = savedPostIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const posts = await PostModel.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { shortId: { $in: savedPostIds } },
            ],
            status: "published",
        }).lean();

        // Get user reactions for these posts
        let userReactionsMap: Record<string, string> = {};
        if (posts.length > 0) {
            const postIds = posts.map((p) => String(p._id));
            const LikeModel = getSocialLikeModel();
            const userLikes = await LikeModel.find({
                targetType: "post",
                targetId: { $in: postIds },
                userId,
            }).lean();

            userLikes.forEach((l) => {
                userReactionsMap[l.targetId] = l.reaction;
            });
        }

        const formattedPosts = posts.map((post) => ({
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
        const { postId, guestUser = null } = body;

        if (!postId) {
            return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
        }

        let userId = sessionUser?._id;
        let userName = sessionUser?.name;
        let userImage = sessionUser?.image || "";

        if (!userId) {
            return NextResponse.json({ error: "Authentication required. Please log in to save posts." }, { status: 401 });
        }

        const SaveModel = getSocialSaveModel();
        const existingSave = await SaveModel.findOne({ postId, userId });

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
