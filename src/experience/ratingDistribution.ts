/** Reviews can have half-star values. Bucket to the nearest labelled integer. */
export function ratingDistribution(ratings: (number | null | undefined)[]): number[] {
  const bins = Array.from({ length: 11 }, () => 0);
  for (const value of ratings) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) continue;
    bins[Math.round(value)]++;
  }
  return bins;
}
