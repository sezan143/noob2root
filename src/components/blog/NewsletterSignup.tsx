import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto gradient-border"
        >
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
            Stay ahead of the curve
          </h2>
          <p className="text-muted-foreground mb-6">
            Get weekly insights on the latest in tech — no spam, just signal.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 text-primary"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">You're in! Check your inbox.</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 neon-glow disabled:opacity-50"
              >
                {loading ? "..." : "Subscribe"} <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSignup;
