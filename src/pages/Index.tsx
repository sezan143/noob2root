import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Terminal,
  ShieldCheck,
  Cpu,
  Network,
  Bug,
  Lock,
  Trophy,
  Users,
  Zap,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import PostCard from "@/components/blog/PostCard";
import CategoryCard from "@/components/blog/CategoryCard";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import { supabase } from "@/integrations/supabase/client";
import { unsplashSrc, unsplashSrcSet } from "@/lib/img";
import type { DbPost, DbCategory } from "@/types/database";

type DbCourse = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  cover_image: string | null;
  level: string | null;
  duration_minutes: number | null;
};

const TERMINAL_LINES = [
  { p: "root@noobtoroot:~#", t: "whoami" },
  { o: "→ future_ethical_hacker" },
  { p: "root@noobtoroot:~#", t: "nmap -sV target.lab" },
  { o: "→ 22/tcp  open  ssh   OpenSSH 9.2" },
  { o: "→ 80/tcp  open  http  nginx 1.25" },
  { p: "root@noobtoroot:~#", t: "sudo ./learn --from=zero --to=root" },
  { o: "✓ access granted. welcome, operator." },
];

const FEATURES = [
  { icon: Terminal, title: "Hands-on Labs", desc: "Real shells, real targets. No fluff, only payloads that work." },
  { icon: ShieldCheck, title: "Verified Certificates", desc: "Earn signed PDF credentials after every course completion." },
  { icon: Bug, title: "CTF-style Challenges", desc: "Sharpen offense & defense with progressive difficulty rooms." },
  { icon: Network, title: "From Zero to Root", desc: "Curated paths: Linux → Networking → Pentesting → DevOps." },
  { icon: Lock, title: "Modern Security", desc: "OWASP, cloud security, hardening, and red-team tradecraft." },
  { icon: Cpu, title: "DevOps & Systems", desc: "Containers, CI/CD, infrastructure-as-code, observability." },
];

const STATS = [
  { v: "120+", l: "Tutorials" },
  { v: "20+", l: "Courses" },
  { v: "12k+", l: "Operators" },
  { v: "4.9★", l: "Avg Rating" },
];

