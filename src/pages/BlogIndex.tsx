import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import PostCard from "@/components/blog/PostCard";
import { supabase } from "@/integrations/supabase/client";
import type { DbPost, DbCategory } from "@/types/database";

type SortOption = "newest" | "popular" | "reading-time";

const BlogIndex = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
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
          .order("published_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);
      setPosts((postsRes.data as DbPost[]) ?? []);
      setCategories(catsRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.categories?.slug === selectedCategory);
    }

    switch (sortBy) {
      case "popular":
        result.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case "reading-time":
        result.sort((a, b) => (a.reading_time ?? 0) - (b.reading_time ?? 0));
        break;
      default:
        result.sort((a, b) => new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime());
    }

    return result;
  }, [posts, searchQuery, selectedCategory, sortBy]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Tutorials & Guides"
        description="Browse all Noob to Root tutorials — Linux, ethical hacking, networking, DevOps, and developer guides."
      />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">Tutorials</h1>
        <p className="text-muted-foreground mb-8">Hands-on guides from noob to root.</p>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <label htmlFor="blog-search" className="sr-only">Search posts</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              id="blog-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              aria-label="Search posts"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            />
          </div>
          <div className="flex gap-3">
            <label htmlFor="blog-category" className="sr-only">Filter by category</label>
            <select
              id="blog-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
            <label htmlFor="blog-sort" className="sr-only">Sort posts</label>
            <select
              id="blog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort posts"
              className="px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="reading-time">Reading Time</option>
            </select>
          </div>
        </div>


        {/* Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <SlidersHorizontal className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No posts found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BlogIndex;
