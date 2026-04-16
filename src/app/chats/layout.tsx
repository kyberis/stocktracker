import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 h-dvh w-full min-w-0 overflow-hidden bg-gray-50 dark:bg-slate-950">
      {children}
    </main>
  );
}
