"use client";

import MoatScreener from "./MoatScreener";

/** Value-style preset: positive P/E under 15, market cap under ~$5B, moat criteria; uses larger page size. */
export default function WarrenScreener() {
  return <MoatScreener variant="warren" />;
}
