import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Folder, type LucideIcon } from "lucide-react";
import type { DbCategory } from "@/types/database";

const resolveIcon = (name?: string | null): LucideIcon | null => {
  if (!name) return null;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return typeof Icon === "function" ? Icon : null;
};

const CategoryCard = ({ category, postCount }: { category: DbCategory; postCount?: number }) => {
  const Icon = resolveIcon(category.icon) ?? Folder;
  // Legacy support: if icon is a single emoji/short non-letter string, render it as text.
  const isEmoji = !!category.icon && !resolveIcon(category.icon) && /^\p{Extended_Pictographic}/u.test(category.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Link
        to={`/blog?category=${category.slug}`}
        className="glass-card-hover p-5 block group"
      >
        <span className="mb-2 block">
          {isEmoji ? (
            <span className="text-2xl">{category.icon}</span>
          ) : (
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 text-primary group-hover:shadow-[0_0_20px_-5px_hsl(var(--primary))] transition-shadow">
              <Icon className="w-5 h-5" />
            </span>
          )}
        </span>
        <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
          {category.name}
        </h3>
        {postCount !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">{postCount} articles</p>
        )}
      </Link>
    </motion.div>
  );
};

export default CategoryCard;
