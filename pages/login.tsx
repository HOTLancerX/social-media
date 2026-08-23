"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { signIn } from "next-auth/react";
import { useUser } from "@/context/Provider";

const EXPRESS_API = process.env.NEXT_PUBLIC_EXPRESS_API_URL ?? "https://cms.96s.info";

function getLicenseKey(): string {
    return process.env.NEXT_PUBLIC_LICENSE_KEY ?? "";
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "x-license-key": getLicenseKey(),
    };
}

type AuthMode = "login" | "signup";
type SignupTab = "email" | "phone";

export default function SocialLoginPage() {
    const router = useRouter();
    const { refresh } = useUser();

    const [mode, setMode] = useState<AuthMode>("login");
    const isLogin = mode === "login";

    // ── Form State ──
    const [loginValue, setLoginValue] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [signupTab, setSignupTab] = useState<SignupTab>("email");
    const [rememberMe, setRememberMe] = useState(true);

    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // ── Google OAuth ──
    const handleGoogle = async () => {
        setGoogleLoading(true);
        setError("");
        window.location.href = `${EXPRESS_API}/auth/google`;
    };

    // ── Login Handler ──
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (!loginValue.trim() || !password) {
            setError("Please fill in your credentials.");
            return;
        }

        setLoading(true);
        try {
            // 1. Express API login
            const res = await fetch(`${EXPRESS_API}/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    login: loginValue.trim(),
                    password,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = data.message || data.error || "Invalid username/email or password.";
                setError(msg);
                setLoading(false);
                return;
            }

            // 2. NextAuth Session Sync
            const nextAuthRes = await signIn("credentials", {
                redirect: false,
                email: data.user?.email || (loginValue.includes("@") ? loginValue.trim() : `${loginValue.trim()}@user.local`),
                password,
            });

            if (nextAuthRes?.error) {
                // Fallback direct sign-in attempt
                await signIn("credentials", {
                    redirect: false,
                    email: loginValue.trim(),
                    password,
                });
            }

            setSuccessMsg("Welcome back! Redirecting to feed...");
            await refresh?.();

            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 800);
        } catch (err: any) {
            setError(err.message || "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── Sign Up Handler ──
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (signupTab === "email" && !email.trim()) {
            setError("Please enter a valid email address.");
            return;
        }

        if (signupTab === "phone" && !phone.trim()) {
            setError("Please enter a valid phone number.");
            return;
        }

        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            const body: Record<string, any> = {
                name: name.trim(),
                password,
            };

            if (signupTab === "email") {
                body.email = email.trim();
            } else {
                body.phone = phone.trim();
            }

            const res = await fetch(`${EXPRESS_API}/auth/register`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || data.error || "Failed to create account.");
                setLoading(false);
                return;
            }

            // Auto-login after registration
            const loginKey = signupTab === "email" ? email.trim() : phone.trim();
            await signIn("credentials", {
                redirect: false,
                email: loginKey,
                password,
            });

            setSuccessMsg("Account created successfully! Redirecting...");
            await refresh?.();

            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 800);
        } catch (err: any) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50/50 to-indigo-100/60 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-gray-900 selection:bg-blue-600 selection:text-white">
            <style dangerouslySetInnerHTML={{ __html: `
                .nxlogin {
                    display: none !important;
                }
            ` }} />
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
                <div className="lg:col-span-5">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-950/5 border border-gray-200/90 p-6 sm:p-8 space-y-6">
                        
                        {/* Tab Switcher */}
                        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("login");
                                    setError("");
                                    setSuccessMsg("");
                                }}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isLogin
                                        ? "bg-white text-blue-600 shadow-xs"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("signup");
                                    setError("");
                                    setSuccessMsg("");
                                }}
                                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    !isLogin
                                        ? "bg-white text-blue-600 shadow-xs"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Status Messages */}
                        {error && (
                            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2">
                                <Icon icon="solar:danger-triangle-bold" width={16} className="shrink-0 text-red-500" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-medium flex items-center gap-2">
                                <Icon icon="solar:check-circle-bold" width={16} className="shrink-0 text-emerald-500" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {/* Google One-Click Auth */}
                        <button
                            type="button"
                            onClick={handleGoogle}
                            disabled={googleLoading || loading}
                            className="w-full py-2.5 px-4 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-2xs hover:border-gray-400 cursor-pointer disabled:opacity-50"
                        >
                            <Icon icon="logos:google-icon" width={16} />
                            <span>Continue with Google</span>
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-gray-200 w-full" />
                            <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider absolute">
                                or with credentials
                            </span>
                        </div>

                        {/* ── LOGIN FORM ── */}
                        {isLogin ? (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 block">
                                        Email / Phone / Username
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={loginValue}
                                            onChange={(e) => setLoginValue(e.target.value)}
                                            placeholder="Enter your email, phone, or slug"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                        />
                                        <Icon
                                            icon="solar:user-bold"
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                            width={16}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-700 block">
                                            Password
                                        </label>
                                        <a
                                            href="/forgot-password"
                                            className="text-[11px] font-bold text-blue-600 hover:underline"
                                        >
                                            Forgot?
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <Icon
                                                icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"}
                                                width={16}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="rememberMe" className="text-xs text-gray-600 select-none">
                                        Remember this browser
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width={16} />
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:login-2-bold" width={16} />
                                            <span>Sign In to Feeds</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* ── SIGNUP FORM ── */
                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setSignupTab("email")}
                                        className={`pb-1 text-xs font-bold border-b-2 transition ${
                                            signupTab === "email"
                                                ? "border-blue-600 text-blue-600"
                                                : "border-transparent text-gray-400 hover:text-gray-600"
                                        }`}
                                    >
                                        With Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupTab("phone")}
                                        className={`pb-1 text-xs font-bold border-b-2 transition ${
                                            signupTab === "phone"
                                                ? "border-blue-600 text-blue-600"
                                                : "border-transparent text-gray-400 hover:text-gray-600"
                                        }`}
                                    >
                                        With Phone
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 block">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Alex Morgan"
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                    />
                                </div>

                                {signupTab === "email" ? (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 block">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="alex@example.com"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 block">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 555 019 283"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700 block">
                                        Create Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 6 characters"
                                            required
                                            minLength={6}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50 hover:bg-white transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <Icon
                                                icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"}
                                                width={16}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" width={16} />
                                            <span>Creating Account...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:user-plus-bold" width={16} />
                                            <span>Complete Sign Up</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        <p className="text-[11px] text-center text-gray-400">
                            By continuing, you agree to our{" "}
                            <Link href="/terms" className="text-gray-600 hover:underline">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-gray-600 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
