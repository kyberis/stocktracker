"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { usePortfolio } from "@/lib/portfolio-context";
import { useStealthMode } from "@/lib/stealth-context";
import type { AgentMissionRecord, AgentMissionStep, OfficeCoordinationLine, OfficeStreamFrame } from "@/lib/ai/office/types";
import styles from "./office.module.css";

export type OfficeAgentId = "warren" | "clara" | "will";

interface ChatMessage {
  id: string;
  role: "user" | OfficeAgentId;
  content: string;
  createdAt: string;
}

function CoordinationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function agentAvatarClass(agent: OfficeAgentId): string {
  if (agent === "clara") return styles.avatarClara;
  if (agent === "will") return styles.avatarWill;
  return styles.avatarWarren;
}

function agentInitial(agent: OfficeAgentId): string {
  if (agent === "clara") return "C";
  if (agent === "will") return "Wi";
  return "W";
}

function agentMsgClass(agent: OfficeAgentId): string {
  const base = `${styles.msg} ${styles.msgAgent}`;
  if (agent === "clara") return `${base} ${styles.msgClara}`;
  if (agent === "will") return `${base} ${styles.msgWill}`;
  return `${base} ${styles.msgWarren}`;
}

function stepAgentClass(agent: OfficeAgentId): string {
  if (agent === "clara") return `${styles.stepAgent} ${styles.stepAgentClara}`;
  if (agent === "will") return `${styles.stepAgent} ${styles.stepAgentWill}`;
  return `${styles.stepAgent} ${styles.stepAgentWarren}`;
}

function confirmBtnClass(agent: OfficeAgentId): string {
  const base = `${styles.btn} ${styles.btnConfirm}`;
  if (agent === "clara") return `${base} ${styles.btnConfirmClara}`;
  if (agent === "will") return `${base} ${styles.btnConfirmWill}`;
  return base;
}

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function agentDisplayName(agent: OfficeAgentId, t: ReturnType<typeof useI18n>["t"]): string {
  if (agent === "clara") return t("officeAgentClaraName");
  if (agent === "will") return t("officeAgentWillName");
  return t("officeAgentWarrenName");
}

function stepNumClass(step: AgentMissionStep): string {
  if (step.status === "done") return `${styles.stepNum} ${styles.stepNumDone}`;
  if (step.status === "ready") return `${styles.stepNum} ${styles.stepNumPending}`;
  return styles.stepNum;
}

