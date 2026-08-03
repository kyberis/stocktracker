import { redirect } from "next/navigation";

/** Alias: QA and older links used `/tools/warren`; canonical route is warren-screener. */
export default function WarrenToolsAliasPage() {
  redirect("/tools/warren-screener");
}
