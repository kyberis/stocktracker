"use client";

import { Suspense } from "react";
import MobileTabBar from "./MobileTabBar";
import CapacitorBridge from "./CapacitorBridge";
import NativePushBridge from "./NativePushBridge";
import NativeLoadingBar from "./mobile/NativeLoadingBar";
import ImpersonationBanner from "./ImpersonationBanner";
import { useNativePlatform } from "@/lib/use-native";

function NativeAppBar() {
  return (
    <div className="bg-slate-950 px-4 py-2 flex items-center gap-2.5">
      <svg className="w-7 h-7 rounded-lg" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="nab-a" x1=".5" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#6ee7b7" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
          <linearGradient id="nab-b" x1="0" y1=".3" x2="1" y2=".7"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient>
          <linearGradient id="nab-c" x1=".5" y1="1" x2=".5" y2="0"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#047857" /></linearGradient>
          <linearGradient id="nab-d" x1="1" y1=".3" x2="0" y2=".7"><stop offset="0%" stopColor="#a7f3d0" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="#0f172a" />
        <g transform="translate(16,16) rotate(45)">
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nab-a)" />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nab-b)" transform="rotate(90)" />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nab-c)" transform="rotate(180)" />
          <ellipse cx="0" cy="-4.8" rx="4" ry="5.8" fill="url(#nab-d)" transform="rotate(270)" />
          <circle cx="0" cy="0" r="1.2" fill="#0f172a" opacity=".35" />
        </g>
      </svg>
      <span className="text-[15px] font-semibold text-white tracking-tight">trefolio</span>
    </div>
  );
}

export default function NativeShell({ children }: { children: React.ReactNode }) {
  const platform = useNativePlatform();

  return (
    <div
      className={`min-h-screen pb-14 native-shell ${platform === "ios" ? "native-ios" : platform === "android" ? "native-android" : ""}`}
      style={{
        fontFamily: "var(--font-primary, inherit)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Sticky app bar — stays pinned above the notch so scrolling never exposes a white gap */}
      <div className="sticky top-0 z-40 bg-slate-950" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <NativeAppBar />
      </div>
      <div className="flex-1" style={{ background: "var(--background, #f9fafb)" }}>
        <ImpersonationBanner />
        <Suspense>
          <NativeLoadingBar />
        </Suspense>
        <main id="main-content">{children}</main>
      </div>
      <MobileTabBar />
      <CapacitorBridge />
      <NativePushBridge />
    </div>
  );
}
