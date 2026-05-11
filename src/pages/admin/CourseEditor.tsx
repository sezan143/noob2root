import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronLeft, Save, Loader2, GripVertical, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Course, Module, Lesson, QuizQuestion, slugify } from "@/lib/courses";
import { toast } from "sonner";

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: c } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
    const { data: m } = await supabase.from("modules").select("*").eq("course_id", id).order("sort_order");
    const { data: l } = await supabase.from("lessons").select("*").eq("course_id", id).order("sort_order");
    setCourse(c as unknown as Course);
    setModules((m ?? []) as unknown as Module[]);
    setLessons((l ?? []) as unknown as Lesson[]);
    setOpenModules(new Set((m ?? []).map((x: { id: string }) => x.id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const updateCourse = (patch: Partial<Course>) => setCourse((c) => (c ? { ...c, ...patch } : c));

  const saveCourse = async () => {
    if (!course) return;
    setSaving(true);
    const { error } = await supabase
      .from("courses")
      .update({
        title: course.title,
        slug: course.slug,
        short_description: course.short_description,
        description: course.description,
        cover_image: course.cover_image,
        level: course.level,
        duration_minutes: course.duration_minutes,
        instructor_name: course.instructor_name,
        price_cents: course.price_cents,
        content_free: course.content_free,
        certificate_paid: course.certificate_paid,
        certificate_price_cents: Math.min(999, Math.max(0, course.certificate_price_cents)),
        is_published: course.is_published,
        sort_order: course.sort_order,
      })
      .eq("id", course.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Course saved");
  };

  const addModule = async () => {
    if (!course) return;
    const { data, error } = await supabase
      .from("modules")
      .insert({ course_id: course.id, title: "New Module", sort_order: modules.length })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    setModules((m) => [...m, data as unknown as Module]);
    setOpenModules((s) => new Set(s).add((data as { id: string }).id));
  };

  const updateModule = async (mod: Module, patch: Partial<Module>) => {
    setModules((arr) => arr.map((x) => (x.id === mod.id ? { ...x, ...patch } : x)));
    await supabase.from("modules").update(patch).eq("id", mod.id);
  };

  const deleteModule = async (modId: string) => {
    if (!confirm("Delete this module and its lessons?")) return;
    await supabase.from("modules").delete().eq("id", modId);
    setModules((m) => m.filter((x) => x.id !== modId));
    setLessons((l) => l.filter((x) => x.module_id !== modId));
  };

  const addLesson = async (modId: string) => {
    if (!course) return;
    const moduleLessons = lessons.filter((l) => l.module_id === modId);
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        module_id: modId,
        course_id: course.id,
        title: "New Lesson",
        lesson_type: "text",
        sort_order: moduleLessons.length,
      })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    setLessons((l) => [...l, data as unknown as Lesson]);
  };

  const updateLesson = async (lesson: Lesson, patch: Partial<Lesson>) => {
    setLessons((arr) => arr.map((x) => (x.id === lesson.id ? { ...x, ...patch } : x)));
    await supabase.from("lessons").update(patch as Record<string, unknown>).eq("id", lesson.id);
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    await supabase.from("lessons").delete().eq("id", lessonId);
    setLessons((l) => l.filter((x) => x.id !== lessonId));
  };

  const toggleModule = (mid: string) => {
    setOpenModules((s) => {
      const n = new Set(s);
      n.has(mid) ? n.delete(mid) : n.add(mid);
      return n;
    });
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-learn" />;
  if (!course) return <div>Course not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link to="/admin/courses" className="text-sm text-muted-foreground hover:text-learn flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to courses
        </Link>
        <Button onClick={saveCourse} disabled={saving} className="bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save course
        </Button>
      </div>

      {/* Course meta */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold">Course details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={course.title} onChange={(e) => updateCourse({ title: e.target.value })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={course.slug} onChange={(e) => updateCourse({ slug: slugify(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Short description</Label>
            <Input value={course.short_description ?? ""} onChange={(e) => updateCourse({ short_description: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Full description</Label>
            <Textarea rows={5} value={course.description ?? ""} onChange={(e) => updateCourse({ description: e.target.value })} />
          </div>
          <div>
            <Label>Cover image URL</Label>
            <Input value={course.cover_image ?? ""} onChange={(e) => updateCourse({ cover_image: e.target.value })} />
          </div>
          <div>
            <Label>Instructor name</Label>
            <Input value={course.instructor_name ?? ""} onChange={(e) => updateCourse({ instructor_name: e.target.value })} />
          </div>
          <div>
            <Label>Level</Label>
            <Select value={course.level ?? "beginner"} onValueChange={(v) => updateCourse({ level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={course.duration_minutes ?? 0}
              onChange={(e) => updateCourse({ duration_minutes: parseInt(e.target.value || "0") })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="cursor-pointer">Content is free</Label>
              <p className="text-xs text-muted-foreground">Anyone can browse and learn</p>
            </div>
            <Switch checked={course.content_free} onCheckedChange={(v) => updateCourse({ content_free: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="cursor-pointer">Certificate is paid</Label>
              <p className="text-xs text-muted-foreground">Charge for the certificate after completion</p>
            </div>
            <Switch checked={course.certificate_paid} onCheckedChange={(v) => updateCourse({ certificate_paid: v })} />
          </div>
          {!course.content_free && (
            <div>
              <Label>Course price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={(course.price_cents / 100).toFixed(2)}
                onChange={(e) => updateCourse({ price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
              />
            </div>
          )}
          {course.certificate_paid && (
            <div>
              <Label>Certificate price ($0 – $9.99)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="9.99"
                value={(course.certificate_price_cents / 100).toFixed(2)}
                onChange={(e) => updateCourse({
                  certificate_price_cents: Math.min(999, Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100))),
                })}
              />
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 md:col-span-2">
            <div>
              <Label className="cursor-pointer">Published</Label>
              <p className="text-xs text-muted-foreground">Visible in the public catalog</p>
            </div>
            <Switch checked={course.is_published} onCheckedChange={(v) => updateCourse({ is_published: v })} />
          </div>
        </div>
      </div>

      {/* Modules & lessons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-semibold">Modules & lessons</h2>
          <Button size="sm" onClick={addModule} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Add module
          </Button>
        </div>

        {modules.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground text-sm">
            No modules yet. Add your first module to begin.
          </div>
        )}

        {modules.sort((a, b) => a.sort_order - b.sort_order).map((m, mi) => {
          const open = openModules.has(m.id);
          const mLessons = lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={m.id} className="glass-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 bg-muted/20">
                <button onClick={() => toggleModule(m.id)} className="text-muted-foreground hover:text-foreground">
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </button>
                <span className="text-xs text-muted-foreground font-mono">M{mi + 1}</span>
                <Input
                  className="flex-1 bg-transparent border-0 focus-visible:ring-1"
                  value={m.title}
                  onChange={(e) => updateModule(m, { title: e.target.value })}
                />
                <Button size="sm" variant="ghost" onClick={() => deleteModule(m.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {open && (
                <div className="p-4 space-y-3">
                  <Textarea
                    placeholder="Module description (optional)"
                    rows={2}
                    value={m.description ?? ""}
                    onChange={(e) => updateModule(m, { description: e.target.value })}
                  />
                  {mLessons.map((lesson, li) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={li}
                      onUpdate={(patch) => updateLesson(lesson, patch)}
                      onDelete={() => deleteLesson(lesson.id)}
                    />
                  ))}
                  <Button size="sm" variant="outline" onClick={() => addLesson(m.id)} className="w-full">
                    <Plus className="w-4 h-4 mr-1" /> Add lesson
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LessonRow({
  lesson, index, onUpdate, onDelete,
}: {
  lesson: Lesson;
  index: number;
  onUpdate: (patch: Partial<Lesson>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadedQuiz, setLoadedQuiz] = useState(false);

  useEffect(() => {
    if (lesson.lesson_type !== "quiz" || !open || loadedQuiz) return;
    supabase.from("quiz_questions").select("*").eq("lesson_id", lesson.id).order("sort_order").then(({ data }) => {
      setQuestions((data ?? []) as unknown as QuizQuestion[]);
      setLoadedQuiz(true);
    });
  }, [lesson.id, lesson.lesson_type, open, loadedQuiz]);

  const addQuestion = async () => {
    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        lesson_id: lesson.id,
        question: "New question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_index: 0,
        sort_order: questions.length,
      })
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    setQuestions((q) => [...q, data as unknown as QuizQuestion]);
  };

  const updateQuestion = async (q: QuizQuestion, patch: Partial<QuizQuestion>) => {
    setQuestions((arr) => arr.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
    await supabase.from("quiz_questions").update(patch as Record<string, unknown>).eq("id", q.id);
  };

  const deleteQuestion = async (qid: string) => {
    await supabase.from("quiz_questions").delete().eq("id", qid);
    setQuestions((q) => q.filter((x) => x.id !== qid));
  };

  return (
    <div className="rounded-lg border border-border bg-background/40">
      <div className="flex items-center gap-2 p-2.5">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>
        <span className="text-xs text-muted-foreground font-mono w-6">L{index + 1}</span>
        <Input
          className="flex-1 bg-transparent border-0 focus-visible:ring-1 h-8 text-sm"
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <Select value={lesson.lesson_type} onValueChange={(v) => onUpdate({ lesson_type: v as Lesson["lesson_type"] })}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="terminal">Terminal</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive h-8 w-8 p-0">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {open && (
        <div className="p-3 pt-0 space-y-3">
          {lesson.lesson_type === "video" && (
            <Input
              placeholder="Video embed URL (YouTube embed link)"
              value={lesson.video_url ?? ""}
              onChange={(e) => onUpdate({ video_url: e.target.value })}
            />
          )}
          {(lesson.lesson_type === "text" || lesson.lesson_type === "video" || lesson.lesson_type === "terminal") && (
            <Textarea
              placeholder="Lesson content. Markdown supported: # headings, **bold**, `code`, ``` blocks, - lists"
              rows={6}
              value={lesson.content ?? ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="font-mono text-xs"
            />
          )}
          {lesson.lesson_type === "terminal" && (
            <TerminalCommandsEditor
              commands={lesson.terminal_commands ?? []}
              onChange={(cmds) => onUpdate({ terminal_commands: cmds })}
            />
          )}
          {lesson.lesson_type === "quiz" && (
            <div className="space-y-3">
              {questions.map((q, qi) => (
                <div key={q.id} className="rounded-md bg-muted/30 p-3 space-y-2">
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground mt-2">Q{qi + 1}</span>
                    <Textarea
                      rows={1}
                      value={q.question}
                      onChange={(e) => updateQuestion(q, { question: e.target.value })}
                      className="text-sm"
                    />
                    <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)} className="text-destructive h-8 w-8 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 pl-7">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          checked={q.correct_index === oi}
                          onChange={() => updateQuestion(q, { correct_index: oi })}
                          className="accent-learn"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...q.options];
                            next[oi] = e.target.value;
                            updateQuestion(q, { options: next });
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                    <Input
                      placeholder="Explanation (shown after answer)"
                      value={q.explanation ?? ""}
                      onChange={(e) => updateQuestion(q, { explanation: e.target.value })}
                      className="h-8 text-xs mt-2"
                    />
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addQuestion}>
                <Plus className="w-3 h-3 mr-1" /> Add question
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TerminalCommandsEditor({
  commands, onChange,
}: { commands: { command: string; output: string; hint?: string }[]; onChange: (c: { command: string; output: string; hint?: string }[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Practice commands (student must type each in order)</Label>
      {commands.map((c, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start">
          <Input
            className="col-span-3 font-mono text-xs h-8"
            placeholder="ls -la"
            value={c.command}
            onChange={(e) => {
              const next = [...commands]; next[i] = { ...c, command: e.target.value }; onChange(next);
            }}
          />
          <Input
            className="col-span-5 font-mono text-xs h-8"
            placeholder="Expected output"
            value={c.output}
            onChange={(e) => {
              const next = [...commands]; next[i] = { ...c, output: e.target.value }; onChange(next);
            }}
          />
          <Input
            className="col-span-3 text-xs h-8"
            placeholder="Hint (optional)"
            value={c.hint ?? ""}
            onChange={(e) => {
              const next = [...commands]; next[i] = { ...c, hint: e.target.value }; onChange(next);
            }}
          />
          <Button
            size="sm" variant="ghost"
            onClick={() => onChange(commands.filter((_, j) => j !== i))}
            className="col-span-1 text-destructive h-8 w-8 p-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...commands, { command: "", output: "", hint: "" }])}>
        <Plus className="w-3 h-3 mr-1" /> Add command
      </Button>
    </div>
  );
}
