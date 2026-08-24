import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel, type PostType } from "../../models/SocialMedia";
import { getSocialLikeModel } from "../../models/Like";
import { getFriendshipModel } from "../../models/Friendship";
import { getUserSavedPostIds } from "../../models/Saves";
import { getAuthSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function autoScrapeUrl(targetUrl: string): Promise<any | null> {
    try {
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }
        const parsedUrl = new URL(targetUrl);
        const hostname = parsedUrl.hostname.replace(/^www\./i, '');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return {
                url: targetUrl,
                title: hostname,
                description: '',
                image: '',
                siteName: hostname,
                favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
                price: null,
                currency: '',
                type: 'website',
            };
        }

        const html = await response.text();

        const decodeEntities = (str: string) =>
            str
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&#x2F;/g, '/')
                .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));

        const extractMeta = (nameOrProp: string): string | null => {
            const escaped = nameOrProp.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
            const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
            const match1 = html.match(regex1);
            if (match1 && match1[1]) return decodeEntities(match1[1].trim());
            const match2 = html.match(regex2);
            if (match2 && match2[1]) return decodeEntities(match2[1].trim());
            return null;
        };

        const resolveUrl = (rel: string) => {
            try {
                return new URL(rel, targetUrl).href;
            } catch {
                return rel;
            }
        };

        let title = extractMeta('og:title') || extractMeta('twitter:title') || extractMeta('title') || '';
        if (!title) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) title = decodeEntities(titleMatch[1].trim());
        }

        let description = extractMeta('og:description') || extractMeta('twitter:description') || extractMeta('description') || '';
        let image = extractMeta('og:image') || extractMeta('og:image:secure_url') || extractMeta('twitter:image') || '';
        if (!image) {
            const imgMatch = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
            if (imgMatch && imgMatch[1]) image = imgMatch[1];
        }
        if (image) image = resolveUrl(image);

        let siteName = extractMeta('og:site_name') || hostname;
        let favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

        let price: any = extractMeta('product:price:amount') || extractMeta('og:price:amount') || extractMeta('price') || null;
        let currency = extractMeta('product:price:currency') || extractMeta('og:price:currency') || '';

        return {
            url: targetUrl,
            title: title || hostname,
            description: description || '',
            image: image || '',
            siteName,
            favicon,
            price,
            currency,
            type: extractMeta('og:type') || 'website',
        };
    } catch {
        return null;
    }
}

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

        const tab = searchParams.get("tab");

        // Saves tab / type filter (strictly user's own saved posts)
        if (tab === "saves" || type === "saves") {
            if (!currentUserId) {
                return NextResponse.json({
                    posts: [],
                    page,
                    limit,
                    total: 0,
                    hasMore: false,
                    savedIds: [],
                });
            }
            const savedPostIds = await getUserSavedPostIds(String(currentUserId));
            if (savedPostIds.length === 0) {
                return NextResponse.json({
                    posts: [],
                    page,
                    limit,
                    total: 0,
                    hasMore: false,
                    savedIds: [],
                });
            }
            const validObjectIds = savedPostIds
                .filter((id) => mongoose.Types.ObjectId.isValid(id))
                .map((id) => new mongoose.Types.ObjectId(id));
            query.$or = [
                { _id: { $in: validObjectIds } },
                { shortId: { $in: savedPostIds } },
            ];
        } else if (type === "friends") {
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
            linkPreview = null,
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

        // Auto-extract and scrape URL link preview if not provided by client
        let finalLinkPreview = linkPreview && linkPreview.url ? linkPreview : null;
        if (!finalLinkPreview && content) {
            const urlMatch = content.match(/https?:\/\/[^\s]+/i);
            if (urlMatch && urlMatch[0]) {
                const detectedUrl = urlMatch[0].trim();
                finalLinkPreview = await autoScrapeUrl(detectedUrl);
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
            linkPreview: finalLinkPreview,
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
