import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check if RSS is enabled
  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["site_name", "site_tagline", "site_description", "rss_enabled"]);

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s: any) => { settingsMap[s.key] = s.value ?? ""; });

  const rawSiteUrl = url.searchParams.get("site_url") || "https://frogtech.blog";
  // Only allow http/https URL origins; reject anything else to prevent XML injection.
  let siteUrl = "https://frogtech.blog";
  try {
    const u = new URL(rawSiteUrl);
    if (u.protocol === "http:" || u.protocol === "https:") {
      siteUrl = u.origin;
    }
  } catch {
    // keep default
  }
  const siteName = settingsMap.site_name || "FrogTech";
  const siteDesc = settingsMap.site_description || settingsMap.site_tagline || "Tech blog";
  const type = url.searchParams.get("type") || "rss";

  if (type === "sitemap") {
    const { data: posts } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    const { data: cats } = await supabase
      .from("categories")
      .select("slug");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${siteUrl}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${siteUrl}/categories</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${siteUrl}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`;

    posts?.forEach((p: any) => {
      xml += `\n  <url><loc>${siteUrl}/blog/${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    });

    cats?.forEach((c: any) => {
      xml += `\n  <url><loc>${siteUrl}/blog?category=${c.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    });

    xml += "\n</urlset>";

    return new Response(xml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  // RSS Feed
  if (settingsMap.rss_enabled !== "true") {
    return new Response("RSS feed is disabled", { status: 404, headers: corsHeaders });
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("title, slug, excerpt, published_at, updated_at, authors(name)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`;

  posts?.forEach((p: any) => {
    rss += `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${siteUrl}/blog/${p.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${p.slug}</guid>
      <description>${escapeXml(p.excerpt || "")}</description>
      <pubDate>${new Date(p.published_at || p.updated_at).toUTCString()}</pubDate>
      ${p.authors?.name ? `<author>${escapeXml(p.authors.name)}</author>` : ""}
    </item>`;
  });

  rss += "\n  </channel>\n</rss>";

  return new Response(rss, {
    headers: { ...corsHeaders, "Content-Type": "application/rss+xml; charset=utf-8" },
  });
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
