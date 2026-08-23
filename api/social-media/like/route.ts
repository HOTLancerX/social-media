import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialLikeModel, syncTargetReactions, type ReactionType } from "../../../models/Like";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const body = await req.json();
        const {
            targetType = "post",
            targetId,
            reaction = "like",
            guestUser = null,
        } = body;

        if (!targetId) {
            return NextResponse.json({ error: "Target ID is required" }, { status: 400 });
        }

        let userId = sessionUser?._id;
        let userName = sessionUser?.name;
        let userImage = sessionUser?.image || "";
        let userRole = sessionUser?.type || "User";

        if (!userId) {
            return NextResponse.json({ error: "Authentication required. Please log in to react." }, { status: 401 });
        }

        const validReactions: ReactionType[] = ["like", "love", "care", "haha", "wow", "sad", "angry"];
        if (!validReactions.includes(reaction as ReactionType)) {
            return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
        }

        const LikeModel = getSocialLikeModel();
        const existingReaction = await LikeModel.findOne({
            targetType,
            targetId,
            userId,
        });

        let currentReaction: ReactionType | null = null;

        if (existingReaction) {
            if (existingReaction.reaction === reaction) {
                // Clicking the same reaction again removes it (toggle off)
                await LikeModel.findByIdAndDelete(existingReaction._id);
                currentReaction = null;
            } else {
                // Switching reaction (e.g. from like to love)
                existingReaction.reaction = reaction as ReactionType;
                existingReaction.userName = userName;
                existingReaction.userImage = userImage;
                await existingReaction.save();
                currentReaction = reaction as ReactionType;
            }
        } else {
            // New reaction
            await LikeModel.create({
                targetType,
                targetId,
                userId,
                userName,
                userImage,
                userRole,
                reaction,
            });
            currentReaction = reaction as ReactionType;

            // Trigger in-app notification if reacting to another user's post
            try {
                const { getSocialPostModel } = await import("../../../models/SocialMedia");
                const { getSocialNotificationModel } = await import("../../../models/Notification");
                const PostModel = getSocialPostModel();
                const post = await PostModel.findById(targetId).lean();
                if (post && String(post.userId) !== String(userId)) {
                    const Notification = getSocialNotificationModel();
                    await Notification.create({
                        recipientId: post.userId,
                        senderId: userId,
                        senderName: userName,
                        senderImage: userImage,
                        senderSlug: sessionUser.slug || "",
                        type: "reaction",
                        reactionType: reaction,
                        targetType: "post",
                        targetId: String(post._id),
                        postSlug: post.shortId || String(post._id),
                        content: `reacted with ${reaction} to your post`,
                    });
                }
            } catch (notifErr) {
                console.error("Failed to create like notification:", notifErr);
            }
        }

        // Sync counts on target post/comment
        const { total, reactionsCount } = await syncTargetReactions(targetType, targetId);

        return NextResponse.json({
            success: true,
            userReaction: currentReaction,
            likesCount: total,
            reactionsCount,
        });
    } catch (error: any) {
        console.error("POST /api/social-media/like error:", error);
        return NextResponse.json({ error: error.message || "Failed to process reaction" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get("targetId");
        const targetType = searchParams.get("targetType") || "post";
        const reactionFilter = searchParams.get("reaction");

        if (!targetId) {
            return NextResponse.json({ error: "targetId is required" }, { status: 400 });
        }

        const LikeModel = getSocialLikeModel();
        const query: any = { targetId, targetType };
        if (reactionFilter && reactionFilter !== "all") {
            query.reaction = reactionFilter;
        }

        const [likes, countsGroup] = await Promise.all([
            LikeModel.find(query).sort({ updatedAt: -1 }).limit(100).lean(),
            LikeModel.aggregate([
                { $match: { targetId, targetType } },
                { $group: { _id: "$reaction", count: { $sum: 1 } } },
            ]),
        ]);

        const summary: Record<string, number> = {
            all: 0,
            like: 0,
            love: 0,
            care: 0,
            haha: 0,
            wow: 0,
            sad: 0,
            angry: 0,
        };

        let total = 0;
        countsGroup.forEach((cg) => {
            if (cg._id in summary) {
                summary[cg._id] = cg.count;
                total += cg.count;
            }
        });
        summary.all = total;

        // Fetch viewer's friends list to prioritize friends in reaction previews
        let friendIdsSet = new Set<string>();
        if (sessionUser?._id) {
            const { getFriendshipModel } = await import("../../../models/Friendship");
            const Friendship = getFriendshipModel();
            const sId = String(sessionUser._id);
            const sObjId = mongoose.Types.ObjectId.isValid(sId) ? new mongoose.Types.ObjectId(sId) : null;

            const friendConditions: any[] = [{ requesterId: sId }, { recipientId: sId }];
            if (sObjId) {
                friendConditions.push({ requesterId: sObjId }, { recipientId: sObjId });
            }

            const friendships = await Friendship.find({
                $or: friendConditions,
                status: "accepted",
            }).lean();

            friendships.forEach((f: any) => {
                const rId = String(f.requesterId);
                const recId = String(f.recipientId);
                if (rId === sId) friendIdsSet.add(recId);
                else friendIdsSet.add(rId);
            });
        }

        // Fetch live User documents to ensure real, up-to-date photos and slugs
        const { default: User } = await import("@/models/Users");
        const rawUserIds = likes.map((l: any) => String(l.userId)).filter(Boolean);
        const validObjIds = rawUserIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const userDocs = await User.find({
            $or: [
                { _id: { $in: validObjIds } },
                { _id: { $in: rawUserIds } },
            ],
        })
            .select("_id name slug image type status")
            .lean();

        const userMap = new Map<string, any>();
        userDocs.forEach((u: any) => {
            userMap.set(String(u._id), u);
        });

        // Enrich reactions with live user data and friend status
        const enrichedLikes = likes.map((l: any) => {
            const uId = String(l.userId);
            const u = userMap.get(uId);
            const isFriend = friendIdsSet.has(uId);

            return {
                ...l,
                _id: String(l._id),
                userName: u?.name || l.userName || "User",
                userImage: u?.image || l.userImage || "",
                userSlug: u?.slug || "",
                isFriend,
            };
        });

        // Sort: Friends first, then most recent reactions
        enrichedLikes.sort((a, b) => {
            if (a.isFriend && !b.isFriend) return -1;
            if (!a.isFriend && b.isFriend) return 1;
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        });

        const previewReactors = enrichedLikes.slice(0, 5);

        return NextResponse.json({
            likes: enrichedLikes,
            previewReactors,
            summary,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/like error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch reactions list" }, { status: 500 });
    }
}
