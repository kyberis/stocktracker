import { findUserById } from "@/lib/db/users";
import {
  createPortfolioAnomaly,
  findOpenPortfolioAnomalyByFingerprint,
  markPortfolioAnomalyNotified,
  updatePortfolioAnomalyFindings,
} from "@/lib/db/portfolio-anomalies";
import { listUserIdsWithHoldings } from "@/lib/db/holdings";
import { listUserIdsWithEmptyLedgerSnapshotHistory } from "@/lib/db/portfolio-reset-archives";
import { isFeatureEnabled } from "@/lib/db/settings";
import { enqueueProdOpsPortfolioAnomalyEvent } from "@/lib/prodops";

import { explainAnomalyFindings } from "./explain";
import { scanUserPortfolioAnomalies } from "./repairs";

const DEFAULT_MAX_LLM = 40;

export async function runPortfolioAnomalyScan(opts?: {
  maxUsers?: number;
  maxLlmExplanations?: number;
  notify?: boolean;
  userIds?: string[];
}): Promise<{
  scanned: number;
  withFindings: number;
  created: number;
  updated: number;
  notified: number;
  skippedFlag: boolean;
}> {
  if (!(await isFeatureEnabled("portfolio_anomaly_agent"))) {
    return {
      scanned: 0,
      withFindings: 0,
      created: 0,
      updated: 0,
      notified: 0,
      skippedFlag: true,
    };
  }

  let userIds = opts?.userIds;
  if (!userIds) {
    const [withHoldings, emptyLedger] = await Promise.all([
      listUserIdsWithHoldings(),
      listUserIdsWithEmptyLedgerSnapshotHistory(100),
    ]);
    userIds = [...new Set([...withHoldings, ...emptyLedger])];
  }
  const capped = opts?.maxUsers ? userIds.slice(0, opts.maxUsers) : userIds;
  const maxLlm = opts?.maxLlmExplanations ?? DEFAULT_MAX_LLM;
  const notify = opts?.notify !== false;

  let scanned = 0;
  let withFindings = 0;
  let created = 0;
  let updated = 0;
  let notified = 0;
  let llmUsed = 0;

  for (const userId of capped) {
    scanned += 1;
    const scan = await scanUserPortfolioAnomalies(userId);
    if (!scan) continue;
    withFindings += 1;

    const existing = await findOpenPortfolioAnomalyByFingerprint(userId, scan.fingerprint);
    let explanation = {
      aiExplanation: "",
      remediationPrompt: "",
    };

    const needsExplain = !existing || !existing.aiExplanation;
    if (needsExplain && llmUsed < maxLlm) {
      const user = await findUserById(userId);
      explanation = await explainAnomalyFindings({
        findings: scan.findings,
        username: user?.username || user?.email || userId,
      });
      llmUsed += 1;
    } else if (existing) {
      explanation = {
        aiExplanation: existing.aiExplanation,
        remediationPrompt: existing.remediationPrompt,
      };
    } else {
      explanation = await explainAnomalyFindings({
        findings: scan.findings,
        username: userId,
      });
      // still counts toward fallback path without LLM if gateway fails
    }

    if (existing) {
      await updatePortfolioAnomalyFindings(existing.id, {
        severity: scan.severity,
        codes: scan.codes,
        findings: scan.findings,
        aiExplanation: explanation.aiExplanation || existing.aiExplanation,
        remediationPrompt: explanation.remediationPrompt || existing.remediationPrompt,
      });
      updated += 1;
      // Do not re-notify open fingerprints
      continue;
    }

    const anomaly = await createPortfolioAnomaly({
      userId,
      severity: scan.severity,
      codes: scan.codes,
      findings: scan.findings,
      aiExplanation: explanation.aiExplanation,
      remediationPrompt: explanation.remediationPrompt,
      fingerprint: scan.fingerprint,
    });
    created += 1;

    if (notify) {
      await enqueueProdOpsPortfolioAnomalyEvent({
        anomalyId: anomaly.id,
        userId,
        severity: anomaly.severity,
        codes: anomaly.codes,
        summary: anomaly.aiExplanation.slice(0, 280) || `Portfolio anomaly (${anomaly.codes.join(", ")})`,
      });
      await markPortfolioAnomalyNotified(anomaly.id);
      notified += 1;
    }
  }

  return { scanned, withFindings, created, updated, notified, skippedFlag: false };
}
