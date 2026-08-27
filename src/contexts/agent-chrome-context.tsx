"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { usePortfolio } from "@/lib/portfolio-context";

export type AgentChromeContextValue = {
  demoMode: boolean;
  warrenOpen: boolean;
  claraOpen: boolean;
  feedbackOpen: boolean;
  supportChatOpen: boolean;
  alertsExpanded: boolean;
  mobileSheetOpen: boolean;
  alertCount: number;
  supportChatEnabled: boolean;
  supportChatWelcome: string;
  showSupportChip: boolean;
  showFeedbackChip: boolean;
  openWarren: () => void;
  closeWarren: () => void;
  openClara: () => void;
  closeClara: () => void;
  openFeedback: () => void;
  closeFeedback: () => void;
  openSupportChat: () => void;
  closeSupportChat: () => void;
  toggleAlerts: () => void;
  setAlertsExpanded: (open: boolean) => void;
  setAlertCount: (count: number) => void;
  setMobileSheetOpen: (open: boolean) => void;
};

const AgentChromeContext = createContext<AgentChromeContextValue | null>(null);

export function useAgentChrome(): AgentChromeContextValue {
  const v = useContext(AgentChromeContext);
  if (!v) {
    throw new Error("useAgentChrome must be used within AgentChromeProvider");
  }
  return v;
}

export function useAgentChromeOptional(): AgentChromeContextValue | null {
  return useContext(AgentChromeContext);
}

export function AgentChromeProvider({ children }: { children: ReactNode }) {
  const { demoMode } = usePortfolio();
  const { user } = useAuth();

  const [warrenOpen, setWarrenOpen] = useState(false);
  const [claraOpen, setClaraOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [supportChatEnabled, setSupportChatEnabled] = useState(false);
  const [supportChatWelcome, setSupportChatWelcome] = useState("");

  useEffect(() => {
    if (demoMode || !user) return;
    const timer = setTimeout(() => {
      fetch("/api/support-chat/config")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setSupportChatEnabled(Boolean(data.enabled));
            setSupportChatWelcome(typeof data.welcomeMessage === "string" ? data.welcomeMessage : "");
          }
        })
        .catch(() => {});
    }, 3_000);
    return () => clearTimeout(timer);
  }, [demoMode, user]);

  const closeOverlays = useCallback(() => {
    setClaraOpen(false);
    setFeedbackOpen(false);
    setSupportChatOpen(false);
    setAlertsExpanded(false);
    setMobileSheetOpen(false);
  }, []);

  const openWarren = useCallback(() => {
    closeOverlays();
    setWarrenOpen(true);
  }, [closeOverlays]);

  const closeWarren = useCallback(() => setWarrenOpen(false), []);

  const openClara = useCallback(() => {
    setWarrenOpen(false);
    setFeedbackOpen(false);
    setSupportChatOpen(false);
    setAlertsExpanded(false);
    setMobileSheetOpen(false);
    setClaraOpen(true);
  }, []);

  const closeClara = useCallback(() => setClaraOpen(false), []);

  const openFeedback = useCallback(() => {
    setWarrenOpen(false);
    setClaraOpen(false);
    setSupportChatOpen(false);
    setAlertsExpanded(false);
    setMobileSheetOpen(false);
    setFeedbackOpen(true);
  }, []);

  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);

  const openSupportChat = useCallback(() => {
    setWarrenOpen(false);
    setClaraOpen(false);
    setFeedbackOpen(false);
    setAlertsExpanded(false);
    setMobileSheetOpen(false);
    setSupportChatOpen(true);
  }, []);

  const closeSupportChat = useCallback(() => setSupportChatOpen(false), []);

  const toggleAlerts = useCallback(() => {
    setWarrenOpen(false);
    setClaraOpen(false);
    setFeedbackOpen(false);
    setSupportChatOpen(false);
    setMobileSheetOpen(false);
    setAlertsExpanded((v) => !v);
  }, []);

  const showSupportChip = !demoMode && user?.plan === "pro" && supportChatEnabled;
  const showFeedbackChip = !demoMode;

  const value = useMemo<AgentChromeContextValue>(
    () => ({
      demoMode,
      warrenOpen,
      claraOpen,
      feedbackOpen,
      supportChatOpen,
      alertsExpanded,
      mobileSheetOpen,
      alertCount,
      supportChatEnabled,
      supportChatWelcome,
      showSupportChip,
      showFeedbackChip,
      openWarren,
      closeWarren,
      openClara,
      closeClara,
      openFeedback,
      closeFeedback,
      openSupportChat,
      closeSupportChat,
      toggleAlerts,
      setAlertsExpanded,
      setAlertCount,
      setMobileSheetOpen,
    }),
    [
      demoMode,
      warrenOpen,
      claraOpen,
      feedbackOpen,
      supportChatOpen,
      alertsExpanded,
      mobileSheetOpen,
      alertCount,
      supportChatEnabled,
      supportChatWelcome,
      showSupportChip,
      showFeedbackChip,
      openWarren,
      closeWarren,
      openClara,
      closeClara,
      openFeedback,
      closeFeedback,
      openSupportChat,
      closeSupportChat,
      toggleAlerts,
    ],
  );

  return <AgentChromeContext.Provider value={value}>{children}</AgentChromeContext.Provider>;
}
