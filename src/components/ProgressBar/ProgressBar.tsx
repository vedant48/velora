import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  progress: number;
  duration: number;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = React.memo(
  ({ progress, duration, height = 3.5 }) => {
    const ratio = duration > 0 ? Math.min(Math.max(progress / duration, 0), 1) : 0;
    const percentage = `${Math.round(ratio * 100)}%`;

    return (
      <View style={[styles.container, { height }]}>
        <View style={[styles.fill, { width: percentage as any }]} />
      </View>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
