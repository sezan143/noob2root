import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, ChevronLeft, ChevronRight, Loader2, Terminal as TerminalIcon,
  Award, Sparkles, Download, Play, X, BookOpen, ListChecks, Copy, RotateCcw, Check, Zap,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Course, Module, Lesson, QuizQuestion, fetchCourseFull, formatPrice } from "@/lib/courses";
import { generateCertificatePdf } from "@/lib/certificate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Bundle = { course: Course; modules: Module[]; lessons: Lesson[] };

const ENCOURAGEMENTS = [
  "Nice work! 🚀 You're leveling up.",
  "Crushing it! Keep going.",
  "Boom! Another one in the bag.",
  "You're on fire 🔥 Onward!",
  "Sweet — that's how you root.",
  "Look at you go! 🌱",
];

export default function CourseLearn() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Bundle | null>(null);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCert, setShowCert] = useState(false);
  const [certificate, setCertificate] = useState<{ number: string; recipient: string; paid: boolean } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/admin/login?redirect=/courses/${slug}/learn`);
      return;
    }
    if (!slug) return;
    (async () => {
      const result = await fetchCourseFull(slug);
      if (!result) { setLoading(false); return; }
      setData(result);

      // Auto-enroll if not yet
      await supabase.from("enrollments").upsert(
        { user_id: user.id, course_id: result.course.id },
        { onConflict: "user_id,course_id", ignoreDuplicates: true }
      );

      const { data: prog } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", result.course.id);
      const set = new Set<string>((prog ?? []).map((p: { lesson_id: string }) => p.lesson_id));
      setProgress(set);

      // pick first uncompleted lesson, or first lesson
      const sorted = [...result.lessons].sort((a, b) => a.sort_order - b.sort_order);
      const firstUncompleted = sorted.find((l) => !set.has(l.id)) ?? sorted[0];
      if (firstUncompleted) setActiveId(firstUncompleted.id);

      // Load existing certificate if any
      const { data: cert } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", result.course.id)
        .maybeSingle();
      if (cert) {
        setCertificate({
          number: (cert as { certificate_number: string }).certificate_number,
          recipient: (cert as { recipient_name: string | null }).recipient_name ?? user.email ?? "Student",
          paid: (cert as { paid: boolean }).paid,
        });
      }
      setLoading(false);
    })();
  }, [slug, user, authLoading, navigate]);

  const orderedLessons = useMemo(() => {
    if (!data) return [];
    const moduleOrder = new Map(data.modules.map((m) => [m.id, m.sort_order]));
    return [...data.lessons].sort((a, b) => {
      const mo = (moduleOrder.get(a.module_id) ?? 0) - (moduleOrder.get(b.module_id) ?? 0);
      return mo !== 0 ? mo : a.sort_order - b.sort_order;
    });
  }, [data]);

  const activeLesson = orderedLessons.find((l) => l.id === activeId) ?? null;
  const activeIndex = orderedLessons.findIndex((l) => l.id === activeId);
  const completedCount = progress.size;
  const total = orderedLessons.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  // Load quiz questions when active is quiz
  useEffect(() => {
    if (!activeLesson || activeLesson.lesson_type !== "quiz") {
      setQuestions([]);
      return;
    }
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("lesson_id", activeLesson.id)
      .order("sort_order")
      .then(({ data }) => setQuestions((data ?? []) as unknown as QuizQuestion[]));
  }, [activeLesson]);

  const isUnlocked = (lessonId: string) => {
    const idx = orderedLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return true;
    const prev = orderedLessons[idx - 1];
    return progress.has(prev.id);
  };

  const markComplete = async (lessonId: string) => {
    if (!user || !data) return;
    if (progress.has(lessonId)) return;
    const { error } = await supabase.from("lesson_progress").insert({
      user_id: user.id,
      lesson_id: lessonId,
      course_id: data.course.id,
    });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    const next = new Set(progress);
    next.add(lessonId);
    setProgress(next);

    // If course now complete
    if (next.size === total) {
      await supabase
        .from("enrollments")
        .update({ completed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("course_id", data.course.id);
      setShowCert(true);
      toast.success("🎉 Course complete!");
    } else {
      toast.success(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      // auto-advance
      const idx = orderedLessons.findIndex((l) => l.id === lessonId);
      const nextLesson = orderedLessons[idx + 1];
      if (nextLesson) setTimeout(() => setActiveId(nextLesson.id), 650);
    }
  };

  if (loading || authLoading) {
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
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">Course not found.</div>
      </Layout>
    );
  }

  const allDone = total > 0 && completedCount === total;

  return (
    <Layout>
      <SEO title={`Learn — ${data.course.title}`} description={data.course.short_description ?? ""} />
      <div className="pt-20 min-h-screen flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-80 border-r border-border bg-card/40 backdrop-blur-xl sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="p-5 border-b border-border">
            <Link to={`/courses/${data.course.slug}`} className="text-xs text-muted-foreground hover:text-learn flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Course overview
            </Link>
            <h2 className="font-heading font-semibold mt-2 text-sm">{data.course.title}</h2>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-learn">{completedCount}/{total}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-learn to-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <div className="p-3 space-y-4 flex-1">
            {data.modules.sort((a, b) => a.sort_order - b.sort_order).map((m, mi) => {
              const mLessons = orderedLessons.filter((l) => l.module_id === m.id);
              return (
                <div key={m.id}>
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {mi + 1}. {m.title}
                  </div>
                  <ul className="space-y-0.5">
                    {mLessons.map((l) => {
                      const done = progress.has(l.id);
                      const unlocked = isUnlocked(l.id);
                      const active = activeId === l.id;
                      return (
                        <li key={l.id}>
                          <button
                            disabled={!unlocked}
                            onClick={() => setActiveId(l.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5 transition-colors",
                              active && "bg-learn/10 text-learn",
                              !active && unlocked && "hover:bg-muted/60 text-foreground",
                              !unlocked && "text-muted-foreground/50 cursor-not-allowed"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-learn shrink-0" />
                            ) : !unlocked ? (
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                            ) : l.lesson_type === "quiz" ? (
                              <ListChecks className="w-4 h-4 shrink-0" />
                            ) : l.lesson_type === "terminal" ? (
                              <TerminalIcon className="w-4 h-4 shrink-0" />
                            ) : l.lesson_type === "video" ? (
                              <Play className="w-4 h-4 shrink-0" />
                            ) : (
                              <BookOpen className="w-4 h-4 shrink-0" />
                            )}
                            <span className="truncate">{l.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
            {allDone && (
              <CertificateBanner
                course={data.course}
                user={user!}
                certificate={certificate}
                setCertificate={setCertificate}
              />
            )}

            {activeLesson ? (
              <LessonView
                key={activeLesson.id}
                lesson={activeLesson}
                questions={questions}
                done={progress.has(activeLesson.id)}
                onComplete={() => markComplete(activeLesson.id)}
                onPrev={() => {
                  const prev = orderedLessons[activeIndex - 1];
                  if (prev) setActiveId(prev.id);
                }}
                onNext={() => {
                  const next = orderedLessons[activeIndex + 1];
                  if (next) setActiveId(next.id);
                }}
                hasPrev={activeIndex > 0}
                hasNext={activeIndex < orderedLessons.length - 1}
              />
            ) : (
              <div className="text-center py-20 text-muted-foreground">No lessons yet.</div>
            )}
          </div>
        </main>
      </div>

      <CertificateDialog
        open={showCert}
        onClose={() => setShowCert(false)}
        course={data.course}
        user={user!}
        certificate={certificate}
        setCertificate={setCertificate}
      />
    </Layout>
  );
}

function LessonView({
  lesson, questions, done, onComplete, onPrev, onNext, hasPrev, hasNext,
}: {
  lesson: Lesson;
  questions: QuizQuestion[];
  done: boolean;
  onComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <span className="text-xs uppercase tracking-wider text-learn font-semibold">{lesson.lesson_type}</span>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mt-1">{lesson.title}</h1>
      </div>

      {lesson.lesson_type === "video" && lesson.video_url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe src={lesson.video_url} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      )}

      {lesson.content && (
        <div
          className="prose prose-invert prose-headings:font-heading prose-a:text-learn prose-strong:text-foreground max-w-none"
          dangerouslySetInnerHTML={{ __html: contentToHtml(lesson.content) }}
        />
      )}

      {lesson.lesson_type === "terminal" && lesson.terminal_commands?.length > 0 && (
        <TerminalSimulator commands={lesson.terminal_commands} />
      )}

      {lesson.lesson_type === "quiz" && questions.length > 0 && (
        <QuizPlayer questions={questions} onPass={onComplete} alreadyPassed={done} />
      )}

      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button variant="outline" disabled={!hasPrev} onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        {lesson.lesson_type !== "quiz" && (
          <Button onClick={onComplete} disabled={done} className="bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
            {done ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Completed</> : "Mark complete"}
          </Button>
        )}
        <Button variant="outline" disabled={!hasNext} onClick={onNext}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.article>
  );
}

// Convert markdown-ish content to safe HTML (very basic).
function contentToHtml(md: string): string {
  // If looks like HTML already, just return
  if (md.trim().startsWith("<")) return md;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let inList = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { html += "</code></pre>"; inCode = false; }
      else { html += '<pre class="bg-muted/60 rounded-md p-4 text-sm overflow-x-auto"><code>'; inCode = true; }
      continue;
    }
    if (inCode) { html += esc(line) + "\n"; continue; }
    if (/^### /.test(line)) { html += `<h3>${esc(line.slice(4))}</h3>`; continue; }
    if (/^## /.test(line)) { html += `<h2>${esc(line.slice(3))}</h2>`; continue; }
    if (/^# /.test(line)) { html += `<h1>${esc(line.slice(2))}</h1>`; continue; }
    if (/^- /.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${formatInline(esc(line.slice(2)))}</li>`;
      continue;
    } else if (inList) { html += "</ul>"; inList = false; }
    if (line.trim() === "") { html += ""; continue; }
    html += `<p>${formatInline(esc(line))}</p>`;
  }
  if (inList) html += "</ul>";
  if (inCode) html += "</code></pre>";
  return html;
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-learn text-[0.9em]">$1</code>');
}

