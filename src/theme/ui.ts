/** Shared geometry and type scale. Themes change color, never layout. */

// Layer 1 - base values
const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { card: 8, button: 12, sheet: 16, pill: 999 } as const;
const type = { screenTitle: 24, heading: 18, body: 14, label: 12, caption: 11 } as const;
const control = { minHeight: 44, back: 38 } as const;

export const ui = {
  space,
  radius,
  type,
  control,

  // Layer 2 - purpose aliases: what a value means wherever it appears.
  purpose: {
    screenHorizontalPadding: space.lg,
    cardPadding: space.md,
    chipRadius: 20,
    iconButtonSize: 34,
    iconButtonRadius: 17,
    actionIconSize: 38,
    actionIconRadius: 10,
  },

  // Layer 3 - component tokens: exact current Profile/Library layout values.
  // Nonstandard values (15/20/10/9/45...) are preserved here on purpose; rounding them
  // to the base scale changes pixels and is a separate, reviewed decision.
  component: {
    topRow: {
      // Apple redesign: 20px screen padding, 34px red V tile.
      horizontalPadding: 20,
      buttonSize: 34,
      brandIconSize: 34,
      brandIconRadius: 9,
      brandIconMarginLeft: 0,
    },
    profileHeader: {
      horizontalPadding: 20,
      identityGap: 14,
      avatarSize: 52,
      avatarTextSize: 26,
      nameSize: 27,
      statsRightPadding: 45,
      statValueSize: 15,
      actionsGap: 10,
    },
    libraryHeader: {
      // Shared by the profile and tabs header blocks.
      innerHorizontalPadding: 0,
    },
    libraryTabs: {
      horizontalPadding: 20,
      topPadding: 14,
      tabHorizontalPadding: 9,
      tabVerticalPadding: 10,
      tabRadius: 18,
    },
    libraryGrid: {
      // 14 + 6 cell padding = 20px outer edge, 12px between posters.
      horizontalPadding: 14,
      topPadding: 14,
      bottomPadding: 100,
      cellPadding: 6,
    },
    libraryFilters: {
      gap: 10,
      applyHorizontalPadding: 30,
      applyVerticalPadding: 9,
    },
    libraryInsights: {
      gap: 18,
      rowGap: 10,
      cardRadius: 14,
      distGap: 5,
      distBarHeight: 76,
      bigValueSize: 34,
      valueSize: 22,
    },
    circleReviews: {
      cardWidth: 300,
      cardRadius: 14,
      avatar: 52,
      ratingAvatar: 62,
      sheetAvatar: 44,
      sheetMaxHeight: 420,
      badgeOverlap: -10,
      starSize: 11,
      badgeStarSize: 9,
    },
    loader: {
      small: { width: 36, height: 8 },
      large: { width: 64, height: 10 },
    },
    skeleton: {
      rowAvatar: 44,
      rowLineTall: 14,
      rowLineShort: 10,
      rowGap: 14,
      pillHeight: 40,
      pillWidth: 96,
      sheetAvatar: 72,
    },
  },
} as const;
