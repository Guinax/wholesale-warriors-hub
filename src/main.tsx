import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: register only on real published hosts (never in Lovable preview / iframes)
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

// The deployed revision is compiled into the app; the server exposes the latest
// revision at /build-info.json with no-store headers (see vercel.json).
declare const __APP_BUILD_REVISION__: string;
const currentRevision = __APP_BUILD_REVISION__;

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  let reloadingForUpdate = false;
  let lastCheckAt = 0;
  let checkInProgress = false;

  // A newly activated service worker must take over without requiring a reinstall.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        // Install the new version immediately, without a confirmation dialog.
        void updateSW(true);
      },
      onRegisteredSW: (_swUrl, registration) => {
        if (!registration) return;

        const checkForUpdate = async () => {
          if (!navigator.onLine || checkInProgress) return;
          // Prevent repeated checks triggered by startup + visibility + focus.
          const now = Date.now();
          if (now - lastCheckAt < 10_000) return;
          lastCheckAt = now;
          checkInProgress = true;
          try {
            // Explicit SW update: checks the published PWA files on every launch.
            await registration.update();

            // Extra protection when an older HTML/script was served from cache:
            // compare the running build with the current production build.
            const response = await fetch(`/build-info.json?ts=${now}`, {
              cache: "no-store",
            });
            if (!response.ok) return;
            const info = (await response.json()) as { revision?: unknown };
            const latest = typeof info.revision === "string" ? info.revision : "";
            if (!latest || latest === "unknown" || currentRevision === "unknown" ||
                latest === currentRevision || reloadingForUpdate) return;

            // Avoid an infinite reload loop if a network proxy still serves old assets.
            const reloadKey = "adega-update-reload";
            const previous = sessionStorage.getItem(reloadKey);
            const [previousRevision, previousTime] = previous?.split(":") ?? [];
            if (previousRevision === latest && now - Number(previousTime) < 60_000) return;
            sessionStorage.setItem(reloadKey, `${latest}:${now}`);
            reloadingForUpdate = true;
            window.location.reload();
          } catch (error) {
            // If offline or the update endpoint fails, keep the installed app usable.
            console.warn("Não foi possível verificar a atualização do aplicativo", error);
          } finally {
            checkInProgress = false;
          }
        };

        // Check on every app opening, whenever the app returns to foreground,
        // when connectivity returns, and periodically during long sessions.
        void checkForUpdate();
        const interval = window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);
        const onVisibility = () => {
          if (document.visibilityState === "visible") void checkForUpdate();
        };
        const onOnline = () => void checkForUpdate();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("online", onOnline);

        window.addEventListener("pagehide", () => {
          window.clearInterval(interval);
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("online", onOnline);
        }, { once: true });
      },
    });
  }).catch((error) => {
    console.warn("Falha ao registrar atualização automática do aplicativo", error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