function TerminalSimulator({ commands }: { commands: { command: string; output: string; hint?: string }[] }) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<{ input: string; output: string; correct: boolean }[]>([]);
  const [input, setInput] = useState("");
  const current = commands[step];

  const submit = () => {
    if (!current) return;
    const ok = input.trim() === current.command.trim();
    setHistory((h) => [
      ...h,
      { input, output: ok ? current.output : `bash: command not recognized. Try: ${current.command}`, correct: ok },
    ]);
    if (ok) {
      setStep((s) => s + 1);
    }
    setInput("");
  };

  return (
    <div className="rounded-xl bg-black/80 border border-learn/30 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-learn/20 bg-black/60">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-learn" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">student@noob2root:~$ practice</span>
      </div>
      <div className="p-4 font-mono text-sm space-y-2 min-h-[180px]">
        {history.map((h, i) => (
          <div key={i}>
            <div className="text-learn">$ <span className="text-foreground">{h.input}</span></div>
            <div className={cn("whitespace-pre-wrap", h.correct ? "text-muted-foreground" : "text-red-400")}>{h.output}</div>
          </div>
        ))}
        {current ? (
          <>
            {current.hint && history.length === step && (
              <div className="text-xs text-muted-foreground italic">💡 {current.hint}</div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-learn">$</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="flex-1 bg-transparent outline-none text-foreground"
                placeholder="type the command…"
                autoFocus
              />
            </div>
          </>
        ) : (
          <div className="text-learn flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> All commands completed!
          </div>
        )}
      </div>
    </div>
  );
}

function QuizPlayer({ questions, onPass, alreadyPassed }: { questions: QuizQuestion[]; onPass: () => void; alreadyPassed: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const correct = questions.filter((q) => answers[q.id] === q.correct_index).length;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const passed = correct === questions.length;

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const sel = answers[q.id];
        const reveal = revealed[q.id];
        return (
          <div key={q.id} className="glass-card p-5 space-y-3">
            <div className="font-medium">
              <span className="text-learn mr-2">Q{qi + 1}.</span>
              {q.question}
            </div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSel = sel === oi;
                const isRight = oi === q.correct_index;
                const showState = reveal && isSel;
                return (
                  <button
                    key={oi}
                    onClick={() => {
                      if (reveal) return;
                      setAnswers((a) => ({ ...a, [q.id]: oi }));
                      setRevealed((r) => ({ ...r, [q.id]: true }));
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-md border text-sm transition-all",
                      !reveal && "border-border hover:border-learn/60 hover:bg-learn/5",
                      reveal && isRight && "border-learn bg-learn/10 text-learn",
                      showState && !isRight && "border-red-500/60 bg-red-500/10 text-red-300",
                      reveal && !isSel && !isRight && "border-border opacity-60",
                    )}
                  >
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {reveal && q.explanation && (
              <div className="text-xs text-muted-foreground border-t border-border/60 pt-3">💡 {q.explanation}</div>
            )}
          </div>
        );
      })}

      {submitted && !passed && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-sm">
          You got {correct}/{questions.length}. Try again — you need 100%.
          <Button variant="outline" size="sm" className="ml-3" onClick={() => { setAnswers({}); setRevealed({}); setSubmitted(false); }}>
            Reset
          </Button>
        </div>
      )}

      {!alreadyPassed && (
        <Button
          disabled={!allAnswered}
          onClick={() => {
            setSubmitted(true);
            if (passed) onPass();
          }}
          className="w-full bg-learn hover:bg-learn/90 text-learn-foreground font-semibold"
        >
          {passed && submitted ? "Passed!" : "Submit answers"}
        </Button>
      )}
    </div>
  );
}

