"use client";

import dynamic from "next/dynamic";
import AgentDock from "@/components/AgentDock";
import { useAgentChrome } from "@/contexts/agent-chrome-context";

const WarrenDrawer = dynamic(() => import("@/components/warren/WarrenDrawer"), { ssr: false });
const ClaraLandingModal = dynamic(() => import("@/components/clara/ClaraLandingModal"), { ssr: false });
const FeedbackModal = dynamic(() => import("@/components/FeedbackModal"), { ssr: false });
const SupportChatWidget = dynamic(() => import("@/components/SupportChatWidget"), { ssr: false });

/** Global dock + drawers/modals. Mount only in default/studio AppShell and demo. */
export default function AgentChromeHost() {
  const {
    demoMode,
    warrenOpen,
    closeWarren,
    claraOpen,
    closeClara,
    feedbackOpen,
    closeFeedback,
    supportChatOpen,
    closeSupportChat,
    openFeedback,
    supportChatWelcome,
    showFeedbackChip,
    showSupportChip,
  } = useAgentChrome();

  return (
    <>
      <AgentDock />
      {!demoMode && (
        <WarrenDrawer isOpen={warrenOpen} onClose={closeWarren} side="right" />
      )}
      {!demoMode && <ClaraLandingModal open={claraOpen} onClose={closeClara} />}
      {showFeedbackChip && feedbackOpen && (
        <FeedbackModal isOpen={feedbackOpen} onClose={closeFeedback} />
      )}
      {showSupportChip && supportChatOpen && (
        <SupportChatWidget
          isOpen={supportChatOpen}
          onClose={closeSupportChat}
          onEscalate={() => {
            closeSupportChat();
            openFeedback();
          }}
          welcomeMessage={supportChatWelcome}
        />
      )}
    </>
  );
}
