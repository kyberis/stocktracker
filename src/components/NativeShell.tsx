"use client";

import { Suspense } from "react";
import MobileTabBar from "./MobileTabBar";
import CapacitorBridge from "./CapacitorBridge";
import NativePushBridge from "./NativePushBridge";
import NativeLoadingBar from "./mobile/NativeLoadingBar";
import { useNativePlatform } from "@/lib/use-native";

export default function NativeShell({ children }: { children: React.ReactNode }) {
  const platform = useNativePlatform();

  return (
    <div
      className={`min-h-screen pb-14 native-shell ${platform === "ios" ? "native-ios" : platform === "android" ? "native-android" : ""}`}
      style={{
        background: "var(--background, #f9fafb)",
        fontFamily: "var(--font-primary, inherit)",
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Suspense>
        <NativeLoadingBar />
      </Suspense>
      <main id="main-content">{children}</main>
      <MobileTabBar />
      <CapacitorBridge />
      <NativePushBridge />
    </div>
  );
}
