import { supabase } from "@/integrations/supabase/client";

export type Course = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_image: string | null;
  level: string | null;
  duration_minutes: number | null;
  instructor_name: string | null;
  price_cents: number;
  content_free: boolean;
  certificate_paid: boolean;
  certificate_price_cents: number;
  is_published: boolean;
  sort_order: number | null;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

export type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  slug: string | null;
  lesson_type: "text" | "video" | "terminal" | "quiz";
  content: string | null;
  video_url: string | null;
  terminal_commands: { command: string; output: string; hint?: string }[];
  duration_minutes: number | null;
  sort_order: number;
};

export type QuizQuestion = {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const formatPrice = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;

export async function fetchCourseFull(slug: string) {
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return null;

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", course.id)
    .eq("is_published", true)
    .order("sort_order");

  const publishedModuleIds = (modules ?? []).map((m: { id: string }) => m.id);

  const { data: lessons } = publishedModuleIds.length
    ? await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", course.id)
        .in("module_id", publishedModuleIds)
        .order("sort_order")
    : { data: [] as unknown[] };

  return {
    course: course as unknown as Course,
    modules: (modules ?? []) as unknown as Module[],
    lessons: (lessons ?? []) as unknown as Lesson[],
  };
}
