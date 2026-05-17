import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Eye, Calendar, Share2, Twitter, Linkedin, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import ReadingProgressBar from "@/components/blog/ReadingProgressBar";
import PostCard from "@/components/blog/PostCard";
import { supabase } from "@/integrations/supabase/client";
import type { DbPost } from "@/types/database";

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<DbPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<DbPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, authors(*), categories(*)")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();

      if (data) {
        setPost(data as DbPost);
        // Fetch related posts from same category
        if (data.category_id) {
          const { data: related } = await supabase
            .from("posts")
            .select("*, authors(*), categories(*)")
            .eq("is_published", true)
            .eq("category_id", data.category_id)
            .neq("id", data.id)
            .limit(3);
          setRelatedPosts((related as DbPost[]) ?? []);
        }
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline">Back to Blog</Link>
        </div>
      </Layout>
    );
  }

  // Parse content, inject stable IDs on headings, and build TOC
  const { processedHtml, headings } = useMemo(() => {
    if (!post.content) return { processedHtml: "", headings: [] as { id: string; text: string; level: number }[] };
    const sanitized = DOMPurify.sanitize(post.content);
    if (typeof window === "undefined") return { processedHtml: sanitized, headings: [] };
    const slugify = (s: string) =>
      s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "section";
    const doc = new DOMParser().parseFromString(sanitized, "text/html");
    const items: { id: string; text: string; level: number }[] = [];
    const used = new Set<string>();
    doc.querySelectorAll("h1, h2, h3").forEach((h) => {
      const text = (h.textContent || "").trim();
      if (!text) return;
      let id = h.getAttribute("id") || slugify(text);
      let i = 2;
      const base = id;
      while (used.has(id)) id = `${base}-${i++}`;
      used.add(id);
      h.setAttribute("id", id);
      items.push({ id, text, level: h.tagName === "H1" ? 1 : h.tagName === "H2" ? 2 : 3 });
    });
    return { processedHtml: doc.body.innerHTML, headings: items };
  }, [post.content]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const plainExcerpt =
    post.excerpt?.trim() ||
    (post.content ? post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 155) : "");
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: plainExcerpt,
    image: post.featured_image ? [post.featured_image] : undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: (post as any).updated_at || post.published_at || post.created_at,
    author: post.authors
      ? { "@type": "Person", name: post.authors.name }
      : { "@type": "Organization", name: "Noob to Root" },
    publisher: {
      "@type": "Organization",
      name: "Noob to Root",
      logo: { "@type": "ImageObject", url: `${origin}/og-default.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": shareUrl },
    keywords: (post.tags ?? []).join(", "),
    articleSection: post.categories?.name,
  };

  return (
    <Layout>
      <SEO
        title={post.title}
        description={plainExcerpt}
        image={post.featured_image ?? undefined}
        type="article"
        publishedAt={post.published_at || post.created_at}
        updatedAt={(post as any).updated_at}
        author={post.authors?.name}
        tags={post.tags ?? []}
        canonical={`https://noobtoroot.com/blog/${post.slug}`}
        jsonLd={articleJsonLd}
      />
      <ReadingProgressBar />
      <article className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 max-w-3xl"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {post.categories?.name ?? "Uncategorized"}
              </span>
              {(post as any).is_sponsored && (
                <span className="text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                  Sponsored
                </span>
              )}
            </div>

            {/* Sponsor info */}
            {(post as any).is_sponsored && (post as any).sponsor_name && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                {(post as any).sponsor_logo && (
                  <img src={(post as any).sponsor_logo} alt={(post as any).sponsor_name} className="h-6 object-contain" />
                )}
                <span className="text-xs text-muted-foreground">
                  Sponsored by{" "}
                  {(post as any).sponsor_url ? (
                    <a href={(post as any).sponsor_url} target="_blank" rel="noopener noreferrer sponsored" className="text-primary hover:underline">{(post as any).sponsor_name}</a>
                  ) : (post as any).sponsor_name}
                </span>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-4 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              {post.authors && (
                <div className="flex items-center gap-2">
                  {post.authors.avatar && <img src={post.authors.avatar} alt={post.authors.name} className="w-8 h-8 rounded-full object-cover" />}
                  <span>{post.authors.name}</span>
                </div>
              )}
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(post.published_at || post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.reading_time ?? 5} min read</span>
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{(post.views ?? 0).toLocaleString()} views</span>
            </div>

            {post.featured_image && (
              <div className="rounded-xl overflow-hidden mb-8">
                <img src={post.featured_image} alt={post.title} className="w-full aspect-video object-cover" />
              </div>
            )}

            {processedHtml && (
              <div className="prose-custom" dangerouslySetInnerHTML={{ __html: processedHtml }} />
            )}

            {/* Ad Banner */}
            {(post as any).ad_banner_image && (
              <div className="my-8 rounded-xl overflow-hidden border border-border">
                {(post as any).ad_banner_url ? (
                  <a href={(post as any).ad_banner_url} target="_blank" rel="noopener noreferrer sponsored">
                    <img src={(post as any).ad_banner_image} alt="Advertisement" className="w-full object-cover" />
                  </a>
                ) : (
                  <img src={(post as any).ad_banner_image} alt="Advertisement" className="w-full object-cover" />
                )}
                <p className="text-[10px] text-muted-foreground text-center py-1 bg-muted/30">Advertisement</p>
              </div>
            )}

            {/* Tags */}
            {(post.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                {(post.tags ?? []).map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Share2 className="w-4 h-4" /> Share</span>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground" aria-label="Share on X">
                <Twitter className="w-4 h-4" />
              </a>
              <a href={`https://linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground" aria-label="Share on LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>

            {/* Author Bio */}
            {post.authors && (
              <div className="glass-card p-6 mt-8 flex flex-col sm:flex-row gap-4">
                {post.authors.avatar && <img src={post.authors.avatar} alt={post.authors.name} className="w-16 h-16 rounded-full object-cover" />}
                <div>
                  <p className="font-heading font-semibold text-foreground">{post.authors.name}</p>
                  <p className="text-xs text-primary mb-2">{post.authors.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{post.authors.bio}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Sidebar / TOC */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 glass-card p-5">
                <h4 className="font-heading font-semibold text-foreground text-sm mb-4">Table of Contents</h4>
                <nav className="flex flex-col gap-2">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      onClick={(e) => { e.preventDefault(); scrollToHeading(heading.id); history.replaceState(null, "", `#${heading.id}`); }}
                      className={`text-xs text-muted-foreground hover:text-primary transition-colors leading-relaxed ${heading.level === 3 ? "pl-3" : ""}`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-8">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
};

export default BlogPost;
