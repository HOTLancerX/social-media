/**
 * plugin/social-media/index.ts — Social Media Feeds Plugin.
 *
 * Facebook-style feed system with:
 *   - Multivariate reactions (Like, Love, Care, Haha, Wow, Sad, Angry)
 *   - Nested comments & 2-level threaded replies
 *   - Rich post types:
 *       • Plain text with auto-link & hashtag parsing
 *       • Colorful background cards (Text-BG) with 15+ curated gradients
 *       • Photos with dynamic mosaic layout & full Lightbox viewer (Gallery integration)
 *       • Custom rich Video player
 *       • Interactive Polls with animated percentage bars
 *   - Multi-platform sharing & quote-posts / reshares
 *   - Automated programmatic posting & auto-replies API
 *   - Short IDs & Standalone Single Post view
 *   - Responsive Header with Logged-in / Logged-out views & User Profile Links
 */

import { addHook, type PluginMeta } from "@/hook";
import SocialFeedsPage from "./pages/feeds";
import SinglePostPage from "./pages/single-post";
import SocialHeader from "./ui/SocialHeader";
import UserProfileDynamicPage from "./profile/UserProfileDynamicPage";
import SocialLoginPage from "./pages/login";

export const PLUGINS: PluginMeta = {
    nx: "social-media",
    name: "Social Media",
    version: "1.0.0",
    description: "Facebook-style feed system with multivariate reactions (Love, Care, Haha, Wow, Sad, Angry), multi-channel sharing, threaded comments, quote-posts, auto-post API, and rich post cards.",
    author: "System",
    path: "https://github.com/HOTLancerX/social-media.git",
    icon: "solar:chat-round-line-bold",
    color: "from-blue-600 to-indigo-600",
};

export function register() {
    // ─── Root Pages (Accessible at /feeds, /login, /user/:slug, /profile/:slug, /post/:id) & Layouts ─
    addHook(
        "root.pages",
        [
            {
                key: "header",
                label: "Social Header",
                type: "header",
                slug: "layout",
                style: "left",
                position: 40,
                active: true,
                component: SocialHeader,
            },
            {
                key: "feeds",
                label: "Social Feeds",
                type: "builder",
                slug: "layout",
                style: "left",
                position: 10,
                active: true,
                component: SocialFeedsPage,
            },
            {
                key: "login",
                label: "Social Login",
                type: "builder",
                slug: "layout",
                style: "left",
                position: 5,
                active: true,
                component: SocialLoginPage,
            },
            {
                key: "social-login",
                label: "Social Login Single",
                type: "single",
                slug: "login",
                style: "left",
                position: 5,
                active: true,
                component: SocialLoginPage,
            },
            {
                key: "social-feed",
                label: "Social Feed",
                type: "single",
                slug: "feeds",
                style: "left",
                position: 11,
                active: true,
                component: SocialFeedsPage,
            },
            {
                key: "social-saves",
                label: "Social saves",
                type: "single",
                slug: "saves",
                style: "left",
                position: 11,
                active: true,
                component: SocialFeedsPage,
            },
            {
                key: "saves",
                label: "Saved Posts",
                type: "single",
                slug: "saves",
                style: "left",
                position: 11,
                active: true,
                component: SocialFeedsPage,
            },
            {
                key: "post",
                label: "Single Post",
                type: "single-post",
                slug: "prefix",
                style: "left",
                position: 12,
                active: true,
                component: SinglePostPage,
            },
            {
                key: "user-profile",
                label: "Social User Profile Dynamic",
                type: "user",
                slug: "dynamic",
                style: "left",
                position: 13,
                active: true,
                component: UserProfileDynamicPage,
            },
            {
                key: "user",
                label: "Social User Profile Prefix",
                type: "profile",
                slug: "prefix",
                style: "left",
                position: 14,
                active: true,
                component: UserProfileDynamicPage,
            },
            {
                key: "profile",
                label: "Social Profile Prefix",
                type: "profile",
                slug: "prefix",
                style: "left",
                position: 15,
                active: true,
                component: UserProfileDynamicPage,
            },
            {
                key: "u",
                label: "Social U Prefix",
                type: "profile",
                slug: "prefix",
                style: "left",
                position: 16,
                active: true,
                component: UserProfileDynamicPage,
            },
        ],
        PLUGINS.nx
    );
}
