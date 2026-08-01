"use client";

import { useEffect } from "react";
import { event as gtagEvent } from "@/lib/gtag";

/** Fires once when the user lands after a successful account deletion. */
export default function AccountDeletedBeacon({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    gtagEvent("account_deleted", { source: "post_delete_redirect" });
  }, [active]);
  return null;
}
