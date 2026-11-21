/**
 * Velora backend base URL. Set EXPO_PUBLIC_API_URL at build time, e.g.
 * EXPO_PUBLIC_API_URL=https://velora-api.<subdomain>.workers.dev
 * Until deployed, tracking features run in "offline" mode (local watchlist only).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://velora-api.vedant-753.workers.dev';

export const isApiConfigured = !API_BASE_URL.includes('your-subdomain');

/**
 * Google OAuth web client ID used as `webClientId` for native Google sign-in
 * (react-native-nitro-google-signin). Client IDs are public identifiers, not
 * secrets; the backend accepts ID tokens whose audience matches this ID or the
 * Android client ID registered for the release signing certificate.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '1084252468279-dhrg0b1a86r4n1vtlbvavl9l5nm5qkl9.apps.googleusercontent.com';
