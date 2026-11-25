import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage as Image } from '../../experience/CachedImage';
import { AppColors, useAppTheme, useThemedStyles } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';
import { getImageUrl, IMAGE_CONFIG } from '../../utils/image';
import { BottomSheet } from '../common/BottomSheet';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
}

interface ActionSheetProps {
  visible: boolean;
  options: ActionSheetOption[];
  onClose: () => void;
  showCancel?: boolean;
  dismissOnSelect?: boolean;
  /** Apple redesign: optional sheet header (poster + title + status line), as in the approved actions mock. */
  header?: { posterPath?: string | null; title: string; subtitle?: string };
}

/** Must-style bottom action sheet over a dimmed backdrop. */
export const ActionSheet = memo(function ActionSheet({
  visible,
  options,
  onClose,
  showCancel = true,
  dismissOnSelect = true,
  header,
}: ActionSheetProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const headerPoster = header?.posterPath ? getImageUrl(header.posterPath, 'thumbnail') : null;
  return (
    <BottomSheet visible={visible} onClose={onClose}>
          {header && (
            <View style={styles.headerRow}>
              {headerPoster ? (
                <Image
                  source={{ uri: headerPoster }}
                  style={styles.headerPoster}
                  contentFit="cover"
                  transition={IMAGE_CONFIG.transition}
                  cachePolicy={IMAGE_CONFIG.cachePolicy}
                  placeholder={IMAGE_CONFIG.placeholder}
                />
              ) : null}
              <View style={styles.headerMeta}>
                <Text style={styles.headerTitle} numberOfLines={1}>{header.title}</Text>
                {!!header.subtitle && <Text style={styles.headerSub} numberOfLines={1}>{header.subtitle}</Text>}
              </View>
            </View>
          )}
          {options.map((opt, i) => (
            <Pressable
              key={opt.label}
              accessibilityLabel={opt.label}
              onPress={() => {
                if (dismissOnSelect) onClose();
                opt.onPress();
              }}
              style={({ pressed }) => [styles.option, (i > 0 || header) && styles.optionSep, pressed && styles.optionPressed]}
              accessibilityRole="button"
            >
              {opt.icon ? (
                <Ionicons name={opt.icon} size={19} color={opt.destructive ? colors.error : opt.iconColor ?? colors.textPrimary} style={styles.optionIcon} />
              ) : null}
              <Text style={[styles.optionText, opt.destructive && styles.destructiveText]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
          {showCancel && (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.option, styles.cancel, pressed && styles.optionPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.optionText}>Cancel</Text>
            </Pressable>
          )}
    </BottomSheet>
  );
});

const createStyles = (colors: AppColors) => StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ui.space.lg,
    minHeight: ui.control.minHeight,
  },
  optionIcon: { marginRight: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerPoster: { width: 44, height: 66, borderRadius: 8, backgroundColor: colors.surfaceLight },
  headerMeta: { flex: 1, gap: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  headerSub: { color: colors.appleText2, fontSize: 13 },
  optionPressed: {
    backgroundColor: colors.surface,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: ui.type.body,
    fontWeight: '600',
  },
  optionSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.appleSeparator,
  },
  destructiveText: {
    color: colors.error,
  },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: ui.space.xs,
  },
});
