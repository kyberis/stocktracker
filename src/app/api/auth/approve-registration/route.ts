import { NextRequest, NextResponse } from "next/server";

import { approveRegistration, findUserById } from "@/lib/db";
import { sendRegistrationApprovedEmail } from "@/lib/registration-approved-email";
import { verifyRegistrationApprovalJwt } from "@/lib/registration-approval";

export const dynamic = "force-dynamic";

function htmlPage(title: string, body: string, ok: boolean): NextResponse {
  const color = ok ? "#10b981" : "#b91c1c";
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;">
  <main style="max-width:480px;margin:72px auto;padding:0 20px;">
    <h1 style="color:${color};font-size:22px;">${title}</h1>
    <p style="line-height:1.55;color:#334155;">${body}</p>
  </main>
</body>
</html>`,
    {
      status: ok ? 200 : 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const parsed = token ? await verifyRegistrationApprovalJwt(token) : null;
  if (!parsed) {
    return htmlPage(
      "Invalid or expired link",
      "This approval link is not valid. Ask the operator to send a new one.",
      false,
    );
  }

  const existing = await findUserById(parsed.userId);
  if (!existing || existing.email.toLowerCase() !== parsed.email.toLowerCase()) {
    return htmlPage("User not found", "That account is no longer on trefolio.", false);
  }

  const result = await approveRegistration(parsed.userId);
  if (!result.user) {
    return htmlPage("User not found", "That account is no longer on trefolio.", false);
  }

  if (!result.alreadyApproved) {
    void sendRegistrationApprovedEmail({ email: result.user.email });
  }

  return htmlPage(
    result.alreadyApproved ? "Already approved" : "Account approved",
    result.alreadyApproved
      ? `${result.user.email} was already enabled.`
      : `${result.user.email} is now enabled. We emailed them that they can sign in.`,
    true,
  );
}