const Index = () => {
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [typed, setTyped] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      const [postsRes, catsRes, coursesRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*, authors(*), categories(*)")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(6),
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("courses")
          .select("id, slug, title, short_description, cover_image, level, duration_minutes")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setPosts((postsRes.data as DbPost[]) ?? []);
      setCategories(catsRes.data ?? []);
      setCourses((coursesRes.data as DbCourse[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // animated terminal reveal
  useEffect(() => {
    if (typed >= TERMINAL_LINES.length) return;
    const id = setTimeout(() => setTyped((n) => n + 1), 380);
    return () => clearTimeout(id);
  }, [typed]);

  const featuredPosts = posts.filter((p) => p.is_featured);
  const latestPosts = posts.slice(0, 6);

  return (
    <Layout>
      <SEO
        title="Noob to Root — Premium Cybersecurity & Tech Tutorials"
        description="Premium hands-on tutorials & certified courses in ethical hacking, Linux, networking, DevOps & cybersecurity. From Zero to Root."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Noob to Root",
          url: typeof window !== "undefined" ? window.location.origin : "",
          potentialAction: {
            "@type": "SearchAction",
            target: `${typeof window !== "undefined" ? window.location.origin : ""}/blog?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-20">
        {/* Cyber grid backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)/0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-secondary/15 blur-[140px] pointer-events-none" />
        {/* scanline */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, hsl(var(--primary)) 0 1px, transparent 1px 4px)",
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
            {/* Left: copy — no fade-in so the static hero stays the LCP element */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Cybersecurity · Linux · DevOps
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] mb-6">
                <span className="text-foreground">Hack the gap</span>
                <br />
                <span className="gradient-text">From Zero to Root.</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                A premium playground for ethical hackers, sysadmins, and builders.
                Hands-on labs, certified courses, and battle-tested guides — built
                by operators, for the next generation of operators.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/courses"
                  className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold transition-all hover:scale-[1.02] neon-glow overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Start Learning
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card/40 backdrop-blur-sm text-foreground font-medium hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Terminal className="w-4 h-4" />
                  Read the Blog
                </Link>
              </div>

              {/* trust row */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Free certificates</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Real-world labs</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> No fluff content</span>
              </div>
            </div>

            {/* Right: terminal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 via-secondary/30 to-accent/30 blur-xl opacity-60" />
              <div className="relative rounded-2xl border border-primary/30 bg-[hsl(0_0%_5%)] shadow-[0_0_60px_-15px_hsl(var(--primary)/0.55)] overflow-hidden">
                {/* title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/60">
                  <span className="w-3 h-3 rounded-full bg-destructive/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-primary/80" />
                  <span className="ml-3 text-xs text-muted-foreground font-mono">/usr/local/bin/zsh — 80×24</span>
                </div>
                {/* body */}
                <div className="p-5 font-mono text-sm leading-relaxed min-h-[320px]">
                  {TERMINAL_LINES.slice(0, typed).map((line, i) =>
                    "p" in line ? (
                      <div key={i} className="flex gap-2">
                        <span className="text-primary">{line.p}</span>
                        <span className="text-foreground">{line.t}</span>
                      </div>
                    ) : (
                      <div key={i} className="text-muted-foreground pl-2">{line.o}</div>
                    )
                  )}
                  {typed < TERMINAL_LINES.length && (
                    <span className="inline-block w-2 h-4 bg-primary align-middle animate-pulse" />
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* STATS strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl border border-border bg-border overflow-hidden">
            {STATS.map((s) => (
              <div key={s.l} className="bg-card/70 backdrop-blur-sm py-6 px-4 text-center">
                <div className="text-2xl md:text-3xl font-heading font-bold text-primary">{s.v}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-mono">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-primary">// what you get</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">
              Built for the modern operator
            </h2>
            <p className="text-muted-foreground mt-3">
              Everything you need to go from curious noob to confident root — without paywalls in front of the good stuff.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="group relative rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 hover:border-primary/40 transition-all hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-4 group-hover:shadow-[0_0_25px_-5px_hsl(var(--primary))] transition-shadow">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* FEATURED COURSES */}
          {courses.length > 0 && (
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-primary">// learn by doing</span>
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Featured Courses</h2>
                  </div>
                  <Link to="/courses" className="text-sm text-primary hover:underline flex items-center gap-1 font-mono">
                    All courses <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {courses.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                    >
                      <Link
                        to={`/courses/${c.slug}`}
                        className="group block rounded-xl border border-border bg-card/60 overflow-hidden hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]"
                      >
                        <div className="aspect-video overflow-hidden bg-muted relative">
                          <img
                            src={unsplashSrc(c.cover_image, 720)}
                            srcSet={c.cover_image ? unsplashSrcSet(c.cover_image) : undefined}
                            sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 100vw"
                            alt={c.title}
                            width={720}
                            height={405}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                          {c.level && (
                            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-mono bg-primary/20 border border-primary/40 text-primary backdrop-blur-sm">
                              {c.level}
                            </span>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {c.title}
                          </h3>
                          {c.short_description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.short_description}</p>
                          )}
                          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-primary" /> Certificate</span>
                            {c.duration_minutes ? <span>{Math.round(c.duration_minutes / 60)}h</span> : null}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* FEATURED POSTS */}
          {featuredPosts.length > 0 && (
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-primary">// editor's pick</span>
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Featured Reads</h2>
                  </div>
                  <Link to="/blog" className="text-sm text-primary hover:underline flex items-center gap-1 font-mono">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPosts.map((post) => (
                    <PostCard key={post.id} post={post} featured />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* LATEST POSTS */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-primary">// fresh drops</span>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Latest Posts</h2>
                </div>
                <Link to="/blog" className="text-sm text-primary hover:underline flex items-center gap-1 font-mono">
                  Browse all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </section>

          {/* CATEGORIES */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="mb-8">
                <span className="text-xs font-mono uppercase tracking-widest text-primary">// pick your path</span>
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-2">Explore Topics</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-10 md:p-14 text-center">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <Users className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
                Join the next-gen <span className="gradient-text">cyber community</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Weekly drops on offensive security, Linux internals, and dev tooling — straight to your inbox.
              </p>
              <div className="mt-8 max-w-md mx-auto">
                <NewsletterSignup />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
