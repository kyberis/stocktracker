import type { Metadata } from "next";
import { ChatRoom } from "./chat-room";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await props.params;
  return {
    title: "Private Chat — trefolio",
    robots: { index: false, follow: false },
    openGraph: { title: "Private Chat — trefolio" },
    alternates: { canonical: `/chat/${token}` },
  };
}

export default async function ChatPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  return <ChatRoom token={token} />;
}
