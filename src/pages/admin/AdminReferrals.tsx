import { useEffect, useState } from "react";
import { Loader2, Gift, Check, X, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  course_id: string | null;
  reward_type: string;
  amount_cents: number;
  status: string;
  created_at: string;
  notes: string | null;
  referrer_name: string;
  referred_name: string;
  course_title: string | null;
};

export default function AdminReferrals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = async () => {
    setLoading(true);
    const [{ data: rewards }, { data: profiles }, { data: courses }] = await Promise.all([
      supabase
        .from("referral_rewards")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, first_name, last_name, username"),
      supabase.from("courses").select("id, title"),
    ]);
    const profMap = new Map<string, string>();
    (profiles ?? []).forEach((p: { user_id: string; display_name: string | null; first_name: string | null; last_name: string | null; username: string | null }) => {
      const name =
        p.display_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        (p.username ? `@${p.username}` : p.user_id.slice(0, 8));
      profMap.set(p.user_id, name);
    });
    const courseMap = new Map<string, string>();
    (courses ?? []).forEach((c: { id: string; title: string }) => courseMap.set(c.id, c.title));

    setRows(
      ((rewards ?? []) as Array<{ id: string; referrer_id: string; referred_user_id: string; course_id: string | null; reward_type: string; amount_cents: number; status: string; created_at: string; notes: string | null }>).map((r) => ({
        ...r,
        referrer_name: profMap.get(r.referrer_id) ?? "Unknown",
        referred_name: profMap.get(r.referred_user_id) ?? "Unknown",
        course_title: r.course_id ? courseMap.get(r.course_id) ?? null : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("referral_rewards").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked ${status}`);
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const totalApproved = rows
    .filter((r) => r.status === "approved" || r.status === "redeemed")
    .reduce((sum, r) => sum + r.amount_cents, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Referrals</h1>
        <p className="text-muted-foreground text-sm">Approve referral rewards and track program activity.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total rewards" value={rows.length} />
        <Stat label="Pending" value={pendingCount} accent />
        <Stat
          label="Approved"
          value={rows.filter((r) => r.status === "approved" || r.status === "redeemed").length}
        />
        <Stat label="Credit issued" value={`$${(totalApproved / 100).toFixed(2)}`} icon={<Coins className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f} {f === "pending" && pendingCount > 0 && `(${pendingCount})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-learn" />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No referral rewards in this view.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Referrer</th>
                <th className="text-left p-3">Referred friend</th>
                <th className="text-left p-3">Course</th>
                <th className="text-left p-3">Reward</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-3 font-medium">{r.referrer_name}</td>
                  <td className="p-3 text-muted-foreground">{r.referred_name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.course_title ?? "—"}</td>
                  <td className="p-3">
                    <span className="capitalize">{r.reward_type.replace("_", " ")}</span>
                    <div className="text-xs text-muted-foreground">${(r.amount_cents / 100).toFixed(2)}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {r.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-learn/40 text-learn hover:bg-learn/10"
                          onClick={() => updateStatus(r.id, "approved")}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatus(r.id, "rejected")}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "redeemed")}>
                        Mark redeemed
                      </Button>
                    )}
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

function Stat({ label, value, accent, icon }: { label: string; value: string | number; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`glass-card p-4 ${accent ? "border-primary/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-heading font-bold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-yellow-500/40 text-yellow-500",
    approved: "border-learn/40 text-learn",
    redeemed: "border-primary/40 text-primary",
    rejected: "border-destructive/40 text-destructive",
  };
  return (
    <Badge variant="outline" className={map[status] ?? "border-border"}>
      {status}
    </Badge>
  );
}
