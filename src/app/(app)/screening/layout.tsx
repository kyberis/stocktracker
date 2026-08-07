import type { Metadata } from "next";
import { ScreeningDevLogButton } from "@/components/screening/ScreeningDevLogButton";

export const metadata: Metadata = {
  title: "Investment screening",
  robots: { index: false },
};

/**
 * Shared layout for /screening/** — mounts the temporary Dev agent-log button
 * on every screening page (entry, intake, run progress).
 */
export default function ScreeningLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ScreeningDevLogButton />
    </>
  );
}
