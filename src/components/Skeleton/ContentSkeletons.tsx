import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { metrics } from '../../theme/metrics';
import { ui } from '../../theme/ui';
import { MovieCardSkeleton } from './MovieCardSkeleton';
import { Shimmer } from './Shimmer';

const sk = ui.component.skeleton;

/** List rows with a round avatar and two text lines (activity, people, episodes). */
export const RowsSkeleton: React.FC<{ count?: number; avatar?: boolean }> = React.memo(({ count = 6, avatar = true }) => (
  <View accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }} style={styles.rows}>
    {Array.from({ length: count }, (_, i) => (
      <View key={i} style={styles.row}>
        {avatar && <Shimmer style={styles.avatar} borderRadius={sk.rowAvatar / 2} />}
        <View style={styles.lines}>
          <Shimmer style={styles.lineTall} borderRadius={ui.radius.card / 2} />
          <Shimmer style={styles.lineShort} borderRadius={ui.radius.card / 2} />
        </View>
      </View>
    ))}
  </View>
));
RowsSkeleton.displayName = 'RowsSkeleton';

/** Poster cards in a wrapped grid (genre, search, collections, library, profile). */
export const PosterGridSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 6 }) => (
  <View accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }} style={styles.grid}>
    {Array.from({ length: count }, (_, i) => (
      <MovieCardSkeleton key={i} />
    ))}
  </View>
));
PosterGridSkeleton.displayName = 'PosterGridSkeleton';

/** One carousel row of poster cards. */
export const PosterRowSkeleton: React.FC<{ cardWidth?: number; cardHeight?: number }> = React.memo(
  ({ cardWidth = metrics.posterWidth, cardHeight = metrics.posterHeight }) => (
    <ScrollView
      horizontal
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      contentContainerStyle={styles.posterRow}
    >
      {Array.from({ length: 3 }, (_, i) => (
        <MovieCardSkeleton key={i} width={cardWidth} height={cardHeight} hasMarginRight />
      ))}
    </ScrollView>
  ),
);
PosterRowSkeleton.displayName = 'PosterRowSkeleton';

/** A row of pill-shaped buttons (tracking controls). */
export const PillRowSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 3 }) => (
  <View accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }} style={styles.pills}>
    {Array.from({ length: count }, (_, i) => (
      <Shimmer key={i} style={styles.pill} borderRadius={ui.radius.button} />
    ))}
  </View>
));
PillRowSkeleton.displayName = 'PillRowSkeleton';

/** Photo, name and bio lines (person detail, profile header). */
export const ProfileSkeleton: React.FC = React.memo(() => (
  <View accessibilityRole="progressbar" accessibilityLabel="Loading" accessibilityState={{ busy: true }} style={styles.profile}>
    <Shimmer style={styles.profileAvatar} borderRadius={sk.sheetAvatar / 2} />
    <Shimmer style={styles.lineTall} borderRadius={ui.radius.card / 2} />
    <Shimmer style={styles.lineShort} borderRadius={ui.radius.card / 2} />
    <PosterRowSkeleton />
  </View>
));
ProfileSkeleton.displayName = 'ProfileSkeleton';

const styles = StyleSheet.create({
  rows: { gap: sk.rowGap, padding: ui.space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: ui.space.md },
  avatar: { width: sk.rowAvatar, height: sk.rowAvatar },
  lines: { flex: 1, gap: ui.space.sm },
  lineTall: { width: '70%', height: sk.rowLineTall },
  lineShort: { width: '45%', height: sk.rowLineShort },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ui.space.md, padding: ui.space.lg },
  posterRow: { paddingHorizontal: ui.space.lg },
  pills: { flexDirection: 'row', gap: ui.space.md, paddingVertical: ui.space.lg },
  pill: { width: sk.pillWidth, height: sk.pillHeight },
  profile: { alignItems: 'center', gap: ui.space.md, padding: ui.space.lg },
  profileAvatar: { width: sk.sheetAvatar, height: sk.sheetAvatar },
});
