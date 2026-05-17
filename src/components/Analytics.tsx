import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Loads Google Analytics (gtag) and/or Google Tag Manager based on values
 * stored in the public `site_settings` table:
 *   - `analytics_id`  -> GA4 Measurement ID (e.g. "G-XXXX")
 *   - `gtm_id`        -> Google Tag Manager container ID (e.g. "GTM-XXXX")
 *
 * Also tracks SPA route changes as virtual pageviews.
 */
const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["analytics_id", "gtm_id"]);
      if (cancelled || !data) return;

      const map: Record<string, string> = {};
      data.forEach((r: { key: string; value: string | null }) => {
        if (r.value) map[r.key] = r.value.trim();
      });

      const gaId = map["analytics_id"];
      const gtmId = map["gtm_id"];

      // ---- GA4 (gtag.js) ----
      if (gaId && !document.getElementById("ga-gtag-src")) {
        const s = document.createElement("script");
        s.id = "ga-gtag-src";
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.appendChild(s);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(...args: any[]) {
          window.dataLayer.push(args);
        };
        window.gtag("js", new Date());
        window.gtag("config", gaId, { send_page_view: true });
      }

      // ---- Google Tag Manager ----
      if (gtmId && !document.getElementById("gtm-src")) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          "gtm.start": new Date().getTime(),
          event: "gtm.js",
        });
        const s = document.createElement("script");
        s.id = "gtm-src";
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
        document.head.appendChild(s);

        // <noscript> fallback iframe
        if (!document.getElementById("gtm-noscript")) {
          const ns = document.createElement("noscript");
          ns.id = "gtm-noscript";
          ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
            gtmId
          )}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
          document.body.prepend(ns);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // SPA pageview tracking
  useEffect(() => {
    const path = location.pathname + location.search;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: "pageview", page: path });
    }
  }, [location.pathname, location.search]);

  return null;
};

export default Analytics;