export default function OfficeExperienceLive() {
  const { t, language } = useI18n();
  const { stealthMode, toggleStealth } = useStealthMode();
  const { activePortfolioId, activePortfolioCurrency } = usePortfolio();

  const [hostAgent, setHostAgent] = useState<OfficeAgentId>("warren");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coordination, setCoordination] = useState<OfficeCoordinationLine[] | null>(null);
  const [missions, setMissions] = useState<AgentMissionRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionStep, setActionStep] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMission = missions.find((m) => m.status === "active") ?? null;

  const hostLabel = agentDisplayName(hostAgent, t);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/office/bootstrap", { credentials: "include" });
        if (!res.ok) throw new Error("bootstrap failed");
        const data = (await res.json()) as {
          messages: ChatMessage[];
          missions: AgentMissionRecord[];
        };
        if (!cancelled) {
          setMessages(data.messages);
          setMissions(data.missions);
        }
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, coordination, scrollToBottom]);

  const applyStreamFrame = useCallback((frame: OfficeStreamFrame) => {
    if (frame.kind === "message") {
      setMessages((prev) => [
        ...prev,
        {
          id: `stream-${Date.now()}-${prev.length}`,
          role: frame.role,
          content: frame.content,
          createdAt: frame.createdAt || new Date().toISOString(),
        },
      ]);
    } else if (frame.kind === "coordination") {
      setCoordination(frame.lines);
    } else if (frame.kind === "mission") {
      setMissions((prev) => {
        const rest = prev.filter((m) => m.id !== frame.mission.id);
        return [frame.mission, ...rest];
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setSending(true);
      setCoordination(null);
      setDraft("");

      try {
        const res = await fetch("/api/office/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            language,
            activePortfolioId,
            baseCurrency: activePortfolioCurrency || "EUR",
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("chat failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const frame = JSON.parse(line) as OfficeStreamFrame;
              applyStreamFrame(frame);
            } catch {
              /* ignore partial JSON */
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "warren",
            content: t("officeErrorGeneric"),
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [activePortfolioCurrency, activePortfolioId, applyStreamFrame, language, sending, t],
  );

  const onChip = useCallback(
    (text: string) => {
      setDraft(text);
    },
    [],
  );

  const onSend = () => {
    void sendMessage(draft);
  };

  const onConfirmStep = async (missionId: string, stepNumber: number) => {
    setActionStep(stepNumber);
    try {
      const res = await fetch(`/api/office/missions/${missionId}/steps/${stepNumber}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activePortfolioId }),
      });
      const data = (await res.json()) as { mission?: AgentMissionRecord; error?: string };
      if (data.mission) {
        setMissions((prev) => prev.map((m) => (m.id === data.mission!.id ? data.mission! : m)));
      }
    } finally {
      setActionStep(null);
    }
  };

  const onSkipStep = async (missionId: string, stepNumber: number) => {
    setActionStep(stepNumber);
    try {
      const res = await fetch(`/api/office/missions/${missionId}/steps/${stepNumber}/skip`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { mission?: AgentMissionRecord };
      if (data.mission) {
        setMissions((prev) => prev.map((m) => (m.id === data.mission!.id ? data.mission! : m)));
      }
    } finally {
      setActionStep(null);
    }
  };

  const onCancelMission = async (missionId: string) => {
    try {
      const res = await fetch(`/api/office/missions/${missionId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { mission?: AgentMissionRecord };
      if (data.mission) {
        setMissions((prev) => prev.map((m) => (m.id === data.mission!.id ? data.mission! : m)));
      }
    } catch {
      /* ignore */
    }
  };

  const missionBoardSub = activeMission
    ? t("officeMissionBoardSubActive").replace("{count}", String(activeMission.steps.filter((s) => s.status !== "done" && s.status !== "skipped").length))
    : t("officeMissionBoardSubEmpty");

  return (
    <div className={styles.shell}>
      <div className={styles.app}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.logo}>T</div>
            <h1 className={styles.topbarTitle}>
              {t("officeTitle")} <span className={styles.topbarSubtitle}>{t("officeTitleAgents")}</span>
            </h1>
          </div>
          <button
            type="button"
            className={styles.stealthToggle}
            onClick={toggleStealth}
            aria-pressed={stealthMode}
          >
            {t("officeStealthMode")}
            <span className={`${styles.stealthDot} ${stealthMode ? styles.stealthDotOn : ""}`} />
          </button>
        </header>

        <nav className={styles.rail} aria-label={t("officeRailAria")}>
          <Link href="/" className={styles.railIcon} title={t("officeRailDashboard")}>
            📊
          </Link>
          <Link href="/office" className={`${styles.railIcon} ${styles.railIconActive}`} title={t("officeRailOffice")}>
            🏢
          </Link>
          <Link href="/portfolio" className={styles.railIcon} title={t("officeRailPortfolio")}>
            💼
          </Link>
          <Link href="/tools" className={styles.railIcon} title={t("officeRailTools")}>
            🔧
          </Link>
        </nav>

        <aside className={styles.agentsPanel}>
          <div className={styles.agentsPanelHeader}>
            <h2>{t("officeTeamHeading")}</h2>
            <p>{t("officeTeamSubheading")}</p>
          </div>
          <div className={styles.agentList}>
            {(["warren", "clara", "will"] as const).map((agent) => {
              const isActive = hostAgent === agent;
              const role =
                agent === "warren"
                  ? t("officeAgentWarrenRole")
                  : agent === "clara"
                    ? t("officeAgentClaraRole")
                    : t("officeAgentWillRole");
              return (
                <button
                  key={agent}
                  type="button"
                  className={`${styles.agentCard} ${isActive ? styles.agentCardActive : ""}`}
                  onClick={() => setHostAgent(agent)}
                >
                  <div className={`${styles.avatar} ${agentAvatarClass(agent)}`}>{agentInitial(agent)}</div>
                  <div className={styles.agentInfo}>
                    <h3>{agentDisplayName(agent, t)}</h3>
                    <p>
                      <span className={styles.statusDot} aria-hidden />
                      {role}
                    </p>
                  </div>
                  {agent === "warren" ? <span className={styles.hostBadge}>{t("officeHostBadge")}</span> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className={styles.chatArea}>
          <div className={styles.chatHeader}>
            <h2>{t("officeChatHeading").replace("{agent}", hostLabel)}</h2>
            <p>{t("officeChatSubheading")}</p>
          </div>

          <div className={styles.messages}>
            {loading ? (
              <p className={styles.missionDesc}>{t("officeLoading")}</p>
            ) : messages.length === 0 ? (
              <p className={styles.missionDesc}>{t("officeEmptyChat")}</p>
            ) : (
              messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className={`${styles.msg} ${styles.msgUser}`}>
                    <div className={styles.msgHeader}>
                      <span className={styles.msgName}>{t("officeYou")}</span>
                      <span className={styles.msgTime}>{formatMsgTime(msg.createdAt)}</span>
                    </div>
                    <div className={styles.bubble}>{msg.content}</div>
                  </div>
                ) : (
                  <div key={msg.id} className={agentMsgClass(msg.role)}>
                    <div className={styles.msgHeader}>
                      <div className={`${styles.miniAvatar} ${styles.avatar} ${agentAvatarClass(msg.role)}`}>
                        {agentInitial(msg.role)}
                      </div>
                      <span className={styles.msgName}>{agentDisplayName(msg.role, t)}</span>
                      <span className={styles.msgTime}>{formatMsgTime(msg.createdAt)}</span>
                    </div>
                    <div className={styles.bubble}>{msg.content}</div>
                  </div>
                ),
              )
            )}

            {coordination && coordination.length > 0 ? (
              <div className={styles.coordination}>
                <div className={styles.coordinationHeader}>
                  <CoordinationIcon />
                  {t("officeCoordinationHeading")}
                </div>
                {coordination.map((line, i) => (
                  <div key={i} className={styles.coordStep}>
                    <span className={styles.coordArrow}>
                      <strong>{agentDisplayName(line.from, t)}</strong> → {agentDisplayName(line.to, t)}
                    </span>
                    <span className={styles.coordResult}>{line.summary}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {sending ? (
              <div className={agentMsgClass("warren")}>
                <div className={styles.bubble}>{t("officeThinking")}</div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.chatInputArea}>
            <div className={styles.quickPrompts}>
              {[t("officeChipPortfolio"), t("officeChipSpending"), t("officeChipNotes")].map((label) => (
                <button key={label} type="button" className={styles.chip} onClick={() => onChip(label)} disabled={sending}>
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.chatInputWrap}>
              <textarea
                className={styles.chatInput}
                rows={1}
                placeholder={t("officeInputPlaceholder")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                disabled={sending}
              />
              <button
                type="button"
                className={styles.sendBtn}
                aria-label={t("officeSend")}
                disabled={sending || !draft.trim()}
                onClick={onSend}
              >
                ↑
              </button>
            </div>
          </div>
        </main>

        <aside className={styles.missionBoard}>
          <div className={styles.missionBoardHeader}>
            <h2>{t("officeMissionBoardTitle")}</h2>
            <p>{missionBoardSub}</p>
          </div>

          <div className={styles.missions}>
            {activeMission && activeMission.status === "active" ? (
              <div className={`${styles.missionCard} ${styles.missionCardActive}`}>
                <div className={styles.missionBadge}>● {t("officeMissionActiveBadge")}</div>
                <div className={styles.missionTitle}>{activeMission.title}</div>
                <div className={styles.missionDesc}>{activeMission.description}</div>

                {activeMission.steps.map((step) => {
                  const canConfirm = step.status === "ready";
                  const isDone = step.status === "done" || step.status === "skipped";
                  const busy = actionStep === step.step;
                  return (
                    <div key={step.step} className={styles.missionStep}>
                      <div className={stepNumClass(step)}>{step.step}</div>
                      <div className={styles.stepBody}>
                        <div className={stepAgentClass(step.agent)}>{step.agentLabel}</div>
                        <div className={styles.stepAction}>{step.action}</div>
                        <div className={styles.stepButtons}>
                          <button
                            type="button"
                            className={`${confirmBtnClass(step.agent)} ${!canConfirm ? styles.btnDisabled : ""}`}
                            onClick={() => void onConfirmStep(activeMission.id, step.step)}
                            disabled={!canConfirm || busy || isDone}
                          >
                            {t("officeConfirm")}
                          </button>
                          {step.agent === "will" ? (
                            <button
                              type="button"
                              className={`${styles.btn} ${styles.btnSkip}`}
                              onClick={() => void onSkipStep(activeMission.id, step.step)}
                              disabled={isDone || busy}
                            >
                              {t("officeSkip")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.btn} ${styles.btnCancel}`}
                              onClick={() => void onCancelMission(activeMission.id)}
                              disabled={busy}
                            >
                              {t("officeCancel")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.missionDesc}>{t("officeNoActiveMission")}</p>
            )}
          </div>

          <div className={styles.disclaimer}>{t("officeDisclaimer")}</div>
        </aside>
      </div>
    </div>
  );
}
