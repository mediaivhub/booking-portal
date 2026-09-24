"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "./Toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    setDenied(Notification.permission === "denied");

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      // Re-register on every load, not just when the user first subscribes. Keeps the
      // server's record in sync if it ever drifts (row cleared, subscription re-created
      // by the OS, etc.) without requiring a manual toggle-off/on to notice and fix it.
      if (sub) api.push.subscribe(sub.toJSON()).catch(() => {});
    });

    // Opening the app at all counts as "seen" — clear the home-screen icon's red badge.
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.()?.catch(() => {});
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.push.unsubscribe(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast("Notifications turned off");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDenied(permission === "denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await api.push.subscribe(sub.toJSON());
      setSubscribed(true);
      toast("Notifications enabled");
    } catch {
      toast("Couldn't update notification settings");
    } finally {
      setBusy(false);
    }
  }

  if (!supported || denied) return null;

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        title={subscribed ? "Turn off notifications" : "Enable notifications"}
        className="p-2 rounded-lg flex disabled:opacity-50"
        style={{ color: subscribed ? "#fff" : "rgba(255,255,255,0.5)" }}
      >
        {subscribed ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        )}
      </button>

      {!subscribed && !bannerDismissed && createPortal(
        <div
          className="fixed left-3 right-3 z-40 flex items-center gap-3 rounded-2xl border p-3 shadow-lg"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)",
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <p className="flex-1 text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
            Turn on notifications for bookings and stock alerts
          </p>
          <button
            onClick={toggle}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50 shrink-0"
            style={{ background: "var(--primary)" }}
          >
            {busy ? "..." : "Enable"}
          </button>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss"
            className="p-1 shrink-0"
            style={{ color: "var(--text-3)" }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
