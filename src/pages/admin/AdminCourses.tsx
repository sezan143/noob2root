import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Course, formatPrice, slugify } from "@/lib/courses";
import { toast } from "sonner";

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses((data ?? []) as unknown as Course[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const title = "Untitled Course";
    const { data, error } = await supabase
      .from("courses")
      .insert({ title, slug: slugify(title) + "-" + Date.now().toString(36) })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    window.location.href = `/admin/courses/${(data as { id: string }).id}`;
  };

  const togglePublish = async (c: Course) => {
    await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course and all its modules/lessons?")) return;
    await supabase.from("courses").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Courses</h1>
          <p className="text-muted-foreground text-sm">Manage your learning catalog.</p>
        </div>
        <Button onClick={create} className="bg-learn hover:bg-learn/90 text-learn-foreground font-semibold">
          <Plus className="w-4 h-4 mr-2" /> New course
        </Button>
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-learn" />
      ) : courses.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No courses yet. Create your first one.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Level</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Cert</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3 font-medium">
                    <Link to={`/admin/courses/${c.id}`} className="hover:text-learn">{c.title}</Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.level}</td>
                  <td className="p-3">{c.content_free ? "Free" : formatPrice(c.price_cents)}</td>
                  <td className="p-3">{c.certificate_paid ? formatPrice(c.certificate_price_cents) : "Free"}</td>
                  <td className="p-3">
                    <button
                      onClick={() => togglePublish(c)}
                      className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${c.is_published ? "bg-learn/15 text-learn" : "bg-muted text-muted-foreground"}`}
                    >
                      {c.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {c.is_published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <Button asChild size="sm" variant="ghost"><Link to={`/admin/courses/${c.id}`}><Edit className="w-4 h-4" /></Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
