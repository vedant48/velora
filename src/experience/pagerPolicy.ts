/** Pure release policy, shared by the UI-thread pager and regression tests. */
export function pageAfterDrag(index: number, count: number, dx: number, velocity: number, width: number): number {
  'worklet';
  const advance = Math.abs(dx) > width * 0.22 || (Math.abs(dx) > 18 && Math.abs(velocity) > 650);
  return Math.max(0, Math.min(count - 1, index + (advance ? dx < 0 ? 1 : -1 : 0)));
}
export function resistedOffset(offset: number, count: number, width: number): number {
  'worklet';
  const edge = -(count - 1) * width;
  return offset > 0 ? offset * 0.18 : offset < edge ? edge + (offset - edge) * 0.18 : offset;
}
