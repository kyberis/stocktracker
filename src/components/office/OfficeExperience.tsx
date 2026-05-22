"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStealthMode } from "@/lib/stealth-context";
import OfficeExperienceLive from "./OfficeExperienceLive";
import styles from "./office.module.css";

export type OfficeAgentId = "warren" | "clara" | "will";

interface OfficeExperienceProps {
  /** When false, UI is read-only demo (paywall preview). */
  interactive?: boolean;
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

export default function OfficeExperience({ interactive = true }: OfficeExperienceProps) {
  if (interactive) {
    return <OfficeExperienceLive />;
  }

  return <OfficeExperiencePreview />;
}

function OfficeExperiencePreview() {
  const { t } = useI18n();
  const { stealthMode, toggleStealth } = useStealthMode();
  const [hostAgent, setHostAgent] = useState<OfficeAgentId>("warren");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [missionCancelled, setMissionCancelled] = useState(false);
  const [draft, setDraft] = useState("");

  const interactive = false;

  const hostLabel =
    hostAgent === "clara" ? t("officeAgentClaraName") : hostAgent === "will" ? t("officeAgentWillName") : t("officeAgentWarrenName");

  const onChip = useCallback(
    (text: string) => {
      if (!interactive) return;
      setDraft(text);
    },
    [interactive],
  );

  const onConfirmStep1 = () => {
    if (!interactive || missionCancelled) return;
    setStep1Done(true);
  };

  const onConfirmStep2 = () => {
    if (!interactive || !step1Done || missionCancelled) return;
    setStep2Done(true);
  };

  const onConfirmStep3 = () => {
    if (!interactive || missionCancelled) return;
    setStep3Done(true);
  };

  const onCancelMission = () => {
    if (!interactive) return;
    setMissionCancelled(true);
  };

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
            onClick={interactive ? toggleStealth : undefined}
            aria-pressed={stealthMode}
            disabled={!interactive}
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
              const name =
                agent === "warren"
                  ? t("officeAgentWarrenName")
                  : agent === "clara"
                    ? t("officeAgentClaraName")
                    : t("officeAgentWillName");
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
                  onClick={() => interactive && setHostAgent(agent)}
                  disabled={!interactive}
                >
                  <div className={`${styles.avatar} ${agentAvatarClass(agent)}`}>{agentInitial(agent)}</div>
                  <div className={styles.agentInfo}>
                    <h3>{name}</h3>
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
            <div className={`${styles.msg} ${styles.msgUser}`}>
              <div className={styles.msgHeader}>
                <span className={styles.msgName}>{t("officeYou")}</span>
                <span className={styles.msgTime}>10:42</span>
              </div>
              <div className={styles.bubble}>{t("officeDemoUserMessage")}</div>
            </div>

            <div className={agentMsgClass("warren")}>
              <div className={styles.msgHeader}>
                <div className={`${styles.miniAvatar} ${styles.avatar} ${styles.avatarWarren}`}>W</div>
                <span className={styles.msgName}>{t("officeAgentWarrenName")}</span>
                <span className={styles.msgTime}>10:42</span>
              </div>
              <div className={styles.bubble}>
                {t("officeDemoWarrenAnalysis")}
                <div className={styles.inlineCard}>
                  <div className={styles.inlineRow}>
                    <span className={styles.inlineLabel}>{t("officeDemoInfraLabel")}</span>
                    <span className={styles.valueBad}>2,1%</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFillLow} />
                  </div>
                  <div className={styles.inlineRow} style={{ marginTop: 8 }}>
                    <span className={styles.inlineLabel}>{t("officeDemoTargetLabel")}</span>
                    <span className={styles.valueGood}>~8%</span>
                  </div>
                </div>
                {t("officeDemoWarrenFollowUp")}
              </div>
            </div>

            <div className={styles.coordination}>
              <div className={styles.coordinationHeader}>
                <CoordinationIcon />
                {t("officeCoordinationHeading")}
              </div>
              <div className={styles.coordStep}>
                <span className={styles.coordArrow}>
                  <strong>{t("officeAgentWarrenName")}</strong> → {t("officeAgentClaraName")}
                </span>
                <span className={styles.coordResult}>{t("officeDemoCoordClara")}</span>
              </div>
              <div className={styles.coordStep}>
                <span className={styles.coordArrow}>
                  <strong>{t("officeAgentWarrenName")}</strong> → {t("officeAgentWillName")}
                </span>
                <span className={styles.coordResult}>{t("officeDemoCoordWill")}</span>
              </div>
              <div className={styles.coordStep}>
                <span className={styles.coordArrow}>
                  <strong>{t("officeAgentClaraName")}</strong> → {t("officeAgentWarrenName")}
                </span>
                <span className={styles.coordResult}>{t("officeDemoCoordClaraReply")}</span>
              </div>
            </div>

