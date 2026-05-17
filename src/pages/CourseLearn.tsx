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
import DOMPurify from "dompurify";

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
      navigate(`/login?redirect=${encodeURIComponent(`/courses/${slug}/learn`)}`);
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
  const [bursting, setBursting] = useState(false);

  const handleComplete = () => {
    if (done) return;
    setBursting(true);
    setTimeout(() => setBursting(false), 1000);
    onComplete();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-8"
    >
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-learn/10 border border-learn/25 text-[11px] font-semibold uppercase tracking-[0.14em] text-learn">
          {lesson.lesson_type === "quiz" && <ListChecks className="w-3.5 h-3.5" />}
          {lesson.lesson_type === "terminal" && <TerminalIcon className="w-3.5 h-3.5" />}
          {lesson.lesson_type === "video" && <Play className="w-3.5 h-3.5" />}
          {lesson.lesson_type === "text" && <BookOpen className="w-3.5 h-3.5" />}
          {lesson.lesson_type}
          {lesson.duration_minutes ? <span className="opacity-70">· {lesson.duration_minutes} min</span> : null}
        </div>
        <h1 className="text-3xl md:text-[2.5rem] leading-tight font-heading font-bold tracking-tight">
          {lesson.title}
        </h1>
      </header>

      {lesson.lesson_type === "video" && lesson.video_url && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-border shadow-[0_20px_60px_-20px_hsl(var(--learn)/0.4)]">
          <iframe src={lesson.video_url} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      )}

      {lesson.content && (
        <div className="learn-prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentToHtml(lesson.content)) }} />
      )}

      {lesson.lesson_type === "terminal" && lesson.terminal_commands?.length > 0 && (
        <TerminalSimulator commands={lesson.terminal_commands} />
      )}

      {lesson.lesson_type !== "terminal" && lesson.terminal_commands?.length > 0 && (
        <TerminalSimulator commands={lesson.terminal_commands} title="Try it yourself" />
      )}

      {lesson.lesson_type === "quiz" && questions.length > 0 && (
        <QuizPlayer questions={questions} onPass={onComplete} alreadyPassed={done} />
      )}

      <div className="pt-8 mt-4 border-t border-border/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          variant="outline"
          size="lg"
          disabled={!hasPrev}
          onClick={onPrev}
          className="rounded-xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {lesson.lesson_type !== "quiz" && (
          <div className="relative flex justify-center">
            <AnimatePresence>
              {bursting && (
                <>
                  {Array.from({ length: 14 }).map((_, i) => {
                    const angle = (i / 14) * Math.PI * 2;
                    const dist = 60 + Math.random() * 40;
                    const colors = ["hsl(var(--learn))", "hsl(var(--neon-cyan))", "hsl(var(--neon-magenta))", "hsl(var(--neon-blue))"];
                    return (
                      <span
                        key={i}
                        className="confetti-dot"
                        style={{
                          left: "50%", top: "50%",
                          background: colors[i % colors.length],
                          ["--tx" as string]: `${Math.cos(angle) * dist}px`,
                          ["--ty" as string]: `${Math.sin(angle) * dist}px`,
                        }}
                      />
                    );
                  })}
                </>
              )}
            </AnimatePresence>
            <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={done}
                className={cn(
                  "rounded-xl px-7 h-12 text-base font-semibold shadow-lg shadow-learn/20",
                  "bg-gradient-to-r from-learn to-emerald-400 text-learn-foreground hover:opacity-95",
                  !done && "btn-pulse",
                  done && "from-learn/40 to-emerald-400/40"
                )}
              >
                {done ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Completed</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" /> Mark as completed</>
                )}
              </Button>
            </motion.div>
          </div>
        )}

        <Button
          variant={hasNext ? "default" : "outline"}
          size="lg"
          disabled={!hasNext}
          onClick={onNext}
          className={cn(
            "rounded-xl",
            hasNext && "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          Next lesson <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.article>
  );
}

