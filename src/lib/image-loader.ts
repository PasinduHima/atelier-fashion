"use client";

type LoaderArgs = { src: string; width: number; quality?: number };

/**
 * Custom next/image loader (wired up in next.config.ts).
 *
 * Unsplash serves images from an imgix-backed CDN that resizes on request, so
 * we ask it for the exact width instead of having the Next.js optimizer
 * download multi-megabyte originals. Unsplash's guidelines also require hotlinking
 * images from images.unsplash.com.
 *
 * Any other source (for example files in /public) is returned unchanged.
 */
export default function imageLoader({ src, width, quality }: LoaderArgs) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    url.searchParams.set("auto", "format");
    if (!url.searchParams.has("fit")) url.searchParams.set("fit", "crop");
    return url.toString();
  }
  return src;
}
