/**
 * Optimize Unsplash image URLs (and pass through others unchanged).
 * Returns a single src + a srcSet for responsive loading.
 */
export function unsplashSrc(url: string | null | undefined, width = 640, quality = 65): string {
  if (!url) return "/placeholder.svg";
  if (!url.includes("images.unsplash.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", String(quality));
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.delete("h");
    return u.toString();
  } catch {
    return url;
  }
}

export function unsplashSrcSet(url: string | null | undefined, widths = [320, 480, 640, 800]): string | undefined {
  if (!url || !url.includes("images.unsplash.com")) return undefined;
  return widths.map((w) => `${unsplashSrc(url, w)} ${w}w`).join(", ");
}

/**
 * Optimize Supabase Storage image URLs using the built-in image transformer.
 * Converts /storage/v1/object/public/... to /storage/v1/render/image/public/...
 * with width / quality / format params so we don't download a 1536px-wide
 * image to display at 665px.
 */
export function supabaseImg(url: string | null | undefined, width = 800, quality = 70): string {
  if (!url) return "/placeholder.svg";
  if (!url.includes("/storage/v1/object/public/")) return url;
  try {
    const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const u = new URL(transformed);
    u.searchParams.set("width", String(width));
    u.searchParams.set("quality", String(quality));
    u.searchParams.set("resize", "contain");
    return u.toString();
  } catch {
    return url;
  }
}

export function supabaseImgSrcSet(url: string | null | undefined, widths = [400, 640, 800, 1200]): string | undefined {
  if (!url || !url.includes("/storage/v1/object/public/")) return undefined;
  return widths.map((w) => `${supabaseImg(url, w)} ${w}w`).join(", ");
}

/** Unified responsive helper: picks the right transformer based on origin. */
export function smartImg(url: string | null | undefined, width = 800): string {
  if (!url) return "/placeholder.svg";
  if (url.includes("images.unsplash.com")) return unsplashSrc(url, width);
  if (url.includes("/storage/v1/object/public/")) return supabaseImg(url, width);
  return url;
}

export function smartSrcSet(url: string | null | undefined, widths = [400, 640, 800, 1200]): string | undefined {
  if (!url) return undefined;
  if (url.includes("images.unsplash.com")) return unsplashSrcSet(url, widths);
  if (url.includes("/storage/v1/object/public/")) return supabaseImgSrcSet(url, widths);
  return undefined;
}
