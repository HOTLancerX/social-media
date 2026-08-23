import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const { postId, optionId, guestUser = null } = body;

        if (!postId || !optionId) {
            return NextResponse.json({ error: "Post ID and Option ID are required" }, { status: 400 });
        }

        let userId = sessionUser?._id;
        if (!userId) {
            return NextResponse.json({ error: "Authentication required. Please log in to vote." }, { status: 401 });
        }

        const PostModel = getSocialPostModel();
        const post = await PostModel.findById(postId);

        if (!post || !post.poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        if (post.poll.isClosed || (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date())) {
            return NextResponse.json({ error: "This poll has ended" }, { status: 400 });
        }

        const targetOption = post.poll.options.find((o) => o.id === optionId);
        if (!targetOption) {
            return NextResponse.json({ error: "Invalid poll option" }, { status: 404 });
        }

        const alreadyVotedOnTarget = targetOption.votes.includes(userId);

        if (!post.poll.allowMultiple) {
            // Single choice: remove user vote from all options first
            post.poll.options.forEach((opt) => {
                opt.votes = opt.votes.filter((uid) => uid !== userId);
            });

            if (!alreadyVotedOnTarget) {
                targetOption.votes.push(userId);
            }
        } else {
            // Multiple choice allowed: toggle target option vote
            if (alreadyVotedOnTarget) {
                targetOption.votes = targetOption.votes.filter((uid) => uid !== userId);
            } else {
                targetOption.votes.push(userId);
            }
        }

        post.markModified("poll");
        await post.save();

        return NextResponse.json({
            success: true,
            poll: post.poll,
        });
    } catch (error: any) {
        console.error("POST /api/social-media/poll error:", error);
        return NextResponse.json({ error: error.message || "Failed to submit vote" }, { status: 500 });
    }
}
