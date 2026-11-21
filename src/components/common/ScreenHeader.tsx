import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { ui } from '../../theme/ui';

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useAppTheme();
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: ui.space.md, paddingBottom: ui.space.md}}>
    <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}
      style={{width: ui.control.back, height: ui.control.back, borderRadius: ui.control.back / 2,
        backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'}}>
      <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
    </Pressable>
    <Text numberOfLines={1} style={{flex: 1, fontSize: ui.type.screenTitle, fontWeight: '800', color: colors.textPrimary}}>{title}</Text>
  </View>;
}
