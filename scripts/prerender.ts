/**
 * Post-build prerender: writes per-route dist/<path>/index.html files with
 * correct <title>, description, canonical, and Open Graph tags baked into
 * the initial HTML. Without this, every route ships the same static tags
 * from index.html and Googlebot/social crawlers index them all under the
 * homepage title.
 *
 * This is NOT full SSR — the body remains the SPA shell and React hydrates
 * on top. Only the <head> is customized per route.
 *
 * Runs as `postbuild` in package.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://noobtoroot.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
const DEFAULT_DESC =
  "Noob to Root — Hands-on tech tutorials, ethical hacking guides, Linux, networking, and developer walkthroughs from zero to root.";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://arfvjnbsjroryvchknnq.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZnZqbmJzanJvcnl2Y2hrbm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjg3OTMsImV4cCI6MjA5NDEwNDc5M30.sBcBPyFRV165Dt1dGxBDuKYOxmPI_Raw9WRTTJMybHU";

const DIST = resolve("dist");
const TEMPLATE_PATH = join(DIST, "index.html");

interface Meta {
  path: string;                     // route path e.g. "/blog/foo"
  title: string;                    // page-only title (site name is appended)
  description: string;
  image?: string;                   // absolute or site-relative
  type?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  jsonLd?: unknown[];               // extra JSON-LD blocks
}

const SITE_NAME = "Noob to Root";

const abs = (u?: string) => {
  if (!u) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
};

const clip = (s: string, n = 160) => {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
};

const escapeAttr = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Render the per-route <head> injections for the template. */
function renderHead(meta: Meta): { title: string; tags: string } {
  const full =
    meta.title.includes(SITE_NAME) ? meta.title : `${meta.title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${meta.path === "/" ? "" : meta.path.replace(/\/$/, "")}`;
  const desc = clip(meta.description || DEFAULT_DESC);
  const image = abs(meta.image);
  const type = meta.type ?? "website";

  const lines: string[] = [];
  lines.push(`<meta name="description" content="${escapeAttr(desc)}" />`);
  lines.push(`<link rel="canonical" href="${url}" />`);
  if (meta.tags?.length)
    lines.push(`<meta name="keywords" content="${escapeAttr(meta.tags.join(", "))}" />`);
  if (meta.author)
    lines.push(`<meta name="author" content="${escapeAttr(meta.author)}" />`);

  // Open Graph
  lines.push(`<meta property="og:type" content="${type}" />`);
  lines.push(`<meta property="og:site_name" content="${SITE_NAME}" />`);
  lines.push(`<meta property="og:title" content="${escapeAttr(full)}" />`);
  lines.push(`<meta property="og:description" content="${escapeAttr(desc)}" />`);
  lines.push(`<meta property="og:url" content="${url}" />`);
  lines.push(`<meta property="og:image" content="${escapeAttr(image)}" />`);
  lines.push(`<meta property="og:image:alt" content="${escapeAttr(meta.title)}" />`);
  lines.push(`<meta property="og:locale" content="en_US" />`);

  if (type === "article") {
    if (meta.publishedAt)
      lines.push(`<meta property="article:published_time" content="${escapeAttr(meta.publishedAt)}" />`);
    if (meta.updatedAt)
      lines.push(`<meta property="article:modified_time" content="${escapeAttr(meta.updatedAt)}" />`);
    if (meta.author)
      lines.push(`<meta property="article:author" content="${escapeAttr(meta.author)}" />`);
    meta.tags?.forEach((t) =>
      lines.push(`<meta property="article:tag" content="${escapeAttr(t)}" />`),
    );
  }

  // Twitter
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
  lines.push(`<meta name="twitter:title" content="${escapeAttr(full)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
  lines.push(`<meta name="twitter:image" content="${escapeAttr(image)}" />`);
  lines.push(`<meta name="twitter:image:alt" content="${escapeAttr(meta.title)}" />`);

  (meta.jsonLd ?? []).forEach((j) => {
    lines.push(`<script type="application/ld+json">${JSON.stringify(j)}</script>`);
  });

  return { title: full, tags: lines.join("\n    ") };
}

/**
 * Rewrite the template head:
 *  - swap <title>
 *  - strip existing description / canonical / og:* / twitter:* / keywords / author
 *  - inject fresh per-route tags right before </head>
 */
function applyHead(template: string, meta: Meta): string {
  const { title, tags } = renderHead(meta);

  let html = template;

  // <title>
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeAttr(title)}</title>`,
  );

  // Strip head tags we're going to re-emit. Keep charset/viewport/theme-color/
  // icon/preconnect/preload/style/script and og:site_name-agnostic infra.
  const stripPatterns: RegExp[] = [
    /\s*<meta\s+name=["']description["'][^>]*>/gi,
    /\s*<meta\s+name=["']keywords["'][^>]*>/gi,
    /\s*<meta\s+name=["']author["'][^>]*>/gi,
    /\s*<link\s+rel=["']canonical["'][^>]*>/gi,
    /\s*<meta\s+property=["']og:[^"']+["'][^>]*>/gi,
    /\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi,
    /\s*<meta\s+property=["']article:[^"']+["'][^>]*>/gi,
  ];
  for (const re of stripPatterns) html = html.replace(re, "");

  // Inject before </head>
  html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  return html;
}

function writeRoute(template: string, meta: Meta) {
  const html = applyHead(template, meta);
  const outDir =
    meta.path === "/" ? DIST : join(DIST, meta.path.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
}

// ---------- Route sources ----------

const staticRoutes: Meta[] = [
  {
    path: "/",
    title: "Noob to Root — Tech Tutorials, Linux & Hacking Guides",
    description: DEFAULT_DESC,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_OG_IMAGE,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/blog?search={query}`,
          "query-input": "required name=query",
        },
      },
    ],
  },
  {
    path: "/blog",
    title: "Blog — Tech tutorials, Linux, hacking & DevOps guides",
    description:
      "Read every Noob to Root article — hands-on Linux, ethical hacking, networking, DevOps, and developer walkthroughs.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${SITE_NAME} Blog`,
        url: `${SITE_URL}/blog`,
        description:
          "Hands-on tech tutorials, ethical hacking guides, Linux, networking, and DevOps walkthroughs.",
      },
    ],
  },
  {
    path: "/about",
    title: "About Noob to Root",
    description:
      "Noob to Root publishes hands-on tech tutorials, ethical hacking guides, Linux, and developer walkthroughs — designed to take you from zero to root.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About Noob to Root",
        url: `${SITE_URL}/about`,
      },
    ],
  },
  {
    path: "/categories",
    title: "Browse categories — Linux, hacking, DevOps, networking",
    description:
      "Explore Noob to Root tutorials by category: Linux, ethical hacking, networking, DevOps, and dev guides.",
  },
  {
    path: "/courses",
    title: "Courses — Hands-on cybersecurity & DevOps training",
    description:
      "Structured courses with lessons, quizzes, and certificates. Learn Linux, ethical hacking, and DevOps from zero to root.",
  },
];

async function fetchDynamic(): Promise<Meta[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const nowIso = new Date().toISOString();
  const out: Meta[] = [];

  // Posts
  const { data: posts, error: pErr } = await supabase
    .from("posts")
    .select(
      "slug, title, excerpt, content, featured_image, published_at, updated_at, tags, categories(name, slug), authors(name)",
    )
    .eq("is_published", true)
    .not("slug", "is", null)
    .neq("slug", "")
    .or(`published_at.is.null,published_at.lte.${nowIso}`);
  if (pErr) console.warn("prerender: posts fetch failed —", pErr.message);

  posts?.forEach((p: any) => {
    if (!p.slug) return;
    const slug = String(p.slug).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return;
    const desc =
      (p.excerpt && String(p.excerpt).trim()) ||
      (p.content
        ? String(p.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)
        : DEFAULT_DESC);
    const url = `${SITE_URL}/blog/${slug}`;
    out.push({
      path: `/blog/${slug}`,
      title: p.title || slug,
      description: desc,
      image: p.featured_image ?? undefined,
      type: "article",
      publishedAt: p.published_at ?? undefined,
      updatedAt: p.updated_at ?? undefined,
      author: p.authors?.name ?? undefined,
      tags: p.tags ?? undefined,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: clip(desc, 200),
          image: p.featured_image ? [abs(p.featured_image)] : undefined,
          datePublished: p.published_at || undefined,
          dateModified: p.updated_at || p.published_at || undefined,
          author: p.authors?.name
            ? { "@type": "Person", name: p.authors.name }
            : { "@type": "Organization", name: SITE_NAME },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          keywords: (p.tags ?? []).join(", "),
          articleSection: p.categories?.name,
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
            ...(p.categories
              ? [{
                  "@type": "ListItem",
                  position: 3,
                  name: p.categories.name,
                  item: `${SITE_URL}/blog?category=${p.categories.slug}`,
                }]
              : []),
            {
              "@type": "ListItem",
              position: p.categories ? 4 : 3,
              name: p.title,
              item: url,
            },
          ],
        },
      ],
    });
  });

  // Courses
  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select("slug, title, description, cover_image, updated_at")
    .eq("is_published", true)
    .not("slug", "is", null)
    .neq("slug", "");
  if (cErr) console.warn("prerender: courses fetch failed —", cErr.message);

  courses?.forEach((c: any) => {
    if (!c.slug) return;
    const slug = String(c.slug).trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return;
    out.push({
      path: `/courses/${slug}`,
      title: c.title || slug,
      description: c.description || DEFAULT_DESC,
      image: c.cover_image ?? undefined,
      updatedAt: c.updated_at ?? undefined,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Course",
          name: c.title,
          description: clip(c.description || DEFAULT_DESC, 200),
          provider: { "@type": "Organization", name: SITE_NAME, sameAs: SITE_URL },
          url: `${SITE_URL}/courses/${slug}`,
        },
      ],
    });
  });

  console.log(
    `prerender: dynamic — posts=${posts?.length ?? 0}, courses=${courses?.length ?? 0}`,
  );

  return out;
}

(async () => {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`prerender: ${TEMPLATE_PATH} not found — run 'vite build' first.`);
    process.exit(1);
  }
  const template = readFileSync(TEMPLATE_PATH, "utf8");

  const dynamic = await fetchDynamic();
  const all = [...staticRoutes, ...dynamic];

  for (const route of all) writeRoute(template, route);
  console.log(`prerender: wrote ${all.length} route(s) under dist/`);
})();
