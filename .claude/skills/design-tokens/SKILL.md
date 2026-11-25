---
name: design-tokens
description: Use Velora's design tokens instead of hardcoded spacing, font sizes, radii, and control sizes. Apply when creating or editing any screen or component style, when a layout looks inconsistent, or when the user mentions design tokens, spacing consistency, or hardcoded values.
---

# Velora design tokens

Velora's token system lives in `src/theme/`. It exists but adoption is incomplete: as of
v1.5.10, `ui.*` tokens are used in ~10 of 64 TSX files while ~400 padding/margin/gap values,
~195 font sizes and ~112 border radii are hardcoded. Your job on every edit is to not add to
that debt, and to migrate what you touch.

## What exists

- `src/theme/colors.ts` - full palette, consumed via `useAppTheme()` / `useThemedStyles()`. Well adopted; keep it that way. Never add a hex literal outside this file.
- `src/theme/ui.ts` - the canonical scale:
  - `ui.space`: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32
  - `ui.radius`: card 8, button 12, sheet 16, pill 999
  - `ui.type`: screenTitle 24, heading 18, body 14, label 12, caption 11
  - `ui.control`: minHeight 44, back 38
- `src/theme/metrics.ts` - DUPLICATE spacing scale (`spacingXs..2Xl`, same values) plus component geometry (poster/backdrop sizes, headerHeight, tabBarHeight). Do not use `metrics.spacing*` in new code; use `ui.space`. Component geometry (posterWidth etc.) is fine until consolidated.
- `src/theme/typography.ts` - text style presets (heroTitle, sectionTitle, cardTitle, body...). Prefer over hand-rolled fontSize/fontWeight pairs.

## Rules

1. New or touched styles use `ui.space` / `ui.radius` / `ui.type` / `ui.control`. A literal that equals a scale value (4/8/12/16/24/32) is still a violation; use the token.
2. When you edit a file, migrate the literals in the block you touched to tokens. Values must stay identical; this is not a redesign.
3. No new hex colors outside `colors.ts`; no new duplicate scales.
4. Font sizes come from `ui.type` or `typography.ts`, not raw numbers.
5. Touch targets stay >= `ui.control.minHeight` (44).
6. Safe-area inset values are NOT tokens. Never hardcode a status bar or notch height; use `useSafeAreaInsets()`. See the android-layout-verification skill.

## Known worst areas (migrate first when editing there)

- `src/screens/Profile/` (~104 hardcoded values) and `src/components/Library/` (~72). Adjacent blocks there use horizontal padding 10, 15 and 20; converging those to the scale is intended, keep visuals otherwise unchanged.

## Long-term direction (agreed with owner, not yet scheduled)

One scale: make `ui.ts` canonical, alias then remove `metrics.spacing*`, codemod literals
screen by screen starting with Profile/Library, add shared safe-area layout helpers.
