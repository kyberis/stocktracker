import { Resend } from "resend";

function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || "trefolio <noreply@trefolio.com>";
}

function getBaseUrl(): string {
  return (process.env.APP_BASE_URL || "https://trefolio.com").replace(/\/+$/, "");
}

export async function sendRegistrationApprovedEmail(args: {
  email: string;
  locale?: string | null;
}): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const loginUrl = `${getBaseUrl()}/login`;
  const es = (args.locale || "en").toLowerCase().startsWith("es");
  const subject = es ? "Tu cuenta ya está habilitada" : "Your trefolio account is ready";
  const body = es
    ? "Un administrador habilitó tu cuenta. Ya podés entrar a trefolio."
    : "An administrator enabled your account. You can sign in to trefolio now.";
  const cta = es ? "Entrar a trefolio" : "Open trefolio";

  if (!apiKey) {
    console.info("[registration-approved-email] skipped", { email: args.email, loginUrl });
    return { ok: false };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: args.email,
      subject,
      text: `${body}\n\n${cta}: ${loginUrl}`,
      html: `<p>${body}</p><p><a href="${loginUrl}">${cta}</a></p>`,
    });
    if (error) {
      console.error("[registration-approved-email]", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      "[registration-approved-email]",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false };
  }
}
