import { cookies } from "next/headers";
import DashboardShell from "./dashboard-shell";
import {
  AGENT_INTRO_DAY_COOKIE,
  isAgentIntroShownOnDay,
  localCalendarDay,
  parseAgentIntroDayCookie,
} from "@/lib/agent-intro";

export default function Home() {
  const raw = cookies().get(AGENT_INTRO_DAY_COOKIE)?.value;
  const agentIntroAlreadyShownToday = isAgentIntroShownOnDay(
    parseAgentIntroDayCookie(raw),
    localCalendarDay(),
  );
  return <DashboardShell agentIntroAlreadyShownToday={agentIntroAlreadyShownToday} />;
}
