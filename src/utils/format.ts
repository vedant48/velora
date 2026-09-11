export function formatYear(dateString?: string): string {
  if (!dateString) return '';
  return dateString.substring(0, 4);
}

export function formatRating(rating?: number): string {
  if (rating === undefined || rating === null || rating === 0) return 'NR';
  return rating.toFixed(1);
}

export function formatRuntime(minutes?: number): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function formatCurrency(amount?: number): string {
  if (!amount) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
