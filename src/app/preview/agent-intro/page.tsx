import type { Metadata } from "next";
import AgentIntroPreviewShell from "./preview-shell";

export const metadata: Metadata = {
  title: "Agent intro — design preview",
  robots: { index: false, follow: false },
};

export default function AgentIntroPreviewPage() {
  return <AgentIntroPreviewShell />;
}
