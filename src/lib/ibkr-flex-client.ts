/**
 * Interactive Brokers Flex Web Service client.
 *
 * Two-step workflow:
 *   1. SendRequest — triggers report generation, returns a reference code
 *   2. GetStatement — retrieves the generated report using the reference code
 *
 * Docs: https://www.interactivebrokers.com/campus/ibkr-api-page/flex-web-service/
 */

const FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const FLEX_VERSION = 3;
const USER_AGENT = "trefolio/1.0";

const TOTAL_TIMEOUT_MS = 60_000;
const GENERATION_WAIT_MS = 5_000;
const MAX_RETRIES = 6;
const RETRY_BACKOFF_MS = 3_000;

export class FlexServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "FlexServiceError";
  }
}

const ERROR_MESSAGES: Record<number, string> = {
  1001: "Statement could not be generated. Please try again shortly.",
  1003: "Statement is not available.",
  1004: "Statement is incomplete. Please try again shortly.",
  1011: "Service account is inactive.",
  1012: "Token has expired. Please generate a new token in IBKR Client Portal.",
  1013: "IP restriction. Your IP is not allowed for this token.",
  1014: "Query is invalid. Please check your Query ID in IBKR Client Portal.",
  1015: "Token is invalid. Please check your token in IBKR Client Portal.",
  1016: "Account is invalid.",
  1017: "Reference code is invalid.",
  1018: "Too many requests. IBKR limits to 1 request/sec, 10 requests/min per token.",
  1019: "Statement generation in progress. Please try again shortly.",
  1020: "Invalid request.",
  1021: "Statement could not be retrieved. Please try again shortly.",
};

function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

async function sendRequest(token: string, queryId: string): Promise<string> {
  const url = `${FLEX_BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=${FLEX_VERSION}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new FlexServiceError(`IBKR SendRequest HTTP ${res.status}`);
  }

  const xml = await res.text();
  const status = parseXmlValue(xml, "Status");

  if (status !== "Success") {
    const errorCode = parseInt(parseXmlValue(xml, "ErrorCode"), 10) || 0;
    const errorMessage = parseXmlValue(xml, "ErrorMessage");
    const friendly = ERROR_MESSAGES[errorCode] || errorMessage || "Unknown error from IBKR.";
    throw new FlexServiceError(friendly, errorCode);
  }

  const refCode = parseXmlValue(xml, "ReferenceCode");
  if (!refCode) {
    throw new FlexServiceError("IBKR returned success but no reference code.");
  }

  return refCode;
}

async function getStatement(token: string, refCode: string): Promise<string> {
  const url = `${FLEX_BASE}/GetStatement?t=${encodeURIComponent(token)}&q=${encodeURIComponent(refCode)}&v=${FLEX_VERSION}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new FlexServiceError(`IBKR GetStatement HTTP ${res.status}`);
  }

  const body = await res.text();

  if (body.includes("<FlexStatementResponse") || body.includes("<Status>")) {
    const status = parseXmlValue(body, "Status");
    if (status === "Fail") {
      const errorCode = parseInt(parseXmlValue(body, "ErrorCode"), 10) || 0;
      const errorMessage = parseXmlValue(body, "ErrorMessage");
      if (errorCode === 1019) {
        throw new FlexServiceError("generation_in_progress", 1019);
      }
      const friendly = ERROR_MESSAGES[errorCode] || errorMessage || "Failed to retrieve statement.";
      throw new FlexServiceError(friendly, errorCode);
    }
  }

  return body;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FlexFetchResult {
  data: string;
}

/**
 * Fetch a Flex Query report end-to-end:
 * SendRequest -> wait for generation -> GetStatement with retries.
 */
export async function fetchFlexReport(token: string, queryId: string): Promise<FlexFetchResult> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  const refCode = await sendRequest(token, queryId);

  await sleep(GENERATION_WAIT_MS);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (Date.now() > deadline) {
      throw new FlexServiceError("Timed out waiting for IBKR to generate the statement.");
    }

    try {
      const data = await getStatement(token, refCode);
      return { data };
    } catch (err) {
      if (err instanceof FlexServiceError && err.code === 1019) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new FlexServiceError("IBKR statement generation timed out after multiple retries.");
}