// Convert markdown-ish content to HTML with light syntax highlighting.
function contentToHtml(md: string): string {
  // Raw HTML is not passed through unsanitized — caller must sanitize the final output.
  if (md.trim().startsWith("<")) return md;

  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let inList = false;
  const flushCode = () => {
    const highlighted = highlightCode(codeBuf.join("\n"), codeLang);
    html += `<pre data-lang="${esc(codeLang || "code")}"><code>${highlighted}</code></pre>`;
    codeBuf = []; codeLang = "";
  };
  for (const line of lines) {
    const fence = line.match(/^```(\w+)?\s*$/);
    if (fence) {
      if (inCode) { flushCode(); inCode = false; }
      else { inCode = true; codeLang = fence[1] || ""; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (/^### /.test(line)) { html += `<h3>${formatInline(esc(line.slice(4)))}</h3>`; continue; }
    if (/^## /.test(line)) { html += `<h2>${formatInline(esc(line.slice(3))) }</h2>`; continue; }
    if (/^# /.test(line)) { html += `<h1>${formatInline(esc(line.slice(2)))}</h1>`; continue; }
    if (/^> /.test(line)) { html += `<blockquote>${formatInline(esc(line.slice(2)))}</blockquote>`; continue; }
    if (/^- /.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${formatInline(esc(line.slice(2)))}</li>`;
      continue;
    } else if (inList) { html += "</ul>"; inList = false; }
    if (line.trim() === "") { continue; }
    html += `<p>${formatInline(esc(line))}</p>`;
  }
  if (inList) html += "</ul>";
  if (inCode) flushCode();
  return html;
}

function formatInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\s)(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

// Lightweight syntax highlighter for shell / bash / common code.
function highlightCode(code: string, lang: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const isShell = /^(bash|sh|shell|zsh|console|terminal)$/i.test(lang) || /^\s*\$\s/m.test(code);
  const lines = code.split("\n").map((raw) => {
    let line = esc(raw);
    // Comments
    line = line.replace(/(^|\s)(#.*)$/g, '$1<span class="tk-cmt">$2</span>');
    // Shell prompts
    if (isShell) {
      line = line.replace(/^(\s*)(\$|#&gt;|root@[^\s$]*[$#])\s/, '$1<span class="tk-prompt">$2</span> ');
    }
    // Strings
    line = line.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|"[^"]*"|'[^']*')/g, '<span class="tk-str">$1</span>');
    // Numbers
    line = line.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tk-num">$1</span>');
    // Keywords
    const kws = isShell
      ? ["sudo","cd","ls","mkdir","rm","cp","mv","cat","echo","grep","chmod","chown","apt","apt-get","pacman","yum","ssh","curl","wget","nano","vim","exit","export","source","alias","find","ps","kill","tar","unzip","systemctl","service","docker","git"]
      : ["const","let","var","function","return","if","else","for","while","class","import","export","from","await","async","new","try","catch","throw","def","print","True","False","None","null","true","false"];
    const re = new RegExp(`\\b(${kws.join("|")})\\b`, "g");
    line = line.replace(re, '<span class="tk-kw">$1</span>');
    return line;
  });
  return lines.join("\n");
}

function TerminalSimulator({
  commands, title,
}: {
  commands: { command: string; output: string; hint?: string }[];
  title?: string;
}) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<{ input: string; output: string; correct: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const current = commands[step];
  const allDone = !current;
  const totalSteps = commands.length;

  const submit = () => {
    if (!current) return;
    const ok = input.trim() === current.command.trim();
    setHistory((h) => [
      ...h,
      { input, output: ok ? current.output : `bash: command not recognized. Try: ${current.command}`, correct: ok },
    ]);
    if (ok) { setStep((s) => s + 1); setShowHint(false); }
    setInput("");
  };

  const reset = () => { setStep(0); setHistory([]); setInput(""); setShowHint(false); };

  const copyCmd = (cmd: string) => {
    navigator.clipboard?.writeText(cmd);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="my-2">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-learn/15 border border-learn/30 flex items-center justify-center">
            <TerminalIcon className="w-4 h-4 text-learn" />
          </div>
          <div>
            <div className="font-heading font-semibold text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">Practice in a safe sandbox — no real shell.</div>
          </div>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden border border-learn/25 shadow-[0_20px_60px_-30px_hsl(var(--learn)/0.6)] bg-[hsl(220_25%_4%)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-learn/15 bg-black/40">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-learn" />
          <span className="ml-3 text-xs text-muted-foreground font-mono">student@noob2root:~$ practice</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-learn/80 font-mono">
              {Math.min(step, totalSteps)}/{totalSteps}
            </span>
            <button onClick={reset} className="text-muted-foreground hover:text-learn transition-colors p-1" title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hint card showing the next expected command */}
        {current && (
          <div className="px-4 py-2 bg-learn/5 border-b border-learn/10 flex items-center gap-2 text-xs">
            <span className="text-learn/80 font-mono">Next:</span>
            <code className="font-mono text-learn">{showHint ? current.command : "•••"}</code>
            <button
              onClick={() => setShowHint((v) => !v)}
              className="ml-1 text-[11px] text-muted-foreground hover:text-learn underline-offset-2 hover:underline"
            >
              {showHint ? "hide" : "reveal"}
            </button>
            {showHint && (
              <button
                onClick={() => copyCmd(current.command)}
                className="text-muted-foreground hover:text-learn"
                title="Copy"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {current.hint && (
              <span className="ml-auto text-muted-foreground italic truncate">💡 {current.hint}</span>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5 font-mono text-[13.5px] leading-relaxed space-y-2 min-h-[200px] max-h-[420px] overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="space-y-0.5">
              <div>
                <span className="text-learn font-semibold">$</span>{" "}
                <span className="text-foreground">{h.input}</span>
              </div>
              <div className={cn(
                "whitespace-pre-wrap pl-3 border-l-2",
                h.correct ? "text-muted-foreground border-learn/40" : "text-red-400 border-red-500/40"
              )}>
                {h.output}
              </div>
            </div>
          ))}
          {current ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-learn font-semibold">$</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="flex-1 bg-transparent outline-none text-foreground caret-learn placeholder:text-muted-foreground/50"
                placeholder="type the command and press Enter…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-learn pt-2"
            >
              <Check className="w-4 h-4" /> All commands completed — nice work!
            </motion.div>
          )}
        </div>
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
    await generateCertificatePdf({
      recipient: cert.recipient,
      course: course.title,
      date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      number: cert.number,
      category: course.level ?? undefined,
      lengthHours: course.duration_minutes ? Math.max(1, Math.round(course.duration_minutes / 60)) : undefined,
      heroImage: course.cover_image ?? undefined,
      location: "Online",
      signatures: course.instructor_name
        ? [{ name: course.instructor_name, role: "Course Instructor" }]
        : undefined,
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

  return (
    <div className={cn("space-y-3", large && "text-left")}>
      <Input placeholder="Your full name (as it appears on certificate)" value={name} onChange={(e) => setName(e.target.value)} />
      {needsPayment ? (
        <div className="rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Paid certificate ({formatPrice(course.certificate_price_cents)})</p>
          <p>
            Paid certificates require a verified payment processed server-side. Connect a
            payment provider and an admin-only issuing endpoint to enable purchases — client
            checkout is disabled to prevent payment bypass.
          </p>
        </div>
      ) : (
        <Button
          disabled={paying}
          onClick={async () => {
            setPaying(true);
            await issue(false);
            setPaying(false);
          }}
          className="w-full bg-learn hover:bg-learn/90 text-learn-foreground font-semibold"
        >
          {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Download className="w-4 h-4 mr-2" /> Generate free certificate</>}
        </Button>
      )}
    </div>
  );
}
