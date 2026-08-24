"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@iconify/react";
import HexAvatar from "../ui/HexAvatar";

interface IMemberItem {
    _id: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    type: "user";
    image?: string;
    status: string;
    city?: string;
    state?: string;
    address?: string;
    createdAt: string;
    bio?: string;
    relationship_status?: string | null;
    occupation?: string | null;
    cover_photo?: string | null;
    level?: number;
    postsCount: number;
    friendshipStatus: "none" | "pending_sent" | "pending_received" | "friends" | "blocked" | "self";
    friendshipId?: string | null;
    isSelf: boolean;
}

export default function MembersPage() {
    const { data: session } = useSession();
    const currentUser = (session?.user as any) || null;

    // ── Search & Filter State ──
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCity, setSelectedCity] = useState("all");
    const [selectedJoined, setSelectedJoined] = useState("all");
    const [hasAvatarOnly, setHasAvatarOnly] = useState(false);
    const [friendshipFilter, setFriendshipFilter] = useState<"all" | "friends" | "not_connected" | "pending">("all");
    const [selectedSort, setSelectedSort] = useState("newest");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // ── Data State ──
    const [members, setMembers] = useState<IMemberItem[]>([]);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch members from API
    const fetchMembers = useCallback(
        async (pageNum: number, append: boolean = false) => {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            try {
                const params = new URLSearchParams();
                if (debouncedSearch) params.set("search", debouncedSearch);
                if (selectedCity && selectedCity !== "all") params.set("city", selectedCity);
                if (selectedJoined && selectedJoined !== "all") params.set("joined", selectedJoined);
                if (hasAvatarOnly) params.set("hasAvatar", "true");
                if (selectedSort) params.set("sort", selectedSort);
                params.set("page", String(pageNum));
                params.set("limit", "12");

                const res = await fetch(`/api/social-media/members?${params.toString()}`);
                const data = await res.json();

                if (res.ok && data.users) {
                    if (append) {
                        setMembers((prev) => [...prev, ...data.users]);
                    } else {
                        setMembers(data.users);
                    }
                    setTotalCount(data.pagination?.total || 0);
                    setHasMore(Boolean(data.pagination?.hasMore));
                    if (data.filters?.availableCities) setAvailableCities(data.filters.availableCities);
                }
            } catch (err) {
                console.error("Error fetching members:", err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [debouncedSearch, selectedCity, selectedJoined, hasAvatarOnly, selectedSort]
    );

    useEffect(() => {
        fetchMembers(1, false);
    }, [fetchMembers]);

    // Filter by friendship relationship locally if set
    const filteredMembers = useMemo(() => {
        if (friendshipFilter === "all") return members;
        if (friendshipFilter === "friends") return members.filter((m) => m.friendshipStatus === "friends");
        if (friendshipFilter === "not_connected") return members.filter((m) => m.friendshipStatus === "none" && !m.isSelf);
        if (friendshipFilter === "pending") return members.filter((m) => m.friendshipStatus === "pending_sent" || m.friendshipStatus === "pending_received");
        return members;
    }, [members, friendshipFilter]);

    // Handle Friend Request Actions
    const handleFriendAction = async (targetUser: IMemberItem) => {
        if (!currentUser?._id) {
            window.location.href = "/login";
            return;
        }

        const uId = targetUser._id;
        setActionLoading((prev) => ({ ...prev, [uId]: true }));

        try {
            let endpointAction = "send";
            if (targetUser.friendshipStatus === "none") {
                endpointAction = "send";
            } else if (targetUser.friendshipStatus === "pending_sent") {
                endpointAction = "cancel";
            } else if (targetUser.friendshipStatus === "pending_received") {
                endpointAction = "accept";
            } else if (targetUser.friendshipStatus === "friends") {
                if (!confirm(`Are you sure you want to remove ${targetUser.name} from friends?`)) {
                    setActionLoading((prev) => ({ ...prev, [uId]: false }));
                    return;
                }
                endpointAction = "remove";
            }

            const res = await fetch("/api/social-media/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: endpointAction,
                    targetUserId: uId,
                    friendshipId: targetUser.friendshipId,
                }),
            });

            if (res.ok) {
                // Optimistic UI Update
                setMembers((prev) =>
                    prev.map((m) => {
                        if (m._id === uId) {
                            let nextStatus: IMemberItem["friendshipStatus"] = "none";
                            if (endpointAction === "send") nextStatus = "pending_sent";
                            else if (endpointAction === "accept") nextStatus = "friends";
                            else if (endpointAction === "cancel" || endpointAction === "remove") nextStatus = "none";

                            return { ...m, friendshipStatus: nextStatus };
                        }
                        return m;
                    })
                );
            }
        } catch (err) {
            console.error("Friend action failed:", err);
        } finally {
            setActionLoading((prev) => ({ ...prev, [uId]: false }));
        }
    };

    const handleResetFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setSelectedCity("all");
        setSelectedJoined("all");
        setHasAvatarOnly(false);
        setFriendshipFilter("all");
        setSelectedSort("newest");
        setPage(1);
    };

    const hasActiveFilters =
        debouncedSearch !== "" ||
        selectedCity !== "all" ||
        selectedJoined !== "all" ||
        hasAvatarOnly ||
        friendshipFilter !== "all" ||
        selectedSort !== "newest";

    return (
        <div className="min-h-screen bg-[#F0F2F5] text-gray-900 pb-20 pt-4">
            <div className="container py-4">
                
                {/* ── Page Header / Hero Banner ── */}
                <div className="mb-6 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
                                <Icon icon="solar:users-group-two-rounded-bold" />
                                Community Members Directory
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                                Find & Connect With Users
                            </h1>
                            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
                                Explore user profiles, make new friends, and expand your personal community circle.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center">
                                <span className="block text-2xl font-black leading-tight">{totalCount}</span>
                                <span className="text-[11px] text-blue-100 font-bold uppercase tracking-wider">Active Users</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 3-Column Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* ═════════════════════════════════════════════════════════════
                        1. LEFT SIDEBAR: Comprehensive User Filters System (Col 1-3)
                       ═════════════════════════════════════════════════════════════ */}
                    <aside className="lg:col-span-3 space-y-5 sticky top-20">
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-5">
                            
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Icon icon="solar:filter-bold" className="text-indigo-600" width={18} />
                                    Filter Users
                                </h3>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
                                    >
                                        Reset All
                                    </button>
                                )}
                            </div>

                            {/* 1. Keyword Search */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Icon icon="solar:magnifer-bold" className="text-gray-400" />
                                    User Search
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Name, @slug, city..."
                                        className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/60 hover:bg-white transition"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <Icon icon="solar:close-circle-bold" width={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 2. Connection / Friendship Status (If Logged In) */}
                            {currentUser && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                        <Icon icon="solar:users-group-rounded-bold" className="text-gray-400" />
                                        Relationship / Friends
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { id: "all", label: "All Users" },
                                            { id: "friends", label: "My Friends" },
                                            { id: "not_connected", label: "Not Connected" },
                                            { id: "pending", label: "Pending" },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFriendshipFilter(item.id as any)}
                                                className={`py-2 px-2 text-center rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                                                    friendshipFilter === item.id
                                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs"
                                                        : "bg-gray-50/80 text-gray-600 border-transparent hover:bg-gray-100"
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Location / City Filter */}
                            {availableCities.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                        <Icon icon="solar:map-point-bold" className="text-gray-400" />
                                        City / Location
                                    </label>
                                    <select
                                        value={selectedCity}
                                        onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-gray-50/60 cursor-pointer"
                                    >
                                        <option value="all">All Locations ({availableCities.length})</option>
                                        {availableCities.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 4. Member Since / Joined Filter */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Icon icon="solar:calendar-date-bold" className="text-gray-400" />
                                    Member Since
                                </label>
                                <select
                                    value={selectedJoined}
                                    onChange={(e) => { setSelectedJoined(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-gray-50/60 cursor-pointer"
                                >
                                    <option value="all">Any Time (All Members)</option>
                                    <option value="month">New This Month (Last 30 Days)</option>
                                    <option value="year">Joined This Year</option>
                                </select>
                            </div>

                            {/* 5. Sort Order */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                    <Icon icon="solar:sort-vertical-bold" className="text-gray-400" />
                                    Sort Order
                                </label>
                                <select
                                    value={selectedSort}
                                    onChange={(e) => { setSelectedSort(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-gray-50/60 cursor-pointer"
                                >
                                    <option value="newest">Recently Joined (Newest)</option>
                                    <option value="name_asc">Name (A to Z)</option>
                                    <option value="name_desc">Name (Z to A)</option>
                                    <option value="oldest">Earliest Members</option>
                                </select>
                            </div>

                            {/* 6. Profile Avatar Checkbox Toggle */}
                            <div className="pt-1 border-t border-gray-100">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hasAvatarOnly}
                                        onChange={(e) => { setHasAvatarOnly(e.target.checked); setPage(1); }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span>Has Profile Avatar Only</span>
                                </label>
                            </div>

                        </div>
                    </aside>

                    {/* ═════════════════════════════════════════════════════════════
                        2. MIDDLE COLUMN: Users List / Cards Grid (Col 4-9)
                       ═════════════════════════════════════════════════════════════ */}
                    <main className="lg:col-span-6 space-y-5">
                        
                        {/* Control & View Bar */}
                        <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/90 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-gray-900">
                                    {filteredMembers.length} {filteredMembers.length === 1 ? "User" : "Users"} Shown
                                </span>
                                {hasActiveFilters && (
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold">
                                        Filtered
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                        viewMode === "grid" ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-500 hover:text-gray-800"
                                    }`}
                                    title="Grid View"
                                >
                                    <Icon icon="solar:widget-4-bold" width={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                        viewMode === "list" ? "bg-white text-indigo-600 shadow-2xs" : "text-gray-500 hover:text-gray-800"
                                    }`}
                                    title="List View"
                                >
                                    <Icon icon="solar:list-bold" width={16} />
                                </button>
                            </div>
                        </div>

                        {/* Loading Skeletons */}
                        {loading && (
                            <div className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-4`}>
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <div key={n} className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/80 animate-pulse space-y-4">
                                        <div className="h-20 bg-gray-200 rounded-2xl" />
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 bg-gray-300 rounded-full" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 bg-gray-300 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && filteredMembers.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-gray-200/90 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                    <Icon icon="solar:user-cross-bold" width={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-gray-900">No users found</h3>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        No community members match your current filter preferences. Try resetting or broadening your search criteria.
                                    </p>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                                    >
                                        Reset All Filters
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Members Grid / List */}
                        {!loading && filteredMembers.length > 0 && (
                            <div className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-4.5`}>
                                {filteredMembers.map((member) => {
                                    const isLoadingAction = Boolean(actionLoading[member._id]);

                                    return (
                                        <div
                                            key={member._id}
                                            className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group"
                                        >
                                            {/* Top Banner Cover */}
                                            <div className="relative h-20 bg-linear-to-r from-slate-800 via-indigo-900 to-blue-900 overflow-hidden">
                                                {member.cover_photo ? (
                                                    <img
                                                        src={member.cover_photo}
                                                        alt="Cover"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-size-[8px_8px]" />
                                                )}
                                                <div className="absolute top-2 right-2">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-2xs bg-slate-100/90 text-slate-700 border-slate-200">
                                                        <Icon icon="solar:user-bold" width={12} />
                                                        User
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Avatar & Info Body */}
                                            <div className="px-4.5 pb-4.5 pt-0 flex-1 flex flex-col">
                                                <div className="flex items-end justify-between -mt-8 mb-2.5">
                                                    <Link href={`/${member.slug || member._id}`} className="block transition-transform hover:scale-105">
                                                        <HexAvatar
                                                            image={member.image}
                                                            name={member.name}
                                                            size="lg"
                                                            isOnline={member.status === "active"}
                                                            level={member.level || 1}
                                                        />
                                                    </Link>

                                                    {member.city && (
                                                        <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/60 truncate max-w-32.5">
                                                            <Icon icon="solar:map-point-bold" className="text-indigo-500 shrink-0" />
                                                            <span className="truncate">{member.city}</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-1 mb-3">
                                                    <Link
                                                        href={`/${member.slug || member._id}`}
                                                        className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition flex items-center gap-1 truncate"
                                                    >
                                                        <span className="truncate">{member.name}</span>
                                                    </Link>
                                                    <p className="text-[11px] font-bold text-gray-400 truncate">
                                                        @{member.slug || member.name.toLowerCase().replace(/\s+/g, "")}
                                                    </p>

                                                    {member.occupation && (
                                                        <p className="text-[11px] text-indigo-600 font-semibold truncate flex items-center gap-1">
                                                            <Icon icon="solar:case-round-bold" width={12} />
                                                            <span>{member.occupation}</span>
                                                        </p>
                                                    )}

                                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pt-0.5">
                                                        {member.bio || "Member of the community."}
                                                    </p>
                                                </div>

                                                {/* Stats Row */}
                                                <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-gray-50/80 rounded-2xl border border-gray-100 text-center mb-4 mt-auto">
                                                    <div>
                                                        <span className="block text-xs font-black text-gray-900">{member.postsCount}</span>
                                                        <span className="text-[10px] text-gray-500 font-medium">Posts</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-black text-gray-900">
                                                            {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 font-medium">Joined</span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <Link
                                                        href={`/${member.slug || member._id}`}
                                                        className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                                                    >
                                                        <Icon icon="solar:user-bold" width={14} />
                                                        Profile
                                                    </Link>

                                                    {!member.isSelf ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFriendAction(member)}
                                                            disabled={isLoadingAction}
                                                            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                                                member.friendshipStatus === "friends"
                                                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                                                    : member.friendshipStatus === "pending_sent"
                                                                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                                                    : member.friendshipStatus === "pending_received"
                                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                                                            }`}
                                                        >
                                                            {isLoadingAction ? (
                                                                <Icon icon="svg-spinners:ring-resize" width={14} />
                                                            ) : member.friendshipStatus === "friends" ? (
                                                                <>
                                                                    <Icon icon="solar:check-circle-bold" width={14} />
                                                                    Friends
                                                                </>
                                                            ) : member.friendshipStatus === "pending_sent" ? (
                                                                <>
                                                                    <Icon icon="solar:clock-circle-bold" width={14} />
                                                                    Sent
                                                                </>
                                                            ) : member.friendshipStatus === "pending_received" ? (
                                                                <>
                                                                    <Icon icon="solar:user-check-bold" width={14} />
                                                                    Accept
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Icon icon="solar:user-plus-bold" width={14} />
                                                                    Connect
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="py-2 px-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center gap-1">
                                                            <Icon icon="solar:star-bold" width={14} className="text-amber-500" />
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Load More Button */}
                        {hasMore && !loading && (
                            <div className="text-center pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        fetchMembers(nextPage, true);
                                    }}
                                    disabled={loadingMore}
                                    className="px-6 py-3 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold shadow-xs hover:border-gray-300 transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width={16} />
                                            <span>Loading more users...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:refresh-bold" width={16} />
                                            <span>Load More Users</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                    </main>

                    {/* ═════════════════════════════════════════════════════════════
                        3. RIGHT SIDEBAR: Space for Advice & Community Guidelines (Col 10-12)
                       ═════════════════════════════════════════════════════════════ */}
                    <aside className="lg:col-span-3 space-y-5 sticky top-20">
                        
                        {/* ── Advice Card 1: Community Guidelines & Networking Tips ── */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-200/90 space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                    <Icon icon="solar:lightbulb-bolt-bold" width={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs text-gray-900">Networking Advice</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">Tips for growing your network</p>
                                </div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-600">
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Complete your profile image & bio to receive more connection requests.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Connect with members in your city or area to discover local events.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Icon icon="solar:check-circle-bold" className="text-emerald-500 shrink-0 mt-0.5" width={15} />
                                    <span>Interact with stories, video reels, and feeds to increase your level.</span>
                                </li>
                            </ul>
                        </div>

                        {/* ── Advice Card 2: Space for Custom Advice & Announcements ── */}
                        <div className="bg-linear-to-br from-indigo-50 via-white to-blue-50/50 rounded-3xl p-5 shadow-xs border border-indigo-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:stars-minimalistic-bold" className="text-indigo-600" width={18} />
                                <h4 className="font-black text-xs text-indigo-900 uppercase tracking-wide">
                                    Member Highlights
                                </h4>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Join active user discussion groups and share your favorite photos and moments with the entire community.
                            </p>
                            <Link
                                href="/groups"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline pt-1"
                            >
                                <span>Explore User Groups</span>
                                <Icon icon="solar:alt-arrow-right-bold" width={14} />
                            </Link>
                        </div>

                        {/* ── Advice Card 3: Dedicated Extensible Space ── */}
                        <div className="border border-dashed border-gray-300 rounded-3xl p-5 text-center bg-gray-50/50 space-y-2">
                            <Icon icon="solar:widget-add-bold" className="text-gray-400 mx-auto" width={24} />
                            <h5 className="text-xs font-bold text-gray-700">Space for Custom Advice</h5>
                            <p className="text-[11px] text-gray-400">
                                This space is reserved for dynamic advice, promo banners, and community widgets.
                            </p>
                        </div>

                    </aside>

                </div>

            </div>
        </div>
    );
}
