import { Tables } from "@/integrations/supabase/types";

// Database row types
export type DbPost = Tables<"posts"> & {
  authors: Tables<"authors"> | null;
  categories: Tables<"categories"> | null;
};

export type DbAuthor = Tables<"authors">;
export type DbCategory = Tables<"categories">;
