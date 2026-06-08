import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Clock, Award, Loader2, BookOpen } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Course, formatPrice } from "@/lib/courses";
import { unsplashSrc, unsplashSrcSet } from "@/lib/img";


export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setCourses((data ?? []) as unknown as Course[]);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Noob to Root Courses",
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://noobtoroot.com/courses/${c.slug}`,
      name: c.title,
    })),
  };

  return (
    <Layout>
      <SEO
        title="Courses — Learning Academy"
        description="Hands-on tech courses with quizzes, terminal practice, and verifiable certificates. Linux, hacking, networking, DevOps."
        jsonLd={itemListJsonLd}
      />
      <section className="container mx-auto px-4 pt-32 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-learn/10 border border-learn/30 mb-5">
            <GraduationCap className="w-4 h-4 text-learn" />
            <span className="text-sm text-learn font-medium">Learning Academy</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-5">
            Learn by <span className="text-learn">doing</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Bite-sized lessons, real terminals, instant quizzes, and verifiable certificates. All free to learn.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-learn" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>No courses published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/courses/${c.slug}`}
                  className="group block glass-card-hover overflow-hidden h-full hover:border-learn/50 hover:shadow-[0_0_30px_-10px_hsl(var(--learn)/0.4)]"
                >
                  <div className="aspect-video bg-gradient-to-br from-learn/20 via-card to-primary/10 relative overflow-hidden">
                    {c.cover_image ? (
                      <img
                        src={unsplashSrc(c.cover_image, 640)}
                        srcSet={unsplashSrcSet(c.cover_image)}
                        sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 92vw"
                        alt={c.title}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-16 h-16 text-learn/40" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur text-xs font-medium uppercase tracking-wide">
                      {c.level ?? "beginner"}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="text-xl font-heading font-semibold group-hover:text-learn transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.short_description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {c.duration_minutes ?? 0} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        {c.certificate_paid ? formatPrice(c.certificate_price_cents) + " cert" : "Free cert"}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-learn/10 text-learn font-medium">
                        {c.content_free ? "Free" : formatPrice(c.price_cents)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
