import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Comments = ({ postId }: { postId: string }) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load comments", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as CommentRow[];
    setComments(rows);

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = content.trim();
    if (trimmed.length < 1) return;
    if (trimmed.length > 5000) {
      toast({ title: "Too long", description: "Max 5000 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: trimmed,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to post", description: error.message, variant: "destructive" });
      return;
    }
    setContent("");
    toast({ title: "Comment posted" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    setComments((c) => c.filter((x) => x.id !== id));
  };

  return (
    <section className="mt-12 pt-10 border-t border-border">
      <h2 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        Comments {comments.length > 0 && <span className="text-muted-foreground text-base">({comments.length})</span>}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="glass-card p-4 mb-8">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            maxLength={5000}
            className="bg-background/40 border-border resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{content.length}/5000</span>
            <Button type="submit" disabled={submitting || content.trim().length < 1}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="glass-card p-4 mb-8 text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> to join the conversation.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Be the first to comment.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const p = profiles[c.user_id];
            const name = p?.display_name || p?.username || "User";
            const canDelete = !!user && (user.id === c.user_id || isAdmin);
            return (
              <li key={c.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-mono">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">{name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default Comments;
