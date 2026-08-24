import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/Users";
import UserInfo from "@/models/Users_info";
import { getFriendshipModel } from "../../../models/Friendship";
import { getSocialPostModel } from "../../../models/SocialMedia";
import { getAuthSession } from "@/lib/session";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const sessionUser = await getAuthSession(req);
        const { searchParams } = new URL(req.url);

        const search = searchParams.get("search")?.trim() || "";
        const city = searchParams.get("city")?.trim() || "";
        const status = searchParams.get("status")?.trim() || "";
        const hasAvatar = searchParams.get("hasAvatar")?.trim() || "";
        const joined = searchParams.get("joined")?.trim() || "";
        const sort = searchParams.get("sort")?.trim() || "newest";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
        const skip = (page - 1) * limit;

        // Build Mongo Query: STRICTLY TYPE="user"
        const query: any = {
            type: "user",
        };

        // 1. Text Search (name, slug, email, city, state, address)
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { name: regex },
                { slug: regex },
                { email: regex },
                { city: regex },
                { state: regex },
                { address: regex },
            ];
        }

        // 2. City / Location Filter
        if (city && city !== "all") {
            query.city = new RegExp(city, "i");
        }

        // 3. Status Filter
        if (status && status !== "all") {
            query.status = status;
        }

        // 4. Has Avatar Filter
        if (hasAvatar === "true") {
            query.image = { $nin: ["", null] };
        }

        // 5. Date Joined Filter
        if (joined === "month") {
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            query.createdAt = { $gte: lastMonth };
        } else if (joined === "year") {
            const lastYear = new Date();
            lastYear.setDate(lastYear.getDate() - 365);
            query.createdAt = { $gte: lastYear };
        }

        // Build Sorting
        let sortOption: any = { createdAt: -1 };
        if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        } else if (sort === "name_asc") {
            sortOption = { name: 1 };
        } else if (sort === "name_desc") {
            sortOption = { name: -1 };
        }

        // Fetch matching users and total count in parallel
        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        if (!users || users.length === 0) {
            return NextResponse.json({
                users: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                    hasMore: false,
                },
            });
        }

        const userIds = users.map((u) => u._id);
        const userStrIds = users.map((u) => String(u._id));

        // Fetch UserInfo records for these users (bio, cover_photo, location_city, etc.)
        const infoDocs = await UserInfo.find({
            userId: { $in: userIds },
        }).lean();

        const infoMap: Record<string, Record<string, string>> = {};
        infoDocs.forEach((info: any) => {
            const uid = String(info.userId);
            if (!infoMap[uid]) infoMap[uid] = {};
            infoMap[uid][info.name] = info.value;
        });

        // Fetch Post Counts per user
        const SocialPost = getSocialPostModel();
        const postCounts = await (SocialPost as any).aggregate([
            { $match: { userId: { $in: [...userIds, ...userStrIds] }, status: "published" } },
            { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]).catch(() => []);

        const postCountMap: Record<string, number> = {};
        (postCounts || []).forEach((p: any) => {
            postCountMap[String(p._id)] = p.count;
        });

        // Fetch Friendship relationships if viewer is logged in
        const Friendship = getFriendshipModel();
        const friendshipMap: Record<string, { status: string; friendshipId?: string }> = {};

        if (sessionUser?._id) {
            const currentUserId = String(sessionUser._id);
            const currentUserObjId = mongoose.Types.ObjectId.isValid(currentUserId)
                ? new mongoose.Types.ObjectId(currentUserId)
                : null;

            const friendConditions: any[] = [
                { requesterId: currentUserId, recipientId: { $in: userStrIds } },
                { requesterId: { $in: userStrIds }, recipientId: currentUserId },
            ];

            if (currentUserObjId) {
                friendConditions.push(
                    { requesterId: currentUserObjId, recipientId: { $in: userIds } },
                    { requesterId: { $in: userIds }, recipientId: currentUserObjId }
                );
            }

            const friendships: any[] = await (Friendship as any).find({
                $or: friendConditions,
            }).lean().catch(() => []);

            friendships.forEach((f) => {
                const reqId = String(f.requesterId);
                const recId = String(f.recipientId);
                const otherId = reqId === currentUserId ? recId : reqId;

                let relationStatus = "none";
                if (f.status === "accepted") {
                    relationStatus = "friends";
                } else if (f.status === "pending") {
                    relationStatus = reqId === currentUserId ? "pending_sent" : "pending_received";
                } else if (f.status === "blocked") {
                    relationStatus = "blocked";
                }

                friendshipMap[otherId] = {
                    status: relationStatus,
                    friendshipId: String(f._id),
                };
            });
        }

        // Format and enrich users list
        const enrichedUsers = users.map((u) => {
            const uId = String(u._id);
            const userInfos = infoMap[uId] || {};
            const isSelf = sessionUser?._id ? String(sessionUser._id) === uId : false;

            const friendship = isSelf
                ? { status: "self" }
                : friendshipMap[uId] || { status: "none" };

            const displayCity = userInfos.location_city || u.city || "";
            const displayHometown = userInfos.location_hometown || u.state || "";

            return {
                _id: uId,
                name: u.name || "Member",
                slug: u.slug || uId,
                email: u.email || "",
                phone: u.phone || "",
                type: "user",
                image: u.image || "",
                status: u.status || "active",
                city: displayCity,
                state: displayHometown,
                address: u.address || "",
                createdAt: u.createdAt,
                bio: userInfos.bio || userInfos.headline || "Community Member",
                relationship_status: userInfos.relationship_status || null,
                occupation: userInfos.occupation || userInfos.work_title || null,
                cover_photo: userInfos.cover_photo || null,
                level: parseInt(userInfos.level || "1", 10),
                postsCount: postCountMap[uId] || 0,
                friendshipStatus: friendship.status,
                friendshipId: friendship.friendshipId || null,
                isSelf,
            };
        });

        // Fetch distinct list of available cities strictly for type: "user"
        const cities = await (User as any).distinct("city", {
            type: "user",
            city: { $nin: ["", null] },
        }).catch(() => []);

        // Stats summary for type: "user"
        const [totalActive, totalWithAvatars] = await Promise.all([
            User.countDocuments({ type: "user", status: "active" }).catch(() => 0),
            User.countDocuments({ type: "user", image: { $nin: ["", null] } }).catch(() => 0),
        ]);

        return NextResponse.json({
            users: enrichedUsers,
            filters: {
                availableCities: cities || [],
                totalActive,
                totalWithAvatars,
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + users.length < total,
            },
        });
    } catch (error: any) {
        console.error("Error fetching members:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch members" },
            { status: 500 }
        );
    }
}
