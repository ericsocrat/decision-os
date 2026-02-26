"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and provides an offline status indicator.
 *
 * Rendered in the root layout. Does nothing during SSR or in development
 * (Next.js dev server doesn't support service workers properly).
 */
export function ServiceWorkerRegistrar() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Don't register in development — SW caching interferes with hot reload
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // Listen for new SW waiting to activate (= new deploy available)
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — show update banner
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[DecisionOS] SW registration failed:", err);
      });

    // Periodic update check (every 60 min)
    const interval = setInterval(
      () => {
        registration?.update();
      },
      60 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const handleUpdate = () => {
    // Tell the waiting SW to activate immediately
    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  return (
    <>
      {/* Offline indicator */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 shadow-lg dark:bg-amber-900 dark:text-amber-100"
        >
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          You are offline — changes are saved locally
        </div>
      )}

      {/* Update available banner */}
      {showUpdate && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 shadow-lg dark:bg-blue-900 dark:text-blue-100"
        >
          A new version is available
          <button
            onClick={handleUpdate}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Update
          </button>
        </div>
      )}
    </>
  );
}
