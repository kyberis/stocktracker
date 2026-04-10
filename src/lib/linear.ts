import type { FeedbackType } from "@/lib/db/feedback";

function feedbackIdMarker(feedbackId: string): string {
  return `<!-- feedback-id:${feedbackId} -->`;
}

const LINEAR_API = "https://api.linear.app/graphql";

export interface LinearIssueCreateResult {
  issueId: string;
  /** Human-readable key e.g. TRE-123 */
  identifier: string;
  url: string;
}

function getLinearConfig(): { apiKey: string; teamId: string } | null {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  const teamId = process.env.LINEAR_TEAM_ID?.trim();
  if (!apiKey || !teamId) return null;
  return { apiKey, teamId };
}

export function isLinearConfigured(): boolean {
  return getLinearConfig() !== null;
}

async function linearGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const cfg = getLinearConfig();
  if (!cfg) {
    throw new Error("Linear is not configured (LINEAR_API_KEY / LINEAR_TEAM_ID)");
  }
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      Authorization: cfg.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok) {
    throw new Error(`Linear HTTP ${res.status}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Linear response missing data");
  }
  return json.data;
}

function buildFeedbackIssueDescription(params: {
  feedbackId: string;
  subject: string;
  message: string;
  type: FeedbackType;
}): string {
  const marker = feedbackIdMarker(params.feedbackId);
  const typeLabel = params.type === "bug" ? "Bug report" : "General feedback";
  return `${marker}

## User summary
- **Type:** ${typeLabel}
- **Subject:** ${params.subject}

**Message:**
${params.message}

## What to do
1. Review the request and triage (bug vs feature vs duplicate).
2. Scope work and link any related issues.
3. When shipped, move this issue to **Done** so a completion email draft is prepared for the user (admin sends from the dashboard).

## Why
Submitted through the in-app feedback form in trefolio. The user was sent an automatic acknowledgement email.

## Acceptance criteria
- [ ] Request understood and prioritized
- [ ] Implementation or resolution path decided (or explicitly declined with rationale)
- [ ] User receives a completion email when the work is released (via admin)
`;
}

export function buildFeedbackIssueTitle(subject: string, feedbackId: string): string {
  const base = subject.trim().slice(0, 100) || "User feedback";
  return `${base} [feedback-${feedbackId}]`;
}

export async function createLinearFeedbackIssue(params: {
  feedbackId: string;
  subject: string;
  message: string;
  type: FeedbackType;
}): Promise<LinearIssueCreateResult> {
  const cfg = getLinearConfig();
  if (!cfg) {
    throw new Error("Linear is not configured");
  }
  const title = buildFeedbackIssueTitle(params.subject, params.feedbackId);
  const description = buildFeedbackIssueDescription(params);

  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  type Mut = {
    issueCreate: {
      success: boolean;
      issue: { id: string; identifier: string; url: string } | null;
    };
  };

  const data = await linearGraphQL<Mut>(mutation, {
    input: {
      teamId: cfg.teamId,
      title,
      description,
    },
  });

  const created = data.issueCreate;
  if (!created.success || !created.issue) {
    throw new Error("Linear issueCreate returned no issue");
  }

  return {
    issueId: created.issue.id,
    identifier: created.issue.identifier,
    url: created.issue.url,
  };
}
