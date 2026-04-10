import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PostCard from "@/components/blog/PostCard";
import CategoryCard from "@/components/blog/CategoryCard";
import NewsletterSignup from "@/components/blog/NewsletterSignup";
import { supabase } from "@/integrations/supabase/client";
import type { DbPost, DbCategory } from "@/types/database";

const Index = () => {
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [postsRes, catsRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*, authors(*), categories(*)")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(6),
        supabase.from("categories").select("*").order("name"),
      ]);
      setPosts((postsRes.data as DbPost[]) ?? []);
      setCategories(catsRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const featuredPosts = posts.filter((p) => p.is_featured);
  const latestPosts = posts.slice(0, 6);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <Zap className="w-3 h-3" /> Future-forward tech insights
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
              <span className="text-foreground">In-Depth Tech</span>
              <br />
              <span className="gradient-text">Insights & Analysis</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Tutorials, deep dives, and cutting-edge analysis for developers and tech leaders building the future.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity neon-glow"
            >
              Browse Latest Posts <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <section className="py-16">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-heading font-bold text-foreground">Featured</h2>
                  <Link to="/blog" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredPosts.map((post) => (
                    <PostCard key={post.id} post={post} featured />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Latest Posts */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-8">Latest Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-8">Explore Topics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <NewsletterSignup />
    </Layout>
  );
};

export default Index;
