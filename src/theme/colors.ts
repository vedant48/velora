export const colors = {
  background: '#101010',
  backgroundSecondary: '#111116',
  cardBackground: '#101010',
  surface: '#242424',
  surfaceLight: '#303030',
  surfaceBorder: '#2E2E3C',

  primary: '#E50914', // Velora cinematic red
  primaryHover: '#F40612',
  primaryGlow: 'rgba(229, 9, 20, 0.35)',

  // Must-style tracking accent: selected status bars, episode checks, Save buttons
  trackBlue: '#2E7BF6',
  trackBlueDark: '#1B5FD0',

  accentAmber: '#FFB800', // Rating star
  accentCyan: '#00D2FF',
  accentPurple: '#7928CA',

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#8A8A94',
  textMuted: '#85858F',

  border: '#22222C',
  borderHighlight: '#3F3F4E',

  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  overlayDark: 'rgba(9, 9, 11, 0.75)',
  glassDark: 'rgba(14, 14, 20, 0.88)',
  shimmerBase: '#161620',
  shimmerHighlight: '#2A2A38',

  // Apple-style redesign palette (approved gallery direction, 25 Nov).
  // Light-theme overrides live in ThemeContext.
  appleCard: '#1C1C1E',
  appleFill: 'rgba(120,120,128,0.22)',
  appleSegTrack: 'rgba(118,118,128,0.2)',
  appleSegActive: '#48484A',
  appleText: '#FFFFFF',
  appleText2: 'rgba(235,235,245,0.6)',
  appleText3: 'rgba(235,235,245,0.45)',
  appleSeparator: 'rgba(255,255,255,0.1)',
  appleBlue: '#0A84FF',
  appleAmber: '#FFD60A',
  appleGreen: '#30D158',
  appleRedSoft: 'rgba(229,9,20,0.55)',
  appleTabBar: '#141416',
} as const;
