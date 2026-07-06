import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Gift, Users, GraduationCap, Coins, Share2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Reward = {
  id: string;
  reward_type: string;
  amount_cents: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
};

export default function Referrals() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ joined: 0, completed: 0 });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: invited }, { data: rewardRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, first_name, last_name, created_at")
          .eq("referred_by", user.id),
        supabase
          .from("referral_rewards")
          .select("id, reward_type, amount_cents, status, created_at, approved_at, notes")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      let completedCount = 0;
      if (invited && invited.length) {
        const ids = invited.map((p) => p.user_id);
        const { data: enrol } = await supabase
          .from("enrollments")
          .select("user_id, completed_at")
          .in("user_id", ids)
          .not("completed_at", "is", null);
        const set = new Set((enrol ?? []).map((e: { user_id: string }) => e.user_id));
        completedCount = set.size;
      }

      setStats({ joined: invited?.length ?? 0, completed: completedCount });
      setRewards((rewardRows as Reward[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/referrals" replace />;

  const code = profile?.referral_code ?? "";
  const link = code ? `${window.location.origin}/ref/${code}` : "";
  const credit = ((profile?.referral_credit_cents ?? 0) / 100).toFixed(2);
  const approved = rewards.filter((r) => r.status === "approved" || r.status === "redeemed").length;
  const pending = rewards.filter((r) => r.status === "pending").length;

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Learn Linux & Hacking on Noob to Root",
          text: "Join me on Noob to Root — premium tutorials from zero to root.",
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <Layout>
      <SEO
        title="Referrals — Noob to Root"
        description="Invite friends and earn free certificates or credit toward paid certificates."
        noindex
      />
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Badge variant="outline" className="border-primary/40 text-primary mb-3">
            <Sparkles className="w-3 h-3 mr-1" /> Refer & earn
          </Badge>
          <h1 className="text-3xl md:text-4xl font-heading font-bold">Invite friends, earn rewards</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Share your unique link. When a friend joins and completes their first course, you earn a{" "}
            <span className="text-foreground font-medium">$3 credit</span> toward any paid certificate — or unlock a{" "}
            <span className="text-foreground font-medium">free certificate</span> instead.
          </p>
        </div>

        {/* Link card */}
        <Card className="glass-card border-primary/30 mb-8 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" /> Your referral link
            </CardTitle>
            <CardDescription>Send this link to friends. They sign up — you get rewarded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={link} className="font-mono text-sm" />
              <Button onClick={copy} className="font-semibold">
                <Copy className="w-4 h-4 mr-1.5" /> Copy
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 className="w-4 h-4 mr-1.5" /> Share
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Your code: <span className="font-mono text-foreground">{code || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="w-5 h-5" />} label="People joined" value={stats.joined} />
          <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Completed a course" value={stats.completed} />
          <StatCard icon={<Coins className="w-5 h-5" />} label="Credit balance" value={`$${credit}`} highlight />
          <StatCard
            icon={<Gift className="w-5 h-5" />}
            label="Rewards earned"
            value={`${approved} / ${rewards.length}`}
            sub={pending > 0 ? `${pending} pending` : undefined}
          />
        </div>

        {/* Rewards table */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Reward history</CardTitle>
            <CardDescription>
              Rewards are reviewed by our team before being credited. This usually takes 1–2 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rewards.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No rewards yet — share your link to get started.{" "}
                <Link to="/courses" className="text-primary hover:underline">
                  Browse courses
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Reward</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((r) => (
                      <tr key={r.id} className="border-b border-border/20">
                        <td className="py-3 text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 capitalize">{r.reward_type.replace("_", " ")}</td>
                        <td className="py-3">${(r.amount_cents / 100).toFixed(2)}</td>
                        <td className="py-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`glass-card ${highlight ? "border-primary/40" : "border-border/50"}`}>
      <CardContent className="p-5">
        <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${highlight ? "text-primary" : "text-muted-foreground"}`}>
          {icon}
          {label}
        </div>
        <div className="text-2xl font-heading font-bold mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    pending: { className: "border-yellow-500/40 text-yellow-500", label: "Pending review" },
    approved: { className: "border-learn/40 text-learn", label: "Approved" },
    redeemed: { className: "border-primary/40 text-primary", label: "Redeemed" },
    rejected: { className: "border-destructive/40 text-destructive", label: "Rejected" },
  };
  const v = map[status] ?? { className: "border-border", label: status };
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}
