import { redirect } from "next/navigation";

/** Alias: news lives as a classic dashboard view tab. */
export default function NewsAliasPage() {
  redirect("/classic?tab=news");
}
