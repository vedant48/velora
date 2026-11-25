---
name: android-layout-verification
description: Android safe-area, collapsing/sticky header, and visual-regression rules for Velora. Apply when building or changing any header, overlay, pinned/sticky element, scroll-driven animation, or anything near the status bar or navigation bar, and before shipping any scroll or layout change.
---

# Android layout verification

Rules below come from shipped bugs. Follow them on every header/overlay/scroll change.

## Safe area and overlays

1. The app draws behind a translucent status bar. Anything absolutely positioned at `top: 0`
   WILL render behind the clock/icons unless clipped. Never translate an overlay upward
   without clipping: translated content parks in the `0..insets.top` strip and shows through
   the status bar (shipped in v1.5.9: profile stat labels visible behind the clock).
2. The status-bar strip must always be painted by a static, opaque spacer of exactly
   `insets.top` height, outside any animated/translated/clipped region.
3. Collapsing headers: put the collapsible content in a clip window whose animated height
   goes to exactly 0 (`overflow: 'hidden'`, content bottom-anchored so it exits upward).
   Animating height to a measured-constant 0 guarantees full disappearance; a translate
   clamped to a measured height does not, because measured and rendered height drift
   (late-loading stats/avatars, device font scaling) and the drift shows up as a gap above
   the pinned row (also shipped in v1.5.9).
4. `Animated.event` with `useNativeDriver: true` on FlashList crashes on scroll
   (mqt_v_native TypeError, shipped as the v1.5.8 crash). Scroll-driven animation on
   FlashList is JS-driven (`useNativeDriver: false`).
5. List `paddingTop`, RefreshControl `progressViewOffset` and header height must be derived
   from the same measured values (`insets.top + collapseH + pinnedH`), never constants.

## Proof gates for scroll/layout changes

Weak assertions are not done. Before shipping a header/scroll change, the Maestro proof
(`.maestro/cards-*.yaml` via `test/ui-proof-*` branches) must capture and you must inspect
the pixels of:

1. Initial order at rest.
2. PARTIAL scroll (short swipe): mid-collapse state clips cleanly, no overlap into the
   status bar, no tearing.
3. Full scroll: everything that should be gone is gone - assert `assertNotVisible` for a
   text unique to the scrolled-away block (tab labels collide; stat labels like `Place`
   don't) - and the pinned row sits flush at the top with no blank gap.
4. Return to top: header expands back, all at-rest elements visible again.
5. The top status-bar strip of every scrolled screenshot: no text or remnants behind the
   system icons. Emulator strips are thin; look anyway (this is where v1.5.9's bleed hid).

Layout-only Metro bundles pass tsc and unit tests while being broken: `npx expo export
--platform android` before tagging, then the emulator proof, then pixel inspection.
