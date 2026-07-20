import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: email.trim() });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "You're already subscribed!" });
        setSubmitted(true);
      } else {
        toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      }
    } else {
      setSubmitted(true);
    }
    setEmail("");
    setLoading(false);
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto gradient-border animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
            Stay ahead of the curve
          </h2>
          <p className="text-muted-foreground mb-6">
            Get weekly insights on the latest in tech — no spam, just signal.
          </p>

          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-primary animate-fade-in">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">You're in! Check your inbox.</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 max-w-md mx-auto p-1.5 rounded-lg bg-muted border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
            >
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                aria-label="Email address"
                className="flex-1 min-w-0 bg-transparent px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              />

              <button
                type="submit"
                disabled={loading}
                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "..." : "Subscribe"} <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsletterSignup;
