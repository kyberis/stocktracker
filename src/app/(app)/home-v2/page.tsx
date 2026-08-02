import { redirect } from "next/navigation";

/** Legacy preview URL — Home v2 is now the default at `/`. */
export default function HomeV2Page() {
  redirect("/");
}
