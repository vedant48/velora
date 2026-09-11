import { Image } from 'expo-image';

export type ImageType = 'poster' | 'backdrop' | 'profile' | 'hero' | 'thumbnail';

// TMDB Standard resolutions
const RESOLUTIONS: Record<ImageType, string> = {
  thumbnail: 'w185',
  poster: 'w342',
  profile: 'w185',
  backdrop: 'w780',
  hero: 'w1280',
};

/**
 * Generates an optimized, proxied image URL.
 * Routes through the high-performance wsrv.nl edge CDN proxy to prevent direct
 * connections to image.tmdb.org (which are throttled/blocked on Indian ISPs)
 * and to automatically serve compressed WebP format for 60/120 FPS rendering.
 */
export function getImageUrl(
  path: string | null | undefined,
  type: ImageType = 'poster'
): string | null {
  if (!path) return null;

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const resolution = RESOLUTIONS[type];
  const tmdbDirectUrl = `https://image.tmdb.org/t/p/${resolution}/${cleanPath}`;

  // Use wsrv.nl edge proxy with WebP compression & quality optimization
  return `https://wsrv.nl/?url=${encodeURIComponent(tmdbDirectUrl)}&output=webp&q=80`;
}

export function getPosterUrl(
  path: string | null | undefined,
  size: string = 'w342'
): string | null {
  if (!path) return null;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const tmdbDirectUrl = `https://image.tmdb.org/t/p/${size}/${cleanPath}`;
  return `https://wsrv.nl/?url=${encodeURIComponent(tmdbDirectUrl)}&output=webp&q=80`;
}


// Prefetch cache set to prevent duplicate prefetch tasks
const prefetchedUrls = new Set<string>();

/**
 * Intelligent viewport-window prefetcher.
 * Takes a small array of upcoming image URLs (e.g. [D], [E]) and preheats
 * the native disk and memory cache via expo-image.
 */
export async function prefetchImagesWindow(urls: (string | null | undefined)[]) {
  const validUrls = urls
    .filter((url): url is string => Boolean(url && !prefetchedUrls.has(url)))
    .slice(0, 5); // strict budget limit to preserve bandwidth and UI thread

  for (const url of validUrls) {
    prefetchedUrls.add(url);
    try {
      await Image.prefetch(url);
    } catch {
      // Ignore prefetch failures silently
    }
  }
}

/**
 * Common image transition and cache configuration for expo-image
 */
export const IMAGE_CONFIG = {
  transition: 180,
  cachePolicy: 'memory-disk' as const,
  placeholder: 'L67_}#WB00of~qofWBof00of~qof', // Neutral dark blurhash
};
