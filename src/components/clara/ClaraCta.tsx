"use client";

import { useState } from "react";
import ClaraLandingModal from "./ClaraLandingModal";
import ClaraTrigger from "./ClaraTrigger";

interface Props {
  /** Demo mode: navigate to signup instead of opening the modal. */
  href?: string;
}

/**
 * Clara entry next to Warren: trigger card + mini-landing modal.
 */
export default function ClaraCta({ href }: Props) {
  const [open, setOpen] = useState(false);

  if (href) {
    return <ClaraTrigger href={href} />;
  }

  return (
    <>
      <ClaraTrigger onOpen={() => setOpen(true)} />
      <ClaraLandingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
