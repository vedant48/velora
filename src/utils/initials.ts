/**
 * Derive avatar initials from a real display name or username.
 * letters=1: first character. letters=2: first letter of the first and last
 * word for multiword names, otherwise the first two characters of the word.
 * Never falls back to gallery/sample identities; empty input renders "?".
 */
export function avatarInitials(name: string | null | undefined, letters: 1 | 2 = 1): string {
  const base = (name ?? '').trim();
  if (!base) return '?';
  if (letters === 1) return base.charAt(0).toUpperCase();
  const words = base.split(/\s+/).filter(Boolean);
  const out =
    words.length > 1
      ? words[0].charAt(0) + words[words.length - 1].charAt(0)
      : base.slice(0, 2);
  return out.toUpperCase();
}
