
## Root cause analysis

GSC shows three issues. The biggest one ("Alternate page with proper canonical tag" — 10 pages) is caused by a bug in our head tags:

**Bug:** `index.html` hard-codes `<link rel="canonical" href="https://noobtoroot.com/" />`. `react-helmet-async` adds the per-route canonical from `SEO.tsx`, but Helmet does **not** dedupe `<link>` tags by `rel`. So every page (e.g. `/blog/foo`) ships with **two** canonicals:
1. `https://noobtoroot.com/` (from index.html)
2. `https://noobtoroot.com/blog/foo` (from Helmet)

Google sees the first one, decides the page is an alternate of the homepage, and refuses to index it. Same issue with the hard-coded `og:url`.

**Secondary issue ("Alternate" group):** `scripts/generate-sitemap.ts` emits `/blog?category=<slug>` entries. These render the same `/blog` page with a query filter and the canonical resolves back to `/blog`, so Google flags them as alternates. They should not be in the sitemap.

**"Page with redirect" (3 pages):** Likely old slugs you renamed, or non-canonical hostname variants (e.g. `www.noobtoroot.com` → `noobtoroot.com`). Can't be diagnosed without seeing the exact URLs in GSC — I'll add a note asking you to share them if the fix below doesn't clear it on the next crawl.

**"Discovered – currently not indexed" (9 pages):** Not an error. Google has queued them but hasn't crawled yet. Will resolve naturally once the canonical bug is fixed and you Request Indexing.

## Changes

1. **`index.html`** — remove the static `<link rel="canonical">` line. Leave the og:* tags in place (they act as fallback for non-JS social crawlers; Helmet overrides them per route for Google).

2. **`scripts/generate-sitemap.ts`** — remove the `categories` loop that emits `/blog?category=<slug>` entries. Keep the static routes, posts, and courses.

3. **`public/sitemap.xml`** — regenerate (will happen automatically on next `predev`/`prebuild`, but I'll also write the cleaned file directly so it's correct immediately).

## What you should do after deploy

- In Google Search Console, click **Validate Fix** on the "Alternate page with proper canonical tag" issue.
- Use **URL Inspection → Request Indexing** on 2–3 important pages (homepage, a top blog post, a course) to speed up re-crawl.
- If "Page with redirect" doesn't clear within ~1 week, share the exact URLs from GSC and I'll trace them — most likely candidates are renamed post slugs or a `www` vs apex hostname mismatch.

## Technical notes

- Per the `head-meta` guidance: when adopting `react-helmet-async`, the static canonical in `index.html` must be removed because `<link>` tags don't dedupe. og:* tags do dedupe by `property`, so leaving them as fallbacks is correct.
- The sitemap generator runs on `predev` and `prebuild` (already wired in `package.json`), so the next build will produce the correct file.
