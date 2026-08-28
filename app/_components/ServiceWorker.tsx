"use client";

import { useEffect } from "react";

/**
 * Registers the T-CACHE service worker.
 *
 * Registration is deferred until after load. S1 budgets 1.5s to tappable
 * on 3G (D3 S1 Loading), and registering during the critical path
 * competes with the first render for the same connection.
 *
 * Failure is silent by design: the service worker only adds offline
 * reading (F3). Without it every screen still works online, so a
 * registration error is not a user-facing problem and must not produce
 * an error state. There is no D5 code for it, which is the tell.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