function CertificateBanner({
  course, user, certificate, setCertificate,
}: {
  course: Course;
  user: { id: string; email?: string };
  certificate: { number: string; recipient: string; paid: boolean } | null;
  setCertificate: (c: { number: string; recipient: string; paid: boolean }) => void;
}) {
  return (
    <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-learn/15 via-card to-primary/10 border border-learn/30 flex items-center gap-4">
      <Sparkles className="w-8 h-8 text-learn shrink-0" />
      <div className="flex-1">
        <div className="font-heading font-semibold">Course complete!</div>
        <div className="text-sm text-muted-foreground">Claim your certificate of completion.</div>
      </div>
      <CertificateClaimButton course={course} user={user} certificate={certificate} setCertificate={setCertificate} />
    </div>
  );
}

function CertificateDialog(props: {
  open: boolean; onClose: () => void;
  course: Course; user: { id: string; email?: string };
  certificate: { number: string; recipient: string; paid: boolean } | null;
  setCertificate: (c: { number: string; recipient: string; paid: boolean }) => void;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-lg w-full p-8 text-center space-y-5 relative"
      >
        <button onClick={props.onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 mx-auto rounded-full bg-learn/15 flex items-center justify-center">
          <Award className="w-8 h-8 text-learn" />
        </div>
        <h2 className="text-2xl font-heading font-bold">Congratulations! 🎉</h2>
        <p className="text-muted-foreground">
          You've completed <strong className="text-foreground">{props.course.title}</strong>. Time to claim your certificate.
        </p>
        <CertificateClaimButton {...props} large />
      </motion.div>
    </div>
  );
}

function CertificateClaimButton({
  course, user, certificate, setCertificate, large,
}: {
  course: Course;
  user: { id: string; email?: string };
  certificate: { number: string; recipient: string; paid: boolean } | null;
  setCertificate: (c: { number: string; recipient: string; paid: boolean }) => void;
  large?: boolean;
}) {
  const [name, setName] = useState(user.email?.split("@")[0] ?? "");
  const [paying, setPaying] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const needsPayment = course.certificate_paid && course.certificate_price_cents > 0;
  const alreadyIssued = !!certificate && (!needsPayment || certificate.paid);

  const issue = async (paid: boolean) => {
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    let cert = certificate;
    if (!cert) {
      const { data, error } = await supabase
        .from("certificates")
        .insert({
          user_id: user.id,
          course_id: course.id,
          recipient_name: name.trim(),
          paid,
          amount_cents: paid ? course.certificate_price_cents : 0,
        })
        .select("certificate_number, recipient_name, paid")
        .single();
      if (error) { toast.error(error.message); return; }
      cert = {
        number: (data as { certificate_number: string }).certificate_number,
        recipient: (data as { recipient_name: string }).recipient_name,
        paid: (data as { paid: boolean }).paid,
      };
      setCertificate(cert);
    } else if (paid && !cert.paid) {
      const { data, error } = await supabase
        .from("certificates")
        .update({ paid: true, amount_cents: course.certificate_price_cents, recipient_name: name.trim() })
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .select("certificate_number, recipient_name, paid")
        .single();
      if (error) { toast.error(error.message); return; }
      cert = {
        number: (data as { certificate_number: string }).certificate_number,
        recipient: (data as { recipient_name: string }).recipient_name,
        paid: (data as { paid: boolean }).paid,
      };
      setCertificate(cert);
    }
    generateCertificatePdf({
      recipient: cert.recipient,
      course: course.title,
      date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      number: cert.number,
      instructor: course.instructor_name ?? "Noob to Root Team",
    });
    toast.success("Certificate downloaded!");
  };

  if (alreadyIssued) {
    return (
      <Button onClick={() => issue(certificate?.paid ?? false)} className="bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
        <Download className="w-4 h-4 mr-2" /> Download certificate
      </Button>
    );
  }

  if (!showPay) {
    return (
      <div className={cn("space-y-3", large && "text-left")}>
        <Input placeholder="Your full name (as it appears on certificate)" value={name} onChange={(e) => setName(e.target.value)} />
        {needsPayment ? (
          <Button onClick={() => setShowPay(true)} className="w-full bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
            <Award className="w-4 h-4 mr-2" /> Get certificate — {formatPrice(course.certificate_price_cents)}
          </Button>
        ) : (
          <Button onClick={() => issue(false)} className="w-full bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
            <Download className="w-4 h-4 mr-2" /> Generate free certificate
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left bg-card/50 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Certificate of Completion</div>
          <div className="font-semibold">{course.title}</div>
        </div>
        <div className="text-2xl font-bold text-learn">{formatPrice(course.certificate_price_cents)}</div>
      </div>
      <div className="space-y-2">
        <Input placeholder="Card number" defaultValue="4242 4242 4242 4242" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="MM/YY" defaultValue="12/29" />
          <Input placeholder="CVC" defaultValue="123" />
        </div>
        <p className="text-[11px] text-muted-foreground">Demo checkout — no real charge.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowPay(false)} className="flex-1">Cancel</Button>
        <Button
          disabled={paying}
          onClick={async () => {
            setPaying(true);
            await new Promise((r) => setTimeout(r, 1200));
            await issue(true);
            setPaying(false);
          }}
          className="flex-1 bg-learn hover:bg-learn/90 text-learn-foreground font-semibold"
        >
          {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : `Pay ${formatPrice(course.certificate_price_cents)}`}
        </Button>
      </div>
    </div>
  );
}
