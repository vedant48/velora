export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_PREFERENCE_KEY = '@velora_theme_preference';
export function readThemePreference(raw: string | null): ThemePreference {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch { return 'system'; }
}
export function resolveThemeMode(preference: ThemePreference, system: string | null | undefined): 'light' | 'dark' {
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
}
