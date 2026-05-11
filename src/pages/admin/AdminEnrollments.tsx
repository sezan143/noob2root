import { useEffect, useState } from "react";
import { Loader2, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  course_title: string;
  total_lessons: number;
  completed_lessons: number;
  has_certificate: boolean;
};

export default function AdminEnrollments() {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: enrollments }, { data: courses }, { data: lessons }, { data: progress }, { data: certs }] = await Promise.all([
      supabase.from("enrollments").select("*").order("enrolled_at", { ascending: false }),
      supabase.from("courses").select("id, title"),
      supabase.from("lessons").select("id, course_id"),
      supabase.from("lesson_progress").select("user_id, course_id, lesson_id"),
      supabase.from("certificates").select("user_id, course_id"),
    ]);
    const courseMap = new Map((courses ?? []).map((c: { id: string; title: string }) => [c.id, c.title]));
    const lessonCount = new Map<string, number>();
    (lessons ?? []).forEach((l: { course_id: string }) => lessonCount.set(l.course_id, (lessonCount.get(l.course_id) ?? 0) + 1));
    const progressMap = new Map<string, number>();
    (progress ?? []).forEach((p: { user_id: string; course_id: string }) => {
      const key = `${p.user_id}:${p.course_id}`;
      progressMap.set(key, (progressMap.get(key) ?? 0) + 1);
    });
    const certSet = new Set((certs ?? []).map((c: { user_id: string; course_id: string }) => `${c.user_id}:${c.course_id}`));

    const built: EnrollmentRow[] = (enrollments ?? []).map((e) => {
      const er = e as unknown as EnrollmentRow;
      const key = `${er.user_id}:${er.course_id}`;
      return {
        ...er,
        course_title: courseMap.get(er.course_id) ?? "—",
        total_lessons: lessonCount.get(er.course_id) ?? 0,
        completed_lessons: progressMap.get(key) ?? 0,
        has_certificate: certSet.has(key),
      };
    });
    setRows(built);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const issueCertificate = async (row: EnrollmentRow) => {
    if (row.has_certificate) { toast.info("Certificate already issued"); return; }
    const { error } = await supabase.from("certificates").insert({
      user_id: row.user_id,
      course_id: row.course_id,
      recipient_name: "Student",
      paid: true,
      amount_cents: 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Certificate issued"); load(); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Enrollments</h1>
        <p className="text-muted-foreground text-sm">Track student progress, completions, and issue certificates.</p>
      </div>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-learn" />
      ) : rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No enrollments yet.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Student (user_id)</th>
                <th className="text-left p-3">Course</th>
                <th className="text-left p-3">Progress</th>
                <th className="text-left p-3">Enrolled</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total_lessons === 0 ? 0 : Math.round((r.completed_lessons / r.total_lessons) * 100);
                return (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 8)}…</td>
                    <td className="p-3">{r.course_title}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-learn" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{r.completed_lessons}/{r.total_lessons}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(r.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {r.completed_at ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-learn/15 text-learn">Completed</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">In progress</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm" variant="outline"
                        disabled={r.has_certificate}
                        onClick={() => issueCertificate(r)}
                      >
                        <Award className="w-3.5 h-3.5 mr-1" />
                        {r.has_certificate ? "Issued" : "Issue cert"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
