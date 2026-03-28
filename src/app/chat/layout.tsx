import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {children}
    </main>
  );
}
