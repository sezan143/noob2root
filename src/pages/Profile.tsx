import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Save,
  ShieldCheck,
  GraduationCap,
  Award,
  Download,
  ExternalLink,
  LogOut,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { generateCertificatePdf } from "@/lib/certificate";

type Enrollment = {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  course: { id: string; title: string; slug: string; cover_image: string | null; instructor_name: string | null } | null;
  total: number;
  done: number;
};

type Cert = {
  id: string;
  certificate_number: string;
  recipient_name: string | null;
  issued_at: string;
  paid: boolean;
  course: { title: string; instructor_name: string | null } | null;
};

export default function Profile() {
  const { user, profile, isAdmin, loading: authLoading, refreshProfile, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "settings";

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setDataLoading(true);
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, course_id, enrolled_at, completed_at")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      const courseIds = (enr ?? []).map((e) => e.course_id);
      let courses: Record<string, Enrollment["course"]> = {};
      let lessonCounts: Record<string, number> = {};
      let progressCounts: Record<string, number> = {};

      if (courseIds.length) {
        const [{ data: courseRows }, { data: lessonRows }, { data: progRows }] = await Promise.all([
          supabase
            .from("courses")
            .select("id, title, slug, cover_image, instructor_name")
            .in("id", courseIds),
          supabase.from("lessons").select("course_id").in("course_id", courseIds),
          supabase
            .from("lesson_progress")
            .select("course_id")
            .eq("user_id", user.id)
            .in("course_id", courseIds),
        ]);
        (courseRows ?? []).forEach((c: { id: string; title: string; slug: string; cover_image: string | null; instructor_name: string | null }) => {
          courses[c.id] = c;
        });
        (lessonRows ?? []).forEach((r: { course_id: string }) => {
          lessonCounts[r.course_id] = (lessonCounts[r.course_id] ?? 0) + 1;
        });
        (progRows ?? []).forEach((r: { course_id: string }) => {
          progressCounts[r.course_id] = (progressCounts[r.course_id] ?? 0) + 1;
        });
      }

      setEnrollments(
        (enr ?? []).map((e) => ({
          ...e,
          course: courses[e.course_id] ?? null,
          total: lessonCounts[e.course_id] ?? 0,
          done: progressCounts[e.course_id] ?? 0,
        }))
      );

      const { data: certRows } = await supabase
        .from("certificates")
        .select("id, certificate_number, recipient_name, issued_at, paid, course_id")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      const certCourseIds = (certRows ?? []).map((c: { course_id: string }) => c.course_id);
      let certCourses: Record<string, { title: string; instructor_name: string | null }> = {};
      if (certCourseIds.length) {
        const { data } = await supabase
          .from("courses")
          .select("id, title, instructor_name")
          .in("id", certCourseIds);
        (data ?? []).forEach((c: { id: string; title: string; instructor_name: string | null }) => {
          certCourses[c.id] = { title: c.title, instructor_name: c.instructor_name };
        });
      }
      setCerts(
        (certRows ?? []).map((c: { id: string; certificate_number: string; recipient_name: string | null; issued_at: string; paid: boolean; course_id: string }) => ({
          id: c.id,
          certificate_number: c.certificate_number,
          recipient_name: c.recipient_name,
          issued_at: c.issued_at,
          paid: c.paid,
          course: certCourses[c.course_id] ?? null,
        }))
      );
      setDataLoading(false);
    })();
  }, [user]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/profile" replace />;

  const name = displayName || user.email?.split("@")[0] || "Account";
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refreshProfile();
  };

  const downloadCert = (c: Cert) => {
    if (!c.course) return;
    generateCertificatePdf({
      recipient: c.recipient_name ?? name,
      course: c.course.title,
      date: new Date(c.issued_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      number: c.certificate_number,
      instructor: c.course.instructor_name ?? "Noob to Root Team",
    });
    toast.success("Certificate downloaded");
  };

  return (
    <Layout>
      <SEO title="My profile — Noob to Root" description="Manage your account, view your courses and certificates." />
      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <Avatar className="w-20 h-20 ring-2 ring-primary/40">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-2xl font-heading font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-heading font-bold truncate">{name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" /> {user.email}
              {isAdmin && (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div>
                <span className="font-semibold text-foreground">{enrollments.length}</span>{" "}
                <span className="text-muted-foreground">enrolled</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {enrollments.filter((e) => e.completed_at).length}
                </span>{" "}
                <span className="text-muted-foreground">completed</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">{certs.length}</span>{" "}
                <span className="text-muted-foreground">certificates</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {isAdmin && (
              <Button asChild variant="outline" className="border-primary/40 text-primary">
                <Link to="/admin">
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> Admin dashboard
                </Link>
              </Button>
            )}
            <Button variant="ghost" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="mb-6">
            <TabsTrigger value="settings">Account</TabsTrigger>
            <TabsTrigger value="courses">My courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* Settings */}
          <TabsContent value="settings">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Account settings</CardTitle>
                <CardDescription>Update how you appear across the site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dn">Display name</Label>
                  <Input
                    id="dn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="av">Avatar URL</Label>
                  <Input
                    id="av"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a public image URL. Leave empty to use your initials.
                  </p>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            {dataLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : enrollments.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="w-10 h-10 text-muted-foreground" />}
                title="No courses yet"
                desc="Browse the academy and enroll to start learning."
                cta={
                  <Button asChild>
                    <Link to="/courses">Browse courses</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {enrollments.map((e) => {
                  const pct = e.total > 0 ? Math.round((e.done / e.total) * 100) : 0;
                  return (
                    <Card key={e.id} className="glass-card border-border/50 overflow-hidden">
                      {e.course?.cover_image && (
                        <div className="h-32 bg-muted overflow-hidden">
                          <img src={e.course.cover_image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-heading font-semibold leading-tight">
                            {e.course?.title ?? "Course"}
                          </h3>
                          {e.completed_at && (
                            <Badge className="bg-learn/20 text-learn border-learn/40 hover:bg-learn/20">
                              Done
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{e.done}/{e.total} lessons</span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        {e.course && (
                          <div className="flex gap-2 pt-1">
                            <Button asChild size="sm" className="flex-1">
                              <Link to={`/courses/${e.course.slug}/learn`}>
                                {e.completed_at ? "Review" : "Continue"}
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/courses/${e.course.slug}`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates">
            {dataLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : certs.length === 0 ? (
              <EmptyState
                icon={<Award className="w-10 h-10 text-muted-foreground" />}
                title="No certificates yet"
                desc="Complete a course 100% to earn your first certificate."
                cta={
                  <Button asChild>
                    <Link to="/courses">Find a course</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {certs.map((c) => (
                  <Card key={c.id} className="glass-card border-border/50">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-learn/15 border border-learn/30 flex items-center justify-center shrink-0">
                        <Award className="w-6 h-6 text-learn" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold truncate">
                          {c.course?.title ?? "Course"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          #{c.certificate_number} ·{" "}
                          {new Date(c.issued_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <Button onClick={() => downloadCert(c)} size="sm">
                        <Download className="w-4 h-4 mr-1.5" /> Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function EmptyState({
  icon, title, desc, cta,
}: {
  icon: React.ReactNode; title: string; desc: string; cta?: React.ReactNode;
}) {
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="py-16 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">{icon}</div>
        <h3 className="text-lg font-heading font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{desc}</p>
        {cta}
      </CardContent>
    </Card>
  );
}