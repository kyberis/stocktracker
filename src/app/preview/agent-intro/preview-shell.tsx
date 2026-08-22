"use client";

import { ThemeProvider } from "@/lib/theme-context";
import { I18nProvider } from "@/lib/i18n";
import AgentIntroMockPreview from "@/components/agent-intro/AgentIntroMockPreview";

/** Public design preview — no auth, no API calls. */
export default function AgentIntroPreviewShell() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <div className="min-h-screen bg-[color:var(--page-background)]">
          <AgentIntroMockPreview />
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
