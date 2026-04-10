import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { DbCategory } from "@/types/database";

const CategoryCard = ({ category, postCount }: { category: DbCategory; postCount?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
  >
    <Link
      to={`/blog?category=${category.slug}`}
      className="glass-card-hover p-5 block group"
    >
      <span className="text-2xl mb-2 block">{category.icon ?? "📁"}</span>
      <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
        {category.name}
      </h3>
      {postCount !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">{postCount} articles</p>
      )}
    </Link>
  </motion.div>
);

export default CategoryCard;
