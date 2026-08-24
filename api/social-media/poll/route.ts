import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel, type IPollVoter } from "../../../models/SocialMedia";
import { getFriendshipModel } from "../../../models/Friendship";
import User from "@/models/Users";
import { getAuthSession } from "@/lib/session";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id ? String(sessionUser._id) : null;

        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");
        const optionId = searchParams.get("optionId");

        if (!postId) {
            return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
        }

        const PostModel = getSocialPostModel();
        const post = await PostModel.findById(postId).lean();

        if (!post || !post.poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        // Collect all voter user IDs from all poll options
        const allVoterIds = new Set<string>();
        (post.poll.options || []).forEach((opt: any) => {
            (opt.votes || []).forEach((uid: any) => {
                if (uid) allVoterIds.add(String(uid));
            });
            (opt.voters || []).forEach((v: any) => {
                if (v && v.userId) allVoterIds.add(String(v.userId));
            });
        });

        // Query real user profiles from Users database collection
        const validObjectIds = Array.from(allVoterIds).filter((id) => mongoose.Types.ObjectId.isValid(id));
        const userDocs = await (User as any)
            .find({ _id: { $in: validObjectIds } })
            .select("_id name image slug type")
            .lean();

        const userMap = new Map<string, any>();
        (userDocs || []).forEach((u: any) => {
            userMap.set(String(u._id), u);
        });

        // Query friendships to show "Friend" badge
        const Friendship = getFriendshipModel();
        let friendIds: Set<string> = new Set();
        if (currentUserId) {
            const friendships = await (Friendship as any).find({
                status: "accepted",
                $or: [{ requester: currentUserId }, { recipient: currentUserId }],
            }).lean();

            friendships.forEach((f: any) => {
                const friendId = String(f.requester) === currentUserId ? String(f.recipient) : String(f.requester);
                friendIds.add(friendId);
            });
        }

        // Return rich voters breakdown for each option
        const optionsWithVoters = (post.poll.options || []).map((opt: any) => {
            // Get unique voter IDs for this option
            const optionVoterIds = new Set<string>();
            (opt.votes || []).forEach((uid: any) => {
                if (uid) optionVoterIds.add(String(uid));
            });
            (opt.voters || []).forEach((v: any) => {
                if (v && v.userId) optionVoterIds.add(String(v.userId));
            });

            const voters = Array.from(optionVoterIds).map((uid) => {
                const userDoc = userMap.get(uid);
                const storedVoter = (opt.voters || []).find((v: any) => String(v.userId) === uid);

                const userName = userDoc?.name || storedVoter?.userName || "Community Member";
                const userImage = userDoc?.image || storedVoter?.userImage || "";
                const userSlug = userDoc?.slug || storedVoter?.userSlug || uid;

                return {
                    userId: uid,
                    userName,
                    userImage,
                    userSlug,
                    isFriend: friendIds.has(uid),
                    isSelf: currentUserId ? uid === currentUserId : false,
                };
            });

            return {
                id: opt.id,
                text: opt.text,
                votesCount: Math.max(opt.votes?.length || 0, voters.length),
                voters,
            };
        });

        if (optionId) {
            const target = optionsWithVoters.find((o: any) => o.id === optionId);
            return NextResponse.json({ option: target || null, voters: target?.voters || [] });
        }

        const totalVotesCount = optionsWithVoters.reduce((acc: number, o: any) => acc + o.votesCount, 0);

        return NextResponse.json({
            options: optionsWithVoters,
            totalVotes: totalVotesCount,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/poll error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch poll voters" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const { postId, optionId } = body;

        if (!postId || !optionId) {
            return NextResponse.json({ error: "Post ID and Option ID are required" }, { status: 400 });
        }

        const userId = sessionUser?._id ? String(sessionUser._id) : null;
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

        const voterObj: IPollVoter = {
            userId: String(userId),
            userName: sessionUser?.name || "User",
            userImage: sessionUser?.image || "",
            userSlug: (sessionUser as any)?.slug || "",
        };

        const alreadyVotedOnTarget = targetOption.votes.includes(userId);

        if (!post.poll.allowMultiple) {
            // Single choice: remove user vote and voter entry from all options first
            post.poll.options.forEach((opt) => {
                opt.votes = (opt.votes || []).filter((uid) => uid !== userId);
                opt.voters = (opt.voters || []).filter((v) => String(v.userId) !== userId);
            });

            if (!alreadyVotedOnTarget) {
                targetOption.votes.push(userId);
                targetOption.voters = targetOption.voters || [];
                targetOption.voters.push(voterObj);
            }
        } else {
            // Multiple choice allowed: toggle target option vote and voter entry
            targetOption.voters = targetOption.voters || [];
            if (alreadyVotedOnTarget) {
                targetOption.votes = targetOption.votes.filter((uid) => uid !== userId);
                targetOption.voters = targetOption.voters.filter((v) => String(v.userId) !== userId);
            } else {
                targetOption.votes.push(userId);
                targetOption.voters.push(voterObj);
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
