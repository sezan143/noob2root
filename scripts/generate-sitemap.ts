// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Fetches published posts and courses from Supabase and writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://noobtoroot.com";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://arfvjnbsjroryvchknnq.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZnZqbmJzanJvcnl2Y2hrbm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjg3OTMsImV4cCI6MjA5NDEwNDc5M30.sBcBPyFRV165Dt1dGxBDuKYOxmPI_Raw9WRTTJMybHU";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.7" },
  { path: "/courses", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/login", changefreq: "monthly", priority: "0.3" },
  { path: "/complete-profile", changefreq: "monthly", priority: "0.3" },
  { path: "/profile", changefreq: "monthly", priority: "0.3" },
  { path: "/referrals", changefreq: "weekly", priority: "0.5" },
];

async function fetchDynamic(): Promise<SitemapEntry[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const entries: SitemapEntry[] = [];

    const { data: posts } = await supabase
      .from("posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true);
    posts?.forEach((p: any) => {
      entries.push({
        path: `/blog/${p.slug}`,
        lastmod: (p.updated_at || p.published_at || "").split("T")[0] || undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    });

    const { data: courses } = await supabase
      .from("courses")
      .select("slug, updated_at")
      .eq("is_published", true);
    courses?.forEach((c: any) => {
      const lastmod = (c.updated_at || "").split("T")[0] || undefined;
      entries.push({
        path: `/courses/${c.slug}`,
        lastmod,
        changefreq: "weekly",
        priority: "0.8",
      });
      entries.push({
        path: `/courses/${c.slug}/learn`,
        lastmod,
        changefreq: "weekly",
        priority: "0.7",
      });
    });

    // Note: /blog?category=<slug> is intentionally NOT emitted — query-string
    // variants resolve to /blog and get flagged by Google as "Alternate page
    // with proper canonical tag".

    return entries;
  } catch (err) {
    console.warn("sitemap: failed to fetch dynamic entries —", err);
    return [];
  }
}

function buildXml(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const dynamic = await fetchDynamic();
  const entries = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), buildXml(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
})();
