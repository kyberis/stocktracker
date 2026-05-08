import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import {
  isGmailConfigured,
  listUnreadByQuery,
  getMessageContent,
  markAsRead,
  parseForwardedDate,
  parseForwardedSender,
  extractLinksFromHtml,
} from "@/lib/gmail";
import { getGlobalOpenAIApiKey, getAiModelForFlow } from "@/lib/db/settings";
import {
  digestSourceExistsByGmailId,
  getDigestByDate,
  addDigestSource,
  getDigestSources,
  insertMarketDigest,
  updateDigestContent,
  getDigestSenderDomains,
  buildDigestGmailQuery,
} from "@/lib/db";
import type { MarketDigestSource } from "@/lib/db";
import { generateDigestFromSources, stripHtml } from "@/lib/digest-generation";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface ParsedEmail {
  gmailId: string;
  originalDate: string;
  originalSender: string;
  subject: string;
  receivedAt: string;
  textBody: string;
  htmlBody: string;
  extractedLinks: { url: string; text: string }[];
}

async function processDigestEmail(): Promise<Record<string, unknown>> {
  if (!isGmailConfigured()) {
    return { skipped: true, reason: "Gmail credentials not configured" };
  }

  const apiKey = getGlobalOpenAIApiKey();
  const digestEmailModel = await getAiModelForFlow("digest_email");
  if (!apiKey) {
    return { skipped: true, reason: "OpenAI API key not configured" };
  }

  const senderDomains = await getDigestSenderDomains();
  const digestQuery = buildDigestGmailQuery(senderDomains);
  console.log("[digest-email] Gmail query:", digestQuery);
  console.log("[digest-email] Configured senders:", senderDomains.map((d) => d.value).join(", "));
  const messages = await listUnreadByQuery(digestQuery);
  if (messages.length === 0) {
    return { checked: true, newEmails: 0, processed: 0, gmailQuery: digestQuery, configuredSenders: senderDomains.map((d) => d.value) };
  }

  const skipReasons: string[] = [];
  const newParsed: ParsedEmail[] = [];

  for (const msg of messages) {
    if (await digestSourceExistsByGmailId(msg.id)) {
      await markAsRead(msg.id);
      skipReasons.push(`duplicate:${msg.id}`);
      continue;
    }

    const email = await getMessageContent(msg.id);
    const bodyForAI = email.textBody || stripHtml(email.htmlBody);
    if (!bodyForAI.trim()) {
      await markAsRead(msg.id);
      skipReasons.push(`empty_body:${msg.id}:${email.subject.slice(0, 60)}`);
      continue;
    }

    const originalDate = parseForwardedDate(email);
    const originalSender = parseForwardedSender(email);
    const links = extractLinksFromHtml(email.htmlBody);

    newParsed.push({
      gmailId: msg.id,
      originalDate,
      originalSender,
      subject: email.subject,
      receivedAt: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      textBody: email.textBody,
      htmlBody: email.htmlBody,
      extractedLinks: links,
    });
  }

  const byDate = new Map<string, ParsedEmail[]>();
  for (const p of newParsed) {
    const group = byDate.get(p.originalDate) || [];
    group.push(p);
    byDate.set(p.originalDate, group);
  }

  let digestsCreated = 0;
  let digestsUpdated = 0;
  const processedDigests: { date: string; sources: number; tickers: string[] }[] = [];

  for (const [date, emails] of byDate) {
    const existingDigest = await getDigestByDate(date);

    if (existingDigest && existingDigest.status !== "draft") {
      for (const e of emails) {
        await markAsRead(e.gmailId);
        skipReasons.push(`published_digest:${e.gmailId}:${date}`);
      }
      continue;
    }

    if (existingDigest) {
      for (const e of emails) {
        await addDigestSource(existingDigest.id, {
          gmailMessageId: e.gmailId,
          sender: e.originalSender,
          originalSubject: e.subject,
          originalDate: e.originalDate,
          receivedAt: e.receivedAt,
          rawText: e.textBody,
          rawHtml: e.htmlBody,
          extractedLinks: e.extractedLinks,
        });
      }

      const allSources = await getDigestSources(existingDigest.id);
      const sourcesForAI = allSources.map((s: MarketDigestSource) => ({
        sender: s.sender,
        textBody: s.rawText,
        htmlBody: s.rawHtml,
        extractedLinks: s.extractedLinks,
      }));

      const result = await generateDigestFromSources(apiKey, digestEmailModel, sourcesForAI);
      if (result) {
        await updateDigestContent(existingDigest.id, {
          mentionedTickers: result.rewrite.mentioned_tickers || [],
          sectors: result.rewrite.sectors || [],
          sentiment: result.rewrite.sentiment || "neutral",
          aiModel: digestEmailModel,
          tokensUsed: existingDigest.tokensUsed + result.totalTokens,
          translations: result.translations,
        });
        processedDigests.push({ date, sources: allSources.length, tickers: result.rewrite.mentioned_tickers || [] });
      }

      for (const e of emails) await markAsRead(e.gmailId);
      digestsUpdated++;
    } else {
      const firstEmail = emails[0];
      const digestId = await insertMarketDigest({
        gmailMessageId: firstEmail.gmailId,
        sender: firstEmail.originalSender,
        originalSubject: firstEmail.subject,
        receivedAt: firstEmail.receivedAt,
        rawText: firstEmail.textBody,
        rawHtml: firstEmail.htmlBody,
        mentionedTickers: [],
        sectors: [],
        sentiment: "neutral",
        aiModel: digestEmailModel,
        tokensUsed: 0,
        digestDate: date,
        translations: [],
      });

      for (const e of emails) {
        await addDigestSource(digestId, {
          gmailMessageId: e.gmailId,
          sender: e.originalSender,
          originalSubject: e.subject,
          originalDate: e.originalDate,
          receivedAt: e.receivedAt,
          rawText: e.textBody,
          rawHtml: e.htmlBody,
          extractedLinks: e.extractedLinks,
        });
      }

      const allSources = await getDigestSources(digestId);
      const sourcesForAI = allSources.map((s: MarketDigestSource) => ({
        sender: s.sender,
        textBody: s.rawText,
        htmlBody: s.rawHtml,
        extractedLinks: s.extractedLinks,
      }));

      const result = await generateDigestFromSources(apiKey, digestEmailModel, sourcesForAI);
      if (result) {
        await updateDigestContent(digestId, {
          mentionedTickers: result.rewrite.mentioned_tickers || [],
          sectors: result.rewrite.sectors || [],
          sentiment: result.rewrite.sentiment || "neutral",
          aiModel: digestEmailModel,
          tokensUsed: result.totalTokens,
          translations: result.translations,
        });
        processedDigests.push({ date, sources: emails.length, tickers: result.rewrite.mentioned_tickers || [] });
      }

      for (const e of emails) await markAsRead(e.gmailId);
      digestsCreated++;
    }
  }

  return {
    checked: true,
    gmailQuery: digestQuery,
    configuredSenders: senderDomains.map((d) => d.value),
    newEmails: messages.length,
    digestsCreated,
    digestsUpdated,
    skipped: skipReasons.length,
    skipReasons,
    processedDigests,
    processedAt: new Date().toISOString(),
  };
}

const handler = withCronLogging("digest-email", processDigestEmail);

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("digest-email", req);
  if (denied) return denied;
  return handler();
}
