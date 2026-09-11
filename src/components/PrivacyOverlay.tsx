"use client";

import { useEffect, useState } from "react";

/**
 * Hides screen content the instant the app is backgrounded (app switcher,
 * swipe-up, alt-tab), so client/nurse details never appear in the OS's
 * backgrounded-app preview snapshot. This does NOT block screenshots taken
 * while the app is in the foreground — no web platform allows that.
 */
export default function PrivacyOverlay() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    function handleVisibility() {
      setHidden(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  if (!hidden) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999, background: "var(--primary)" }}
    >
      <span className="font-bold text-lg text-white" style={{ letterSpacing: "-0.02em" }}>IV Hub</span>
    </div>
  );
}
