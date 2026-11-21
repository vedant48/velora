/**
 * Velora backend base URL. Set EXPO_PUBLIC_API_URL at build time, e.g.
 * EXPO_PUBLIC_API_URL=https://velora-api.<subdomain>.workers.dev
 * Until deployed, tracking features run in "offline" mode (local watchlist only).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://velora-api.vedant-753.workers.dev';

export const isApiConfigured = !API_BASE_URL.includes('your-subdomain');
