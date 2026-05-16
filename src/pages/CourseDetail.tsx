import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Clock, Award, BookOpen, CheckCircle2, Loader2, Play, Lock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Course, Module, Lesson, fetchCourseFull, formatPrice } from "@/lib/courses";
import { toast } from "sonner";

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<{ course: Course; modules: Module[]; lessons: Lesson[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [progressCount, setProgressCount] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const result = await fetchCourseFull(slug);
      setData(result);
      if (result && user) {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", result.course.id)
          .maybeSingle();
        setEnrolled(!!enr);
        const { count } = await supabase
          .from("lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("course_id", result.course.id);
        setProgressCount(count ?? 0);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const handleEnroll = async () => {
    if (!data) return;
    if (!user) {
      toast.info("Sign in to track your progress");
      navigate("/admin/login?redirect=/courses/" + slug);
      return;
    }
    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: data.course.id,
    });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setEnrolled(true);
    toast.success("Enrolled! Let's begin.");
    navigate(`/courses/${slug}/learn`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-learn" />
        </div>
      </Layout>
    );
  }
  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Course not found.
        </div>
      </Layout>
    );
  }

  const { course, modules, lessons } = data;
  const totalLessons = lessons.length;
  const pct = totalLessons === 0 ? 0 : Math.round((progressCount / totalLessons) * 100);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.short_description ?? course.description ?? "",
    provider: {
      "@type": "Organization",
      name: "Noob to Root",
      sameAs: "https://noobtoroot.com",
    },
    ...(course.instructor_name && {
      instructor: { "@type": "Person", name: course.instructor_name },
    }),
    url: `https://noobtoroot.com/courses/${course.slug}`,
  };

  return (
    <Layout>
      <SEO
        title={course.title}
        description={
          course.short_description ||
          (course.description
            ? course.description.replace(/\s+/g, " ").trim().slice(0, 155)
            : `Master ${course.title} on Noob to Root — hands-on lessons, quizzes, terminal labs, and a verifiable certificate.`)
        }
        image={course.cover_image ?? undefined}
        type="article"
        author={course.instructor_name ?? undefined}
        canonical={`https://noobtoroot.com/courses/${course.slug}`}
        jsonLd={courseJsonLd}
      />
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/courses" className="hover:text-learn">Courses</Link>
                <span>/</span>
                <span>{course.level}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-heading font-bold">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.short_description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {totalLessons} lessons</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {course.duration_minutes} min</span>
                <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> {course.instructor_name}</span>
              </div>
            </motion.div>

            <div className="glass-card p-6 prose prose-invert max-w-none">
              <h2 className="text-2xl font-heading font-semibold !mt-0">About this course</h2>
              <p className="text-muted-foreground whitespace-pre-line">{course.description}</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-heading font-semibold">Course content</h2>
              {modules.map((m, mi) => {
                const mLessons = lessons.filter((l) => l.module_id === m.id);
                return (
                  <div key={m.id} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">
                        Module {mi + 1}: {m.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">{mLessons.length} lessons</span>
                    </div>
                    <ul className="space-y-2">
                      {mLessons.map((l, li) => (
                        <li key={l.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30 text-sm">
                          <span className="text-xs font-mono text-muted-foreground w-6">{li + 1}.</span>
                          <span className="flex-1">{l.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-background/60 text-muted-foreground uppercase">
                            {l.lesson_type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24 space-y-5">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-learn/30 to-primary/20 flex items-center justify-center overflow-hidden">
                {course.cover_image ? (
                  <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-16 h-16 text-learn" />
                )}
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-bold text-learn">
                  {course.content_free ? "Free" : formatPrice(course.price_cents)}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Certificate: {course.certificate_paid
                    ? `${formatPrice(course.certificate_price_cents)} (after completion)`
                    : "Included free"}
                </p>
              </div>

              {enrolled && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Your progress</span>
                    <span className="text-learn font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-learn to-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {enrolled ? (
                <Button asChild className="group relative w-full overflow-hidden bg-learn hover:bg-learn/90 text-learn-foreground font-semibold animate-cta-glow transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  <Link to={`/courses/${course.slug}/learn`}>
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <Play className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5 group-hover:scale-110" />
                    {pct > 0 ? "Continue learning" : "Start course"}
                  </Link>
                </Button>
              ) : (
                <Button onClick={handleEnroll} className="group relative w-full overflow-hidden bg-learn hover:bg-learn/90 text-learn-foreground font-semibold animate-cta-glow transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <span className="relative">{user ? "Enroll & start free" : "Sign in to enroll"}</span>
                </Button>
              )}

              <ul className="text-sm space-y-2 pt-2 border-t border-border/50">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-learn" /> Lifetime access
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-learn" /> Interactive terminal
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-learn" /> Quizzes with instant feedback
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Award className="w-4 h-4 text-learn" /> Verifiable certificate
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}
