import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-dvh bg-gray-50 dark:bg-slate-950 overflow-hidden fixed inset-0">
      {children}
    </main>
  );
}
