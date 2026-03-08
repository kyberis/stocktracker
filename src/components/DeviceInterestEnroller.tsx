"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

export default function DeviceInterestEnroller() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    let pending = false;
    try {
      pending = sessionStorage.getItem("device_interest_pending") === "1";
    } catch { /* private browsing */ }
    if (!pending) return;

    sessionStorage.removeItem("device_interest_pending");

    fetch("/api/device-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    })
      .then((r) => r.json())
      .then((data) => {
        setAlreadyEnrolled(data.alreadyEnrolled === true);
        setShow(true);
      })
      .catch(() => {
        setShow(true);
      });
  }, [user?.email]);

  const dismiss = useCallback(() => setShow(false), []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {alreadyEnrolled ? "You\u2019re already on the list!" : "You\u2019re on the waitlist!"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
          {alreadyEnrolled
            ? "We already have your email registered. We\u2019ll notify you as soon as the trefolio device is available for purchase."
            : "We\u2019ll send you an email when the trefolio hardware device is available. Buyers get a free year of Pro included!"}
        </p>

        <button
          onClick={dismiss}
          className="btn-primary w-full"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
