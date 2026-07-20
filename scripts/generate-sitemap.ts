// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Fetches published posts and courses from Supabase and writes public/sitemap.xml.
// Follows sitemaps.org 0.9 + Google image sitemap extension.

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

type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: ChangeFreq;
  priority?: string;
  image?: { loc: string; title?: string };
}

// Only public, indexable routes. Auth-gated (/login, /profile,
// /complete-profile, /courses/:slug/learn) are noindex — omitted.
const nowIso = new Date().toISOString();
const staticEntries: SitemapEntry[] = [
  { path: "/", lastmod: nowIso, changefreq: "daily", priority: "1.0" },
  { path: "/blog", lastmod: nowIso, changefreq: "daily", priority: "0.9" },
  { path: "/courses", lastmod: nowIso, changefreq: "weekly", priority: "0.9" },
  { path: "/categories", lastmod: nowIso, changefreq: "weekly", priority: "0.6" },
  { path: "/about", lastmod: nowIso, changefreq: "monthly", priority: "0.5" },
  { path: "/referrals", lastmod: nowIso, changefreq: "monthly", priority: "0.4" },
];

const isValidSlug = (s: unknown): s is string =>
  typeof s === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s.trim());

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );

async function fetchDynamic(): Promise<SitemapEntry[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const entries: SitemapEntry[] = [];

    // Posts: published only, slug present, not scheduled in the future.
    const { data: posts, error: postsErr } = await supabase
      .from("posts")
      .select("slug, title, featured_image, updated_at, published_at, is_published")
      .eq("is_published", true)
      .not("slug", "is", null)
      .neq("slug", "")
      .or(`published_at.is.null,published_at.lte.${nowIso}`);
    if (postsErr) throw postsErr;

    let skippedPosts = 0;
    posts?.forEach((p: any) => {
      if (!isValidSlug(p.slug)) {
        skippedPosts++;
        return;
      }
      entries.push({
        path: `/blog/${p.slug.trim()}`,
        lastmod: p.updated_at || p.published_at || undefined,
        changefreq: "weekly",
        priority: "0.8",
        image: p.featured_image
          ? { loc: p.featured_image, title: p.title }
          : undefined,
      });
    });

    // Courses: published only, slug present.
    const { data: courses, error: coursesErr } = await supabase
      .from("courses")
      .select("slug, title, cover_image, updated_at, is_published")
      .eq("is_published", true)
      .not("slug", "is", null)
      .neq("slug", "");
    if (coursesErr) throw coursesErr;

    let skippedCourses = 0;
    courses?.forEach((c: any) => {
      if (!isValidSlug(c.slug)) {
        skippedCourses++;
        return;
      }
      entries.push({
        path: `/courses/${c.slug.trim()}`,
        lastmod: c.updated_at || undefined,
        changefreq: "weekly",
        priority: "0.8",
        image: c.cover_image ? { loc: c.cover_image, title: c.title } : undefined,
      });
    });

    console.log(
      `sitemap: dynamic entries — posts=${posts?.length ?? 0} (skipped ${skippedPosts}), ` +
        `courses=${courses?.length ?? 0} (skipped ${skippedCourses})`,
    );

    return entries;
  } catch (err) {
    console.warn("sitemap: failed to fetch dynamic entries —", err);
    return [];
  }
}

function buildXml(entries: SitemapEntry[]) {
  const urls = entries.map((e) => {
    const lines = [
      `  <url>`,
      `    <loc>${escapeXml(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      e.image
        ? [
            `    <image:image>`,
            `      <image:loc>${escapeXml(e.image.loc)}</image:loc>`,
            e.image.title
              ? `      <image:title>${escapeXml(e.image.title)}</image:title>`
              : null,
            `    </image:image>`,
          ]
            .filter(Boolean)
            .join("\n")
        : null,
      `  </url>`,
    ].filter(Boolean);
    return lines.join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

(async () => {
  const dynamic = await fetchDynamic();
  // Deduplicate by path — static entries win.
  const seen = new Set(staticEntries.map((e) => e.path));
  const merged = [...staticEntries, ...dynamic.filter((e) => !seen.has(e.path))];
  writeFileSync(resolve("public/sitemap.xml"), buildXml(merged));
  console.log(`sitemap.xml written (${merged.length} entries)`);
})();
