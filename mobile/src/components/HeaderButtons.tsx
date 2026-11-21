import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { TOUCH, useTheme } from '../lib/theme';
import { HistoryIcon, SettingsIcon } from './icons';

export function HeaderButtons() {
  const { c } = useTheme();
  const { t } = useI18n();
  const btn = (label: string, onPress: () => void, icon: React.ReactNode) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={({ pressed }) => ({ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      {icon}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row' }}>
      {btn(t('nav.history'), () => router.push('/history'), <HistoryIcon color={c.accent} />)}
      {btn(t('nav.settings'), () => router.push('/settings'), <SettingsIcon color={c.accent} />)}
    </View>
  );
}
