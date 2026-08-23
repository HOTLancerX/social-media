import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel, type PostType } from "../../models/SocialMedia";
import { getSocialLikeModel } from "../../models/Like";
import { getFriendshipModel } from "../../models/Friendship";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
        const type = searchParams.get("type") || "all";
        const authorId = searchParams.get("userId");
        const search = searchParams.get("search");
        const tag = searchParams.get("tag");

        const sessionUser = await getAuthSession(req);
        const currentUserId = sessionUser?._id;

        const PostModel = getSocialPostModel();
        const Friendship = getFriendshipModel();
        const query: any = { status: "published" };

        if (authorId) {
            query.userId = authorId;
        }

        if (tag) {
            query.tags = tag;
        }

        if (search && search.trim()) {
            query.$or = [
                { content: { $regex: search.trim(), $options: "i" } },
                { "poll.question": { $regex: search.trim(), $options: "i" } },
                { userName: { $regex: search.trim(), $options: "i" } },
            ];
        }

        // ── Friend Feed / Dynamic Ranking ──
        let friendIds: any[] = [];
        if (currentUserId) {
            const friendships = await Friendship.find({
                $or: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
                status: "accepted",
            }).lean();

            friendIds = friendships.map((f: any) =>
                String(f.requesterId) === String(currentUserId) ? f.recipientId : f.requesterId
            );
        }

        // Type filter
        if (type === "friends") {
            if (currentUserId && friendIds.length > 0) {
                query.userId = { $in: [...friendIds, currentUserId] };
            } else if (currentUserId) {
                query.userId = currentUserId;
            }
        } else if (type === "my-posts" && currentUserId) {
            query.userId = currentUserId;
        } else if (type === "images" || type === "image") {
            query.type = "image";
        } else if (type === "videos" || type === "video") {
            query.type = "video";
        } else if (type === "polls" || type === "poll") {
            query.type = "poll";
        } else if (type === "text" || type === "text-bg") {
            query.type = type;
        }

        let sort: any = { isPinned: -1, createdAt: -1 };
        if (type === "popular") {
            sort = { isPinned: -1, likesCount: -1, commentsCount: -1, createdAt: -1 };
        }

        const skip = (page - 1) * limit;

        const [posts, total] = await Promise.all([
            PostModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
            PostModel.countDocuments(query),
        ]);

        // If user is authenticated, look up their reactions on these posts
        let userReactionsMap: Record<string, string> = {};
        if (currentUserId && posts.length > 0) {
            const postIds = posts.map((p) => String(p._id));
            const LikeModel = getSocialLikeModel();
            const userLikes = await LikeModel.find({
                targetType: "post",
                targetId: { $in: postIds },
                userId: currentUserId,
            }).lean();

            userLikes.forEach((l) => {
                userReactionsMap[l.targetId] = l.reaction;
            });
        }

        const formattedPosts = posts.map((post) => ({
            ...post,
            _id: String(post._id),
            userReaction: userReactionsMap[String(post._id)] || null,
        }));

        return NextResponse.json({
            posts: formattedPosts,
            pagination: {
                total,
                page,
                limit,
                hasMore: skip + posts.length < total,
            },
        });
    } catch (error: any) {
        console.error("GET /api/social-media error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch feeds" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);

        const body = await req.json();
        const {
            type = "text",
            content = "",
            bgStyle = null,
            images = [],
            videos = [],
            poll = null,
            privacy = "public",
            tags = [],
            location = "",
            feeling = null,
            guestUser = null, // Fallback if guest posting is enabled
        } = body;

        let userId = sessionUser?._id;
        let userName = sessionUser?.name;
        let userImage = sessionUser?.image || "";
        let userRole = sessionUser?.type || "User";
        let userSlug = sessionUser?.slug || "";

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required. Please log in to create a post." },
                { status: 401 }
            );
        }

        // Basic validation
        if (type === "text" && !content.trim()) {
            return NextResponse.json(
                { error: "Post content cannot be empty" },
                { status: 400 }
            );
        }

        if (type === "text-bg" && (!content.trim() || !bgStyle)) {
            return NextResponse.json(
                { error: "Background post requires text and a background style" },
                { status: 400 }
            );
        }

        if (type === "image" && (!images || images.length === 0)) {
            return NextResponse.json(
                { error: "Please attach at least one image" },
                { status: 400 }
            );
        }

        if (type === "video" && (!videos || videos.length === 0)) {
            return NextResponse.json(
                { error: "Please attach a video" },
                { status: 400 }
            );
        }

        if (type === "poll") {
            if (!poll || !poll.question || !poll.options || poll.options.length < 2) {
                return NextResponse.json(
                    { error: "Poll requires a question and at least 2 options" },
                    { status: 400 }
                );
            }
        }

        // Format poll options with IDs if needed
        let formattedPoll = null;
        if (type === "poll" && poll) {
            formattedPoll = {
                question: poll.question.trim(),
                options: poll.options.map((opt: any, idx: number) => ({
                    id: opt.id || `opt_${idx + 1}_${Date.now()}`,
                    text: typeof opt === "string" ? opt.trim() : opt.text.trim(),
                    votes: [],
                })),
                expiresAt: poll.expiresAt ? new Date(poll.expiresAt) : undefined,
                allowMultiple: Boolean(poll.allowMultiple),
                isClosed: false,
            };
        }

        // Extract hashtags from content if any
        const extractedTags: string[] = Array.isArray(tags) ? [...tags] : [];
        if (content) {
            const hashtagMatches = content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g);
            if (hashtagMatches) {
                hashtagMatches.forEach((h: string) => {
                    const tagClean = h.replace(/^#/, "").toLowerCase();
                    if (!extractedTags.includes(tagClean)) {
                        extractedTags.push(tagClean);
                    }
                });
            }
        }

        const PostModel = getSocialPostModel();
        const newPost = await PostModel.create({
            userId,
            userName,
            userImage,
            userRole,
            userSlug,
            type,
            content: content.trim(),
            bgStyle: type === "text-bg" ? bgStyle : null,
            images: Array.isArray(images) ? images : [images].filter(Boolean),
            videos: Array.isArray(videos) ? videos : [videos].filter(Boolean),
            poll: formattedPoll,
            privacy,
            tags: extractedTags,
            location: location ? location.trim() : "",
            feeling: feeling && feeling.emoji ? feeling : null,
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
            commentsCount: 0,
            sharesCount: 0,
            isPinned: false,
            status: "published",
        });

        return NextResponse.json(
            { success: true, post: newPost },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("POST /api/social-media error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create post" },
            { status: 500 }
        );
    }
}
