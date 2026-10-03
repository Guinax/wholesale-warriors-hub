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

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;

  if (hadController) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      window.location.reload();
    });
  }

  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        void updateSW(true);
      },
      onRegisteredSW: (_swUrl, registration) => {
        if (!registration) return;

        const checkForUpdate = () => {
          registration.update().catch((error) => {
            console.warn("PWA update check failed", error);
          });
        };

        // Check as soon as the installed app opens.
        checkForUpdate();

        // Re-check while the app stays open.
        const updateInterval = window.setInterval(checkForUpdate, 5 * 60 * 1000);

        // Re-check whenever the user returns to the app.
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") checkForUpdate();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        window.addEventListener(
          "pagehide",
          () => {
            window.clearInterval(updateInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
          },
          { once: true },
        );
      },
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
