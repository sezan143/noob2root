import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import CategoryCard from "@/components/blog/CategoryCard";
import { supabase } from "@/integrations/supabase/client";
import type { DbCategory } from "@/types/database";

const Categories = () => {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase.from("categories").select("*").order("name");
      setCategories(cats ?? []);

      // Get post counts per category
      if (cats) {
        const counts: Record<string, number> = {};
        for (const cat of cats) {
          const { count } = await supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("is_published", true)
            .eq("category_id", cat.id);
          counts[cat.id] = count ?? 0;
        }
        setPostCounts(counts);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">Categories</h1>
        <p className="text-muted-foreground mb-10 max-w-lg">Explore our content by topic area.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card-hover p-6">
              <span className="text-3xl mb-3 block">{cat.icon ?? "📁"}</span>
              <h2 className="font-heading font-bold text-foreground text-lg mb-2">{cat.name}</h2>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{cat.description}</p>
              <span className="text-xs text-primary">{postCounts[cat.id] ?? 0} articles</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Categories;
