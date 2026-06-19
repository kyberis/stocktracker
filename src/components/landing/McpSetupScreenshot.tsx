"use client";

import Image from "next/image";
import { useState } from "react";

interface McpSetupScreenshotProps {
  src: string;
  alt: string;
  placeholderLabel: string;
}

export default function McpSetupScreenshot({ src, alt, placeholderLabel }: McpSetupScreenshotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center"
        role="img"
        aria-label={alt}
      >
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">{placeholderLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-lg shadow-slate-900/10">
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        className="h-auto w-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
