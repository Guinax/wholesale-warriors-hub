import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Session-level analytics. No GPS, fingerprint, IP address or personal identifiers.
export default function VisitTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const key = "maromba-visit-session";
    let visitorSession = sessionStorage.getItem(key);
    if (!visitorSession) {
      visitorSession = crypto.randomUUID();
      sessionStorage.setItem(key, visitorSession);
    }
    const ua = navigator.userAgent;
    const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "celular" : "computador";
    let referrerHost: string | null = null;
    try {
      if (document.referrer) {
        const host = new URL(document.referrer).hostname;
        if (host && host !== window.location.hostname) referrerHost = host.slice(0, 200);
      }
    } catch { /* invalid referrer */ }
    const params = new URLSearchParams(search);
    const campaign = params.get("utm_source")?.slice(0, 120) || null;
    // Excludes query strings (possible tokens / emails) and user identifiers.
    void supabase.from("site_visit_events" as never).insert({
      visitor_session: visitorSession,
      path: pathname.slice(0, 300),
      referrer_host: referrerHost,
      campaign_source: campaign,
      device_type: device,
    } as never).then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("Falha no registro de visita", error.message);
    });
  }, [pathname, search]);
  return null;
}
