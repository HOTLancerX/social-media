"use client";

import React from "react";
import { Icon } from "@iconify/react";
import AuthForm from "@/components/Auth";

export default function SocialLoginPage() {
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50/50 to-indigo-100/60 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-gray-900 selection:bg-blue-600 selection:text-white">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .nxlogin {
                    display: none !important;
                }
            `,
                }}
            />
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* ── Left Hero Section (Brand & Features) ── */}
                <div className="lg:col-span-7 space-y-6 lg:pr-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-700 text-xs font-bold tracking-wide uppercase shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        Next-Gen Social Community
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                        Connect with friends & <br className="hidden sm:inline" />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600">
                            share your moments.
                        </span>
                    </h1>

                    <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                        Join millions sharing photos, stories, reels, interactive polls, and real-time conversations in one modern social hub.
                    </p>

                    {/* Features highlight pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Icon icon="solar:feed-bold" width={18} />
                            </div>
                            <h4 className="font-bold text-xs text-gray-900">Dynamic Feeds</h4>
                            <p className="text-[11px] text-gray-500">Live stories & multimedia posts</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-2xs space-y-1">
                            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                                <Icon icon="solar:heart-angle-bold" width={18} />
                            </div>
                            <h4 className="font-bold text-xs text-gray-900">Reactions & Emojis</h4>
                            <p className="text-[11px] text-gray-500">Express yourself vividly</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <Icon icon="solar:chat-round-dots-bold" width={18} />
                            </div>
                            <h4 className="font-bold text-xs text-gray-900">Real-Time Chat</h4>
                            <p className="text-[11px] text-gray-500">Seen receipts & instant typing</p>
                        </div>
                    </div>
                </div>

                {/* ── Right Auth Card ── */}
                <div className="lg:col-span-5 flex justify-center">
                    <div className="w-full max-w-md">
                        <AuthForm
                            mode="login"
                            onSuccess={() => {
                                window.location.href = "/";
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
