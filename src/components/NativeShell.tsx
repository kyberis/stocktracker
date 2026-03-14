"use client";

import MobileTabBar from "./MobileTabBar";
import CapacitorBridge from "./CapacitorBridge";
import NativePushBridge from "./NativePushBridge";

export default function NativeShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen pb-14"
      style={{
        background: "var(--background)",
        fontFamily: "var(--font-primary, inherit)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <main id="main-content">{children}</main>
      <MobileTabBar />
      <CapacitorBridge />
      <NativePushBridge />
    </div>
  );
}
