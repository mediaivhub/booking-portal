"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // An installed PWA can stay open across a deploy without ever reloading, so it keeps
    // running the JS it last loaded. Once a new worker takes over an already-controlled
    // page (a real update, not the first-ever install), force a reload to pick it up.
    const hadController = !!navigator.serviceWorker.controller;
    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => { registration = r; })
      .catch(() => {});

    const onControllerChange = () => {
      if (hadController) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // The browser only checks for a new worker file on its own schedule (roughly once a
    // day). An installed app can sit backgrounded for a while, so also check whenever it's
    // brought back to the foreground — that's when a stale install is most likely noticed.
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
