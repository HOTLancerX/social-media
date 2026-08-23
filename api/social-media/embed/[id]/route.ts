import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSocialPostModel } from "../../../../models/SocialMedia";

export const dynamic = "force-dynamic";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
    try {
        await connectDB();
        const { id } = await params;

        const PostModel = getSocialPostModel();
        let post: any = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            post = await PostModel.findById(id).lean();
        }
        if (!post) {
            post = await PostModel.findOne({ shortId: id }).lean();
        }

        if (!post || post.status === "deleted") {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const postUrl = `${baseUrl}/feeds#post-${post.shortId || post._id}`;

        const embedHtml = `
<div class="nx-social-embed" style="max-width: 540px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 16px auto;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        ${
            post.userImage
                ? `<img src="${post.userImage}" alt="${post.userName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />`
                : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${(
                      post.userName || "U"
                  )
                      .charAt(0)
                      .toUpperCase()}</div>`
        }
        <div>
            <div style="font-weight: 700; font-size: 14px; color: #111827;">${post.userName}</div>
            <div style="font-size: 11px; color: #6b7280;">${new Date(
                post.createdAt
            ).toLocaleDateString()}</div>
        </div>
    </div>
    <div style="font-size: 14px; line-height: 1.5; color: #1f2937; margin-bottom: 12px; white-space: pre-line;">${
        post.content || ""
    }</div>
    ${
        post.images && post.images.length > 0
            ? `<div style="border-radius: 12px; overflow: hidden; margin-bottom: 12px;"><img src="${post.images[0]}" alt="Photo" style="width: 100%; max-height: 320px; object-fit: cover;" /></div>`
            : ""
    }
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">
        <div>❤️ ${post.likesCount || 0} reactions • 💬 ${post.commentsCount || 0} comments</div>
        <a href="${postUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-weight: 600; text-decoration: none;">View Post &rarr;</a>
    </div>
</div>
        `.trim();

        return NextResponse.json({
            version: "1.0",
            type: "rich",
            title: `Post by ${post.userName}`,
            author_name: post.userName,
            provider_name: "Social Feeds",
            provider_url: baseUrl,
            html: embedHtml,
            width: 540,
            post,
        });
    } catch (error: any) {
        console.error("GET /api/social-media/embed error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate embed" }, { status: 500 });
    }
}
