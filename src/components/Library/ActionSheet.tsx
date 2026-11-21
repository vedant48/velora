import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  options: ActionSheetOption[];
  onClose: () => void;
  showCancel?: boolean;
}

/** Must-style bottom action sheet over a dimmed backdrop. */
export const ActionSheet = memo(function ActionSheet({
  visible,
  options,
  onClose,
  showCancel = true,
}: ActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {options.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => {
                onClose();
                opt.onPress();
              }}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              accessibilityRole="button"
            >
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
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#2A2A30',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 34,
  },
  option: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  optionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  destructiveText: {
    color: colors.error,
  },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 4,
  },
});