            <div className={agentMsgClass("warren")}>
              <div className={styles.msgHeader}>
                <div className={`${styles.miniAvatar} ${styles.avatar} ${styles.avatarWarren}`}>W</div>
                <span className={styles.msgName}>{t("officeAgentWarrenName")}</span>
                <span className={styles.msgTime}>10:43</span>
              </div>
              <div className={styles.bubble}>{t("officeDemoWarrenMission")}</div>
            </div>

            <div className={agentMsgClass("clara")}>
              <div className={styles.msgHeader}>
                <div className={`${styles.miniAvatar} ${styles.avatar} ${styles.avatarClara}`}>C</div>
                <span className={styles.msgName}>{t("officeAgentClaraName")}</span>
                <span className={styles.msgTime}>10:43</span>
              </div>
              <div className={styles.bubble}>{t("officeDemoClaraMessage")}</div>
            </div>

            <div className={agentMsgClass("will")}>
              <div className={styles.msgHeader}>
                <div className={`${styles.miniAvatar} ${styles.avatar} ${styles.avatarWill}`}>Wi</div>
                <span className={styles.msgName}>{t("officeAgentWillName")}</span>
                <span className={styles.msgTime}>10:43</span>
              </div>
              <div className={styles.bubble}>{t("officeDemoWillMessage")}</div>
            </div>
          </div>

          <div className={styles.chatInputArea}>
            <div className={styles.quickPrompts}>
              {[t("officeChipPortfolio"), t("officeChipSpending"), t("officeChipNotes")].map((label) => (
                <button key={label} type="button" className={styles.chip} onClick={() => onChip(label)} disabled={!interactive}>
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
                onChange={(e) => interactive && setDraft(e.target.value)}
                readOnly={!interactive}
              />
              <button type="button" className={styles.sendBtn} aria-label={t("officeSend")} disabled={!interactive}>
                ↑
              </button>
            </div>
          </div>
        </main>

        <aside className={styles.missionBoard}>
          <div className={styles.missionBoardHeader}>
            <h2>{t("officeMissionBoardTitle")}</h2>
            <p>{t("officeMissionBoardSub")}</p>
          </div>

          <div className={styles.missions}>
            {!missionCancelled ? (
              <div className={`${styles.missionCard} ${styles.missionCardActive}`}>
                <div className={styles.missionBadge}>● {t("officeMissionActiveBadge")}</div>
                <div className={styles.missionTitle}>{t("officeDemoMissionTitle")}</div>
                <div className={styles.missionDesc}>{t("officeDemoMissionDesc")}</div>

                <div className={styles.missionStep}>
                  <div className={`${styles.stepNum} ${step1Done ? styles.stepNumDone : styles.stepNumPending}`}>1</div>
                  <div className={styles.stepBody}>
                    <div className={`${styles.stepAgent} ${styles.stepAgentClara}`}>{t("officeDemoStep1Agent")}</div>
                    <div className={styles.stepAction}>{t("officeDemoStep1Action")}</div>
                    <div className={styles.stepButtons}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnConfirm} ${styles.btnConfirmClara}`}
                        onClick={onConfirmStep1}
                        disabled={!interactive || step1Done}
                      >
                        {t("officeConfirm")}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancelMission} disabled={!interactive}>
                        {t("officeCancel")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.missionStep}>
                  <div className={`${styles.stepNum} ${step2Done ? styles.stepNumDone : ""}`}>2</div>
                  <div className={styles.stepBody}>
                    <div className={`${styles.stepAgent} ${styles.stepAgentWarren}`}>{t("officeDemoStep2Agent")}</div>
                    <div className={styles.stepAction}>{t("officeDemoStep2Action")}</div>
                    <div className={styles.stepButtons}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnConfirm} ${!step1Done ? styles.btnDisabled : ""}`}
                        onClick={onConfirmStep2}
                        disabled={!interactive || !step1Done || step2Done}
                      >
                        {t("officeConfirm")}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancelMission} disabled={!interactive}>
                        {t("officeCancel")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.missionStep}>
                  <div className={`${styles.stepNum} ${step3Done ? styles.stepNumDone : ""}`}>3</div>
                  <div className={styles.stepBody}>
                    <div className={`${styles.stepAgent} ${styles.stepAgentWill}`}>{t("officeDemoStep3Agent")}</div>
                    <div className={styles.stepAction}>{t("officeDemoStep3Action")}</div>
                    <div className={styles.stepButtons}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnConfirm} ${styles.btnConfirmWill}`}
                        onClick={onConfirmStep3}
                        disabled={!interactive || step3Done}
                      >
                        {t("officeConfirm")}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnSkip}`} disabled={!interactive}>
                        {t("officeSkip")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.missionDesc}>{t("officeMissionCancelled")}</p>
            )}
          </div>

          <div className={styles.disclaimer}>{t("officeDisclaimer")}</div>
        </aside>
      </div>
    </div>
  );
}
