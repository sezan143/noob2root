import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  jsonLd?: object;
  canonical?: string;
  noindex?: boolean;
}

const SITE_NAME = "Noob to Root";
const SITE_URL = "https://noobtoroot.com";
const DEFAULT_DESC = "Noob to Root — Hands-on tech tutorials, ethical hacking guides, Linux, networking, and dev walkthroughs from zero to root.";

const toAbsolute = (url?: string) => {
  if (!url) return `${SITE_URL}/og-default.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const normalizeCanonical = (canonical?: string): string => {
  if (!canonical) return SITE_URL;
  let clean = canonical.replace(/\/$/, ""); // remove trailing slash
  if (!clean.startsWith("http")) clean = `${SITE_URL}${clean.startsWith("/") ? "" : "/"}${clean}`;
  return clean;
};

const SEO = ({
  title,
  description = DEFAULT_DESC,
  image,
  url,
  type = "website",
  publishedAt,
  updatedAt,
  author,
  tags,
  jsonLd,
  canonical,
  noindex,
}: SEOProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`.slice(0, 60);
  const canon = normalizeCanonical(canonical);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {author && <meta name="author" content={author} />}
      {tags?.length && <meta name="keywords" content={tags.join(", ")} />}
      <link rel="canonical" href={canon} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canon} />
      <meta property="og:image" content={toAbsolute(image)} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG */}
      {type === "article" && publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {type === "article" && updatedAt && (
        <meta property="article:modified_time" content={updatedAt} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && tags?.map((t) => (
        <meta key={t} property="article:tag" content={t} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={toAbsolute(image)} />
      <meta name="twitter:image:alt" content={title} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}

    </Helmet>
  );
};

export default SEO;
