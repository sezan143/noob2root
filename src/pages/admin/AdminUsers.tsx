import { useEffect, useState } from "react";
import { Loader2, Users, ShieldCheck, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  profile_completed: boolean;
  created_at: string;
  is_admin: boolean;
  enrollments: number;
  certificates: number;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: roles }, { data: enrollments }, { data: certs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, first_name, last_name, username, bio, avatar_url, profile_completed, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("enrollments").select("user_id"),
        supabase.from("certificates").select("user_id"),
      ]);
      const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
      const enrollMap = new Map<string, number>();
      (enrollments ?? []).forEach((e: any) => enrollMap.set(e.user_id, (enrollMap.get(e.user_id) ?? 0) + 1));
      const certMap = new Map<string, number>();
      (certs ?? []).forEach((c: any) => certMap.set(c.user_id, (certMap.get(c.user_id) ?? 0) + 1));
      setRows(
        ((profiles ?? []) as any[]).map((p) => ({
          ...p,
          is_admin: adminSet.has(p.user_id),
          enrollments: enrollMap.get(p.user_id) ?? 0,
          certificates: certMap.get(p.user_id) ?? 0,
        }))
      );
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (r.display_name ?? "").toLowerCase().includes(s) ||
      (r.username ?? "").toLowerCase().includes(s) ||
      (r.first_name ?? "").toLowerCase().includes(s) ||
      (r.last_name ?? "").toLowerCase().includes(s) ||
      r.user_id.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">All registered learners with profile details, role, and activity.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, username, or ID…"
          className="pl-9"
        />
      </div>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-learn" />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No users found.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Username</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Activity</th>
                <th className="text-left p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const fullName =
                  [r.first_name, r.last_name].filter(Boolean).join(" ") || r.display_name || "Unnamed";
                const initials = (fullName || "U")
                  .split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={r.user_id} className="border-t border-border/40 align-top">
                    <td className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-9 h-9">
                          {r.avatar_url && <AvatarImage src={r.avatar_url} alt={fullName} />}
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-secondary/30">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                          {r.bio && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-xs">{r.bio}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{r.username ? `@${r.username}` : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {r.profile_completed ? (
                        <Badge variant="outline" className="border-learn/40 text-learn">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500/40 text-yellow-500">
                          <AlertCircle className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.enrollments} enrolled · {r.certificates} certs
                    </td>
                    <td className="p-3">
                      {r.is_admin ? (
                        <Badge className="bg-primary/15 text-primary border-primary/40 hover:bg-primary/15">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Student</span>
                      )}
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
