"use client";

import { useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function AnalyticsProvider() {
  const isAdmin = useRef(false);
  const [speedInsights, setSpeedInsights] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role === "admin") {
          isAdmin.current = true;
          setSpeedInsights(false);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Analytics beforeSend={(event) => (isAdmin.current ? null : event)} />
      {speedInsights && <SpeedInsights />}
    </>
  );
}
